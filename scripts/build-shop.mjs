// Produces only publishable static files. Pages Functions live in /functions separately.
import {rm, mkdir, copyFile, cp} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for (const file of ['index.html','demo.css','demo.js','shop.css','admin.html','admin.css','admin.js','favicon.svg']) {
  await copyFile(file,'dist/'+file);
}
await cp('src','dist/src',{recursive:true});
console.log('Built dist/; configure Cloudflare Pages output directory to dist');
