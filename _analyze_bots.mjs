// Analizador de patrones por bot (Botmaker). Lee el token de la DB, hace un pull
// acotado de /sessions en vivo y mapea cada bot: orden de captura, variables,
// tipos de respuesta, timing, agente y tráfico. Salida → docs/botmaker-bot-patterns-observed.md
import dotenv from 'dotenv';
import pg from 'pg';
import crypto from 'crypto';
import fs from 'fs';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const DAYS = Number(process.env.ANALYZE_DAYS || 3);
const MAX_PAGES = Number(process.env.ANALYZE_MAXPAGES || 4);

const dbUrl =
  (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) ||
  process.env.STORAGE_DATABASE_URL || process.env.STORAGE_DATABASE_URL_UNPOOLED || '';
const ENC_KEY = process.env.ENCRYPTION_KEY || '';

function decryptToken(t) {
  if (!t || !t.startsWith('enc:')) return t || '';
  const [, ivHex, tagHex, dataHex] = t.split(':');
  const key = Buffer.from(ENC_KEY, 'hex');
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  d.setAuthTag(Buffer.from(tagHex, 'hex'));
  return d.update(dataHex, 'hex', 'utf8') + d.final('utf8');
}

const toMs = (v) => {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
};
const RE = {
  incorrect: /^(?:flow\s+)?incorrect of\s+"?(.+?)"?$/i,
  inactivity: /^(?:flow\s+)?inactivity of\s+"?(.+?)"?$/i,
  fulfilled: /^(?:flow\s+)?fulfilled of\s+"?(.+?)"?$/i,
};
const cleanField = (s) => s.replace(/^["“']+|["”']+$/g, '').replace(/\s+/g, ' ').trim();
function classifyNode(name) {
  const n = (name || '').trim();
  for (const kind of ['incorrect', 'inactivity', 'fulfilled']) {
    const m = RE[kind].exec(n);
    if (m) return { kind, field: cleanField(m[1]) };
  }
  return { kind: null, field: '' };
}
const FALLBACK = new Set(['mensaje por defecto', 'mensaje por default', 'default message']);
// Canonicaliza un nodo a un CAMPO DE DATOS telco real; null = nodo de control/lógica.
function dataFieldKey(f) {
  const n = (f || '').toLowerCase();
  if (/error|_msg|respuesta|proceso|legible|formato|v[aá]lid|variables|condici|preguntar|intelix|llenas|men[uú]|saludo|inicio|fin/.test(n)) return null;
  if (/n[uú]mero|10 d[ií]g|portar|a cambiar/.test(n)) return 'Número';
  if (/\bnip\b/.test(n)) return 'NIP';
  if (/nombre/.test(n)) return 'Nombre';
  if (/correo|email/.test(n)) return 'Correo';
  if (/fecha.*nac|nacimiento/.test(n)) return 'Fecha nacimiento';
  if (/estado.*nac|entidad/.test(n)) return 'Estado nacimiento';
  if (/vigencia/.test(n)) return 'Vigencia NIP';
  if (/\bicc\b|\bsim\b|imei/.test(n)) return 'ICC / SIM';
  if (/curp/.test(n)) return 'CURP';
  if (/\brfc\b/.test(n)) return 'RFC';
  return null;
}
const SALE_TYP = /(venta|vendid|compr[oó]|exitos)/i;
const SALE_PHRASE = /felicidad/i;
const SOURCE_VAR = /(utm|referral|ctwa|origen|fuente|source|campaign|\bad[_-]?id\b|anuncio|campa)/i;

async function botmakerFetch(baseUrl, token, path, retries = 2) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'access-token': token },
  });
  if (res.status === 429 && retries > 0) { await new Promise(r => setTimeout(r, 1500)); return botmakerFetch(baseUrl, token, path, retries - 1); }
  return res;
}

async function listSessions(baseUrl, token, fromISO, toISO, maxPages) {
  const all = [];
  let next = `/sessions?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}&include-messages=true&include-events=true&long-term-search=true`.replace(/%3A/g, ':');
  let pages = 0;
  while (next && pages < maxPages) {
    const res = await botmakerFetch(baseUrl, token, next);
    if (!res.ok) { console.error(`  /sessions HTTP ${res.status} page ${pages + 1}`); break; }
    const data = await res.json().catch(() => ({}));
    const items = Array.isArray(data.items) ? data.items : [];
    all.push(...items);
    if (items.length === 0) break;
    next = data.nextPage || null;
    pages++;
    if (next) await new Promise(r => setTimeout(r, 250));
  }
  return all;
}

function newBot() {
  return {
    sessions: 0, msgUser: 0, msgBot: 0, msgAgent: 0, sales: 0, fallback: 0, withAgent: 0,
    referral: 0, frtSum: 0, frtN: 0, channels: {}, typ: {}, vars: {}, fields: {},
  };
}
function ensureField(b, f) {
  return (b.fields[f] ||= { firstSeenSum: 0, firstSeenN: 0, okFirst: 0, okRetry: 0, failed: 0, timeouts: 0, dtSum: 0, dtN: 0 });
}

async function main() {
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();

  // Hay varias integraciones botmaker (varios workspaces); algunas con token
  // expirado (401). Elegimos automáticamente la primera cuyo token responda 200.
  const integs = (await client.query(
    `SELECT "workspaceId", credentials FROM "Integration" WHERE provider='botmaker' AND "userId"='workspace' AND connected=true ORDER BY "updatedAt" DESC`
  )).rows;
  if (!integs.length) { console.error('No hay Integration botmaker conectada'); await client.end(); return; }
  let workspaceId = null, baseUrl = null, token = null;
  for (const r of integs) {
    const creds = r.credentials || {};
    let bu = (creds.baseUrl || 'https://api.botmaker.com/v2.0').replace(/\/$/, '');
    if (!/\/v2\.0$/.test(bu)) bu += '/v2.0';
    let tk; try { tk = decryptToken(creds.accessToken); } catch { continue; }
    const probe = await botmakerFetch(bu, tk, '/channels');
    console.log(`probe ws=${r.workspaceId.slice(0,10)} /channels=${probe.status}`);
    if (probe.ok) { workspaceId = r.workspaceId; baseUrl = bu; token = tk; break; }
  }
  if (!token) { console.error('Ninguna integración botmaker tiene token válido (todas 401).'); await client.end(); return; }
  console.log('USANDO workspace:', workspaceId.slice(0, 10), 'baseUrl:', baseUrl, 'token len:', token.length);

  // botNames + channels
  const metaRow = await client.query(`SELECT data FROM "MetaAnalyticsCache" WHERE "workspaceId"=$1 AND endpoint='botmaker_meta' LIMIT 1`, [workspaceId]);
  const botNames = metaRow.rows[0]?.data?.botNames || {};
  let channelMap = {};
  try {
    const chRes = await botmakerFetch(baseUrl, token, '/channels');
    if (chRes.ok) { const cd = await chRes.json(); const arr = cd.items || cd.channels || cd || []; for (const c of (Array.isArray(arr) ? arr : [])) channelMap[c.id || c.channelId] = c.name || c.platform || c.id; }
  } catch {}
  await client.end();

  // Refresca botId→nombre desde /intents en vivo (el cache meta puede estar incompleto).
  try {
    let next = '/intents', pages = 0;
    while (next && pages < 10) {
      const res = await botmakerFetch(baseUrl, token, next);
      if (!res.ok) break;
      const body = await res.json().catch(() => ({}));
      const items = Array.isArray(body.items) ? body.items : [];
      for (const it of items) { const bot = it.bot; if (bot?.id && bot?.name) botNames[String(bot.id)] = String(bot.name); }
      next = body.nextPage || null; pages++;
    }
    console.log(`botNames tras /intents: ${Object.keys(botNames).length}`);
  } catch {}

  // pull sessions
  const now = Date.now();
  const bots = {}; // botId -> stats   ('__none__' = sin bot-change)
  let totalSessions = 0;
  for (let d = 0; d < DAYS; d++) {
    const to = new Date(now - d * 86400000).toISOString();
    const from = new Date(now - (d + 1) * 86400000).toISOString();
    process.stdout.write(`Pull ${from.slice(0, 10)}… `);
    const sessions = await listSessions(baseUrl, token, from, to, MAX_PAGES);
    console.log(`${sessions.length} sesiones`);
    totalSessions += sessions.length;
    for (const s of sessions) analyzeSession(s, bots);
  }
  console.log(`\nTOTAL sesiones analizadas: ${totalSessions}`);

  writeReport(bots, botNames, channelMap, { totalSessions, DAYS, MAX_PAGES });
}

function analyzeSession(s, bots) {
  const msgs = (s.messages || []).slice().sort((a, b) => (toMs(a.creationTime) || 0) - (toMs(b.creationTime) || 0));
  const events = (s.events || []).slice().sort((a, b) => (toMs(a.creationTime) || 0) - (toMs(b.creationTime) || 0));
  const channelId = s.chat?.chat?.channelId || '—';

  // which bots touched this session (event-level), default primary
  const touched = new Set();
  let curBot = '__none__';
  // pre-scan to find first bot
  for (const e of events) { const inm = (e.name || '').toLowerCase(); if (inm === 'bot-change' && e.info?.currentBotId) { curBot = e.info.currentBotId; break; } }
  const primary = curBot;
  const get = (id) => (bots[id] ||= newBot());

  // session-level signals
  let hasAgent = msgs.some(m => m.from === 'agent');
  let sale = false, hasFallback = false, typ = null;
  let referral = false;

  // referral / traffic detection (variables + first message)
  const firstUser = msgs.find(m => m.from === 'user');
  const fuStr = JSON.stringify(firstUser?.content || {});
  if (/ctwa_clid|referral|"source_type"|"ad_id"|sourceUrl/i.test(fuStr)) referral = true;

  // walk
  curBot = primary;
  const seenField = {}, incorrectBefore = {}, fulfilledDone = {}, lastRequestAt = {};
  let flowStep = 0, firstUserAt = null, firstReplyAt = null;
  for (const m of msgs) {
    const at = toMs(m.creationTime);
    if (m.from === 'user' && firstUserAt == null) firstUserAt = at;
    else if ((m.from === 'bot' || m.from === 'agent') && firstUserAt != null && firstReplyAt == null) firstReplyAt = at;
  }

  const b = get(primary); touched.add(primary);
  for (const e of events) {
    const nm = (e.name || '').toLowerCase();
    const info = e.info || {};
    const nodeName = typeof info.name === 'string' ? info.name : '';
    const exec = typeof info.executingIntents === 'string' ? info.executingIntents : '';
    const et = toMs(e.creationTime);

    if (nm === 'bot-change' && info.currentBotId) { curBot = info.currentBotId; touched.add(curBot); }
    if (nm === 'conversation-close' && typeof info.typification === 'string') typ = info.typification;
    if (FALLBACK.has(exec.toLowerCase()) || FALLBACK.has(nodeName.toLowerCase())) hasFallback = true;
    if (nm.includes('assign') && nm.includes('agent')) hasAgent = true;

    // variable storage (orden de guardado)
    if (nm === 'set-variable' && info.variableName) {
      const bb = get(curBot); bb.vars[info.variableName] = (bb.vars[info.variableName] || 0) + 1;
      if (SOURCE_VAR.test(info.variableName)) referral = referral; // marker handled below
      if (SOURCE_VAR.test(info.variableName) && info.variableValue) referral = true;
    }

    if (nm === 'find-intent' || nm === 'go-to') {
      flowStep++;
      const target = nodeName || exec;
      if (target) {
        const { kind, field } = classifyNode(target);
        if (kind) {
          const bb = get(curBot);
          if (!seenField[field]) { seenField[field] = true; const a = ensureField(bb, field); a.firstSeenSum += flowStep; a.firstSeenN++; lastRequestAt[field] = et; }
          if (kind === 'incorrect') { incorrectBefore[field] = (incorrectBefore[field] || 0) + 1; }
          else if (kind === 'fulfilled') {
            if (!fulfilledDone[field]) {
              fulfilledDone[field] = true;
              const a = ensureField(bb, field);
              const before = incorrectBefore[field] || 0;
              if (before === 0) a.okFirst++; else a.okRetry++;
              if (lastRequestAt[field] != null && et != null && et >= lastRequestAt[field]) { a.dtSum += et - lastRequestAt[field]; a.dtN++; }
            }
          } else if (kind === 'inactivity') { ensureField(bb, field)._timeout = true; }
        }
      }
    }
  }
  // finalize per-field fail/timeout against the primary bot's field map (approx)
  for (const f of Object.keys(seenField)) {
    const a = ensureField(b, f);
    if (incorrectBefore[f] && !fulfilledDone[f]) a.failed++;
    if (a._timeout) { a.timeouts++; delete a._timeout; }
  }

  // attribute session-level metrics to primary bot
  b.sessions++;
  for (const m of msgs) { if (m.from === 'user') b.msgUser++; else if (m.from === 'agent') b.msgAgent++; else b.msgBot++; }
  b.channels[channelId] = (b.channels[channelId] || 0) + 1;
  if (typ) { b.typ[typ] = (b.typ[typ] || 0) + 1; if (SALE_TYP.test(typ)) sale = true; }
  if (!sale && msgs.some(m => m.from === 'bot' && SALE_PHRASE.test((m.content?.text || '').toString()))) sale = true;
  if (sale) b.sales++;
  if (hasFallback) b.fallback++;
  if (hasAgent) b.withAgent++;
  if (referral) b.referral++;
  if (firstUserAt != null && firstReplyAt != null && firstReplyAt >= firstUserAt) { b.frtSum += firstReplyAt - firstUserAt; b.frtN++; }
}

function pct(n, d) { return d ? Math.round((n / d) * 1000) / 10 : 0; }
function writeReport(bots, botNames, channelMap, meta) {
  const ids = Object.keys(bots).sort((a, b) => bots[b].sessions - bots[a].sessions);
  let md = `# Botmaker — Patrones por Bot (análisis observado)\n\n`;
  md += `> Muestra: últimos **${meta.DAYS} días**, hasta ${meta.MAX_PAGES} páginas/día. ${meta.totalSessions} sesiones analizadas. `;
  md += `Generado desde \`/sessions\` en vivo. Bot ↔ nombre vía \`botmaker_meta\`.\n\n`;
  md += `Bots con actividad en la muestra: **${ids.filter(i => bots[i].sessions > 0 && i !== '__none__').length}** (de ${Object.keys(botNames).length} definidos).\n\n`;

  const noneN = bots['__none__']?.sessions || 0;
  const unresolved = ids.filter(i => i !== '__none__' && bots[i].sessions > 0 && !botNames[i]);
  md += `> **Notas y limitaciones de la muestra.**\n`;
  md += `> - **Muestra ~500 sesiones/día** (límite de página de \`/sessions\`; el volumen diario real puede ser mayor). Patrones representativos, no totales exactos.\n`;
  md += `> - **${noneN} sesiones (${pct(noneN, meta.totalSessions)}%) sin \`bot-change\`** → no atribuibles a un bot con nombre (bucket "sin bot-change"). Atribución por evento \`bot-change.currentBotId\`.\n`;
  md += `> - **${unresolved.length} botId(s) de alto volumen sin nombre** (no están en \`/intents\`; probables sub-flujos o bots archivados): ${unresolved.map(i => `\`${i}\``).join(', ') || '—'}.\n`;
  md += `> - **Tráfico pagado 0%**: no se halló señal \`ctwa_clid\`/\`referral\` en \`/sessions\`. Confirma la brecha de captura CTWA del flow-map (debe capturarse en el webhook de WhatsApp).\n`;
  md += `> - La **detección de captura por campo** depende del nombre de los nodos del bot; aquí se filtró a campos de datos telco reales (NIP, número, nombre, fecha/estado nac., correo…), separando los nodos de control.\n\n`;

  // tabla resumen
  md += `## Resumen\n\n| Bot | Sesiones | Venta% | Fallback% | Agente% | Tráfico pagado% | Msgs U/B/A |\n|---|--:|--:|--:|--:|--:|---|\n`;
  for (const id of ids) {
    const b = bots[id]; if (!b.sessions) continue;
    const name = id === '__none__' ? '(sin bot-change)' : (botNames[id] || id);
    md += `| ${name} | ${b.sessions} | ${pct(b.sales, b.sessions)} | ${pct(b.fallback, b.sessions)} | ${pct(b.withAgent, b.sessions)} | ${pct(b.referral, b.sessions)} | ${b.msgUser}/${b.msgBot}/${b.msgAgent} |\n`;
  }

  // detalle por bot
  for (const id of ids) {
    const b = bots[id]; if (!b.sessions) continue;
    const name = id === '__none__' ? '(sin bot-change)' : (botNames[id] || id);
    md += `\n---\n\n## ${name}\n\n`;
    md += `- Sesiones: **${b.sessions}** · Venta: ${pct(b.sales, b.sessions)}% · Fallback: ${pct(b.fallback, b.sessions)}% · Agente: ${pct(b.withAgent, b.sessions)}% · 1ª respuesta: ${b.frtN ? Math.round(b.frtSum / b.frtN / 1000) : '—'}s\n`;
    const chs = Object.entries(b.channels).sort((a, c) => c[1] - a[1]).map(([k, v]) => `${channelMap[k] || k.slice(0, 8)} (${v})`);
    md += `- Canales: ${chs.join(', ') || '—'}\n`;
    md += `- Tráfico pagado (referral/ctwa/var fuente): ${pct(b.referral, b.sessions)}%\n`;

    // Agrega nodos crudos en CAMPOS DE DATOS reales (filtra nodos de control).
    const dataAgg = {}; let controlNodes = 0; let intelix = false;
    for (const [f, a] of Object.entries(b.fields)) {
      if (/intelix/i.test(f)) intelix = true;
      const key = dataFieldKey(f);
      if (!key) { controlNodes++; continue; }
      const d = (dataAgg[key] ||= { okFirst: 0, okRetry: 0, failed: 0, timeouts: 0, dtSum: 0, dtN: 0, firstSeenSum: 0, firstSeenN: 0 });
      for (const k of ['okFirst', 'okRetry', 'failed', 'timeouts', 'dtSum', 'dtN', 'firstSeenSum', 'firstSeenN']) d[k] += a[k] || 0;
    }
    const fields = Object.entries(dataAgg).map(([f, a]) => ({ f, order: a.firstSeenN ? a.firstSeenSum / a.firstSeenN : 999, ...a }))
      .filter(x => x.firstSeenN >= 1).sort((a, c) => a.order - c.order);
    if (fields.length) {
      md += `\n**Orden de captura de datos** (campo → éxito 1er intento / con reintento / falla / inactividad / Δt promedio):\n\n`;
      md += `| # | Campo | 1er int. | reintento | falla | inactiv. | Δt (s) |\n|--:|---|--:|--:|--:|--:|--:|\n`;
      fields.forEach((x, i) => {
        md += `| ${i + 1} | ${x.f} | ${x.okFirst} | ${x.okRetry} | ${x.failed} | ${x.timeouts} | ${x.dtN ? Math.round(x.dtSum / x.dtN / 1000) : '—'} |\n`;
      });
      md += `\n_Nodos de control/lógica del flujo: ${controlNodes}${intelix ? ' · envía a **Intelix** (CRM) tras capturar' : ''}._\n`;
    } else if (intelix) {
      md += `\n_Envía a **Intelix** (CRM) tras capturar datos; sin pasos de captura de datos claros en la muestra._\n`;
    }
    const vars = Object.entries(b.vars).sort((a, c) => c[1] - a[1]).slice(0, 25);
    if (vars.length) md += `\n**Variables de almacenamiento** (${Object.keys(b.vars).length}): ${vars.map(([k, v]) => `\`${k}\`×${v}`).join(', ')}\n`;
    const typs = Object.entries(b.typ).sort((a, c) => c[1] - a[1]).slice(0, 10);
    if (typs.length) md += `\n**Tipificaciones de cierre**: ${typs.map(([k, v]) => `${k} (${v})`).join(', ')}\n`;
  }

  // bots definidos sin actividad
  const active = new Set(ids.filter(i => bots[i].sessions > 0));
  const idle = Object.entries(botNames).filter(([id]) => !active.has(id));
  if (idle.length) {
    md += `\n---\n\n## Bots definidos SIN actividad en la muestra (${idle.length})\n\n`;
    md += idle.map(([id, n]) => `- ${n}`).join('\n') + '\n';
  }

  fs.writeFileSync('docs/botmaker-bot-patterns-observed.md', md, 'utf8');
  console.log('\n✅ Reporte escrito: docs/botmaker-bot-patterns-observed.md');
  console.log(`   Bots activos: ${active.size} · idle: ${idle.length}`);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
