// Build a portable file from the actual UI sources. No bundler or runtime dependency.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {themes} from '../src/registry.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFile(path.join(root,rel),'utf8');
const asJSON=value=>JSON.stringify(value).replaceAll('<','\\u003c');
const files=['src/registry.js','src/shared.js',...themes.map(t=>'src/themes/'+t.design+'.js'),'src/index.js','src/navigation.js','demo.js'];
const built=new Set(),chunks=['const __modules=Object.create(null);'];
function dependency(file,relative){const key=path.posix.normalize(path.posix.join(path.posix.dirname(file),relative));assert.ok(built.has(key),'Bundle dependency order: '+key);return key;}
for(const file of files){
 let source=await read(file);const exports=new Map();
 source=source.replace(/^import \{([^}]+)\} from ['"]([^'"]+)['"];\s*$/gm,(_,names,relative)=>{
  const key=dependency(file,relative),bindings=names.split(',').map(s=>s.trim().replace(/\s+as\s+/,':')).join(',');
  return 'const {'+bindings+'}=__modules['+asJSON(key)+'];';
 });
 source=source.replace(/^export \{([^}]+)\} from ['"]([^'"]+)['"];\s*$/gm,(_,names,relative)=>{
  const key=dependency(file,relative);for(const name of names.split(',').map(s=>s.trim()))exports.set(name,'__modules['+asJSON(key)+'].'+name);return '';
 });
 source=source.replace(/\bexport (const|function) ([A-Za-z_$][\w$]*)/g,(_,kind,name)=>{exports.set(name,name);return kind+' '+name;});
 assert.ok(!/^\s*(import|export)\s/m.test(source),'Unsupported module syntax in '+file);
 if(file==='src/shared.js'){
  assert.ok(source.includes('${base}/${design}-1536.webp'));
  source=source.replaceAll('${base}/${design}-1536.webp',"${window.__ASSETS[design+'-1536']}").replaceAll('${base}/${design}-768.webp',"${window.__ASSETS[design+'-768']}");
 }
 if(file==='demo.js'){
  source=source.replace("new URL(location.href).searchParams.get('theme')||saved","window.__INITIAL_THEME__||saved");
  source=source.replace("history.replaceState(null,'','#/shop')","{__previewHash='#/shop';route();}");
  source=source.replaceAll('location.hash','__previewHash').replace("window.addEventListener('hashchange',route);",'');
  // srcdoc inherits the parent file's base URL. Keep hash links inside this frame.
  source="let __previewHash='';document.addEventListener('click',event=>{const a=event.target.closest('a[href^=\"#\"]');if(!a)return;event.preventDefault();const href=a.getAttribute('href');if(href==='#main'){document.querySelector('main').focus();return}__previewHash=href;route()});\n"+source;
 }
 chunks.push('__modules['+asJSON(file)+']=(()=>{\n'+source+'\nreturn {'+[...exports].map(([key,value])=>key+':'+value).join(',')+'};\n})();');built.add(file);
}
const assets={};for(const t of themes)for(const width of [768,1536])assets[t.design+'-'+width]='data:image/webp;base64,'+(await fs.readFile(path.join(root,'src/assets/'+t.design+'-'+width+'.webp'))).toString('base64');
const css=await read('src/styles.css')+'\n'+(await read('demo.css')).replace(/^@import[^;]+;/m,'')+'\n.theme-picker{display:none}header{gap:18px}';
let doc=await read('index.html');
doc=doc.replace('<link rel="stylesheet" href="./demo.css">','<style>'+css+'</style>').replace('<link rel="icon" href="./favicon.svg">','').replace('<script type="module" src="./demo.js"></script>','');
const payload={themes,assets,document:doc,bundle:chunks.join('\n')};
const shell=await read('preview/shell.html'),shellCSS=await read('preview/shell.css'),shellJS=await read('preview/shell.js');
assert.equal((shell.match(/__PREVIEW_DATA__/g)||[]).length,1);
const html=shell.replace('__SHELL_CSS__',shellCSS).replace('__PREVIEW_DATA__',asJSON(payload)).replace('__SHELL_JS__',shellJS.replaceAll('</script','<\\/script'));
await fs.writeFile(path.join(root,'preview.html'),'<!--\n'+await read('LICENSE')+'\nOriginal AI-generated artwork provenance: https://github.com/lincwang123-bot/coco9-storefront-ui/blob/main/src/ASSETS.md\n-->\n'+html);
console.log('Built preview.html: '+(Buffer.byteLength(html)/1024/1024).toFixed(2)+' MiB; six themes, images and scripts embedded.');
