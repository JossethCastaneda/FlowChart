import dotenv from 'dotenv'; import pg from 'pg';
dotenv.config({ path: '.env.local' }); dotenv.config({ path: '.env' });
const url=(process.env.DATABASE_URL&&process.env.DATABASE_URL.trim())||process.env.STORAGE_DATABASE_URL||'';
const c=new pg.Client({connectionString:url}); await c.connect();
// Solo metadatos, NUNCA valores de token.
const rows=(await c.query(`SELECT provider, "userId", connected, "connectedAt",
  (credentials->>'expiresAt') AS expires_at,
  (credentials->>'refreshedAt') AS refreshed_at,
  (CASE WHEN credentials ? 'refreshToken' THEN 'yes' ELSE 'no' END) AS has_refresh,
  (CASE WHEN credentials ? 'accessToken' THEN 'yes' ELSE 'no' END) AS has_access,
  (CASE WHEN left(coalesce(credentials->>'accessToken',''),4)='enc:' THEN 'enc' WHEN coalesce(credentials->>'accessToken','')='' THEN '-' ELSE 'PLAINTEXT' END) AS token_enc,
  jsonb_array_length(coalesce(credentials->'pages','[]'::jsonb)) AS pages,
  coalesce(credentials->>'scope', credentials->>'scopes','') AS scopes
  FROM "Integration" ORDER BY provider, "userId"`)).rows;
console.log(`Integraciones totales: ${rows.length}\n`);
const now=Date.now();
for(const r of rows){
  let exp='';
  if(r.expires_at){ const d=(new Date(r.expires_at).getTime()-now)/86400000; exp=`exp:${isFinite(d)?d.toFixed(0)+'d':r.expires_at}`; }
  console.log(`${r.connected?'🟢':'⚪'} ${r.provider.padEnd(22)} user=${(r.userId||'').slice(0,10).padEnd(10)} tok=${r.token_enc} refresh=${r.has_refresh} pages=${r.pages} ${exp} ${r.refreshed_at?'refd:'+r.refreshed_at.slice(0,10):''}`);
  if(r.scopes) console.log(`     scopes: ${r.scopes.slice(0,140)}`);
}
// resumen por provider
console.log('\n=== por provider (conectados) ===');
const byP={}; for(const r of rows){ if(!r.connected)continue; byP[r.provider]=(byP[r.provider]||0)+1; }
for(const [p,n] of Object.entries(byP).sort((a,b)=>b[1]-a[1])) console.log(`  ${p}: ${n}`);
await c.end();
