// Local STATIC preview only. API requires Cloudflare Pages Functions + D1.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const types = {'.svg':'image/svg+xml','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp'};
const allowed = new Set(['index.html','demo.css','demo.js','shop.css','admin.html','admin.css','admin.js','favicon.svg']);
async function collect(dir) {
  for (const item of await fs.readdir(path.join(root,dir),{withFileTypes:true})) {
    const p = dir+'/'+item.name;
    if (item.isDirectory()) await collect(p);
    else if (types[path.extname(p)]) allowed.add(p);
  }
}
await collect('src');
const server = http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  const file = new URL(req.url,'http://localhost').pathname.slice(1) || 'index.html';
  if (!['GET','HEAD'].includes(req.method) || !allowed.has(file)) {
    res.writeHead(404);res.end('Not found');return;
  }
  try {
    const body = await fs.readFile(path.join(root,file));
    res.setHeader('Content-Type',types[path.extname(file)]);
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {res.writeHead(500);res.end('Unable to read preview');}
});
server.listen(Number(process.env.PORT || 5173),'127.0.0.1',()=>{
  console.log('Static preview: http://127.0.0.1:'+server.address().port);
  console.log('Orders and admin API require Cloudflare Pages Functions with D1.');
});
for (const sig of ['SIGINT','SIGTERM']) process.on(sig,()=>server.close(()=>process.exit(0)));
