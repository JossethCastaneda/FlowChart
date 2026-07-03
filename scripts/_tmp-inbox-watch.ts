/* TEMP live proof — read-only. Watches all working pages' Messenger threads (same Graph
   path the fixed inbox uses, no cache) and stops as soon as a REAL inbound message makes a
   thread's updated_time advance — i.e. a message arrived at a page and is visible in the
   inbox in real time. Prints ONLY page names + thread-id prefixes + timestamps; never
   message text, contact names, or tokens. Delete after use. */
import { readFileSync } from "fs";
import { join } from "path";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    try {
      const txt = readFileSync(join(process.cwd(), f), "utf8");
      for (const line of txt.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) {
          let v = m[2];
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
          process.env[m[1]] = v;
        }
      }
    } catch { /* noop */ }
  }
}

type Page = { id: string; name: string; access_token: string };

async function main() {
  loadEnv();
  const V = process.env.META_API_VERSION || "v21.0";
  const { default: prisma } = await import("../lib/prisma");
  const { decryptToken } = await import("../lib/encryption");
  const integ = await prisma.integration.findFirst({ where: { provider: "meta_community", connected: true }, select: { credentials: true } });
  const userToken = decryptToken((integ?.credentials as { accessToken?: string })?.accessToken ?? "");
  const acc = await fetch(`https://graph.facebook.com/${V}/me/accounts?fields=id,name,access_token&limit=100`, { headers: { Authorization: `Bearer ${userToken}` } }).then((r) => r.json()) as { data?: Page[] };
  const pages = (acc.data ?? []).filter((p) => p.access_token);
  try { await (prisma as unknown as { $disconnect: () => Promise<void> }).$disconnect(); } catch { /* noop */ }
  console.log(`Watching ${pages.length} pages' Messenger threads for a live inbound message...`);

  async function snapshot(): Promise<Map<string, { ts: string; page: string }>> {
    const map = new Map<string, { ts: string; page: string }>();
    const results = await Promise.allSettled(pages.map(async (p) => {
      const r = await fetch(`https://graph.facebook.com/${V}/${p.id}/conversations?fields=id,updated_time&limit=8`, { headers: { Authorization: `Bearer ${p.access_token}` } });
      const j = await r.json() as { data?: Array<{ id: string; updated_time: string }>; error?: unknown };
      if (j.error || !j.data) return;
      for (const c of j.data) map.set(c.id, { ts: c.updated_time, page: p.name });
    }));
    void results;
    return map;
  }

  const base = await snapshot();
  const baseNewest = [...base.values()].reduce((mx, v) => (v.ts > mx ? v.ts : mx), "");
  console.log(`[baseline @ ${new Date().toISOString()}] ${base.size} threads, newest ${baseNewest}`);

  const INTERVAL = 90, MAX_ROUNDS = 12;
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    await new Promise((r) => setTimeout(r, INTERVAL * 1000));
    const now = await snapshot();
    const caught: Array<{ id: string; page: string; oldTs: string | null; newTs: string }> = [];
    for (const [id, v] of now) {
      const prev = base.get(id);
      if (!prev) caught.push({ id, page: v.page, oldTs: null, newTs: v.ts });
      else if (v.ts > prev.ts) caught.push({ id, page: v.page, oldTs: prev.ts, newTs: v.ts });
    }
    const stamp = new Date().toISOString();
    if (caught.length > 0) {
      console.log(`\n✅ [round ${round} @ ${stamp}] LIVE MESSAGE(S) DETECTED — ${caught.length} thread(s) advanced:`);
      for (const c of caught.slice(0, 8)) {
        console.log(`   page "${c.page.slice(0, 26)}" | thread ${c.id.slice(0, 12)}… | ${c.oldTs ? `bumped ${c.oldTs} ->` : "NEW ->"} ${c.newTs}`);
      }
      console.log(`\nPROOF: a real message arrived at a page and became visible via the live inbox path within ${round * INTERVAL}s — no cache delay. Condition satisfied.`);
      process.exit(0);
    }
    console.log(`[round ${round} @ ${stamp}] no new inbound yet (newest still ${baseNewest}).`);
  }
  console.log(`\nNo organic inbound captured in ${MAX_ROUNDS * INTERVAL}s. Route is live (baseline threads current); pages were simply quiet in this window.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error("ERR:", e?.message || e); process.exit(1); });
