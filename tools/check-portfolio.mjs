import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve('docs');
const base='https://eduardorbworld.github.io/eduardorbworld/';
const pages=['index.html','seguidores-locais.html','world-ai.html','insta-auto-saas.html','404.html'];
let errors=0;
function check(ok,message){if(!ok){console.error(message);errors++}}
const documents=new Map();
for(const file of pages){
 const full=path.join(root,file);
 if(!fs.existsSync(full)){check(false,'Missing page '+file);continue}
 const html=fs.readFileSync(full,'utf8');
 const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
 documents.set(file,{html,ids});
 check(new Set(ids).size===ids.length,file+': duplicate IDs');
 check(/<html\s+lang="[^"]+"/.test(html),file+': missing language');
 check(html.includes('name="viewport"'),file+': missing viewport');
 check(/<title>[^<]+<\/title>/.test(html),file+': missing title');
 if(file!=='404.html'){
  check(html.includes('rel="canonical"'),file+': missing canonical URL');
  check(html.includes('name="description"'),file+': missing description');
 }else check(html.includes('noindex'),file+': error page should not be indexed');
 check(!html.includes('github.com/eduardorbworld/rolezinfrontin'),file+': private client repository linked');
 for(const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)){
  if(/type="application\/ld\+json"/.test(m[1]||"")){try{JSON.parse(m[2])}catch{check(false,file+': invalid JSON-LD')}continue}
  const r=spawnSync(process.execPath,['--check'],{input:m[2],encoding:'utf8'});
  check(r.status===0,file+': '+(r.stderr||'script syntax check failed'));
 }
}
for(const [file,{html}] of documents){
 for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  let u=m[1];
  if(u.startsWith(base))u='./'+u.slice(base.length);
  if(!u.startsWith('#')&&!u.startsWith('./'))continue;
  const [target,fragment]=u.split('#');
  const local=target?target.replace(/^\.\//,'')||'index.html':file;
  const full=path.resolve(root,local);
  check(full.startsWith(root+path.sep)&&fs.existsSync(full),file+': missing local target '+u);
  if(fragment&&documents.has(local))check(documents.get(local).ids.includes(fragment),file+': missing anchor '+u);
 }
}
for(const f of ['favicon.svg','brand-logo.svg','sitemap.xml'])check(fs.existsSync(path.join(root,f)),'Missing '+f);
check(documents.get('index.html')?.html.includes('id="lang-toggle"'),'Missing language control');
const sitemap=fs.existsSync(path.join(root,'sitemap.xml'))?fs.readFileSync(path.join(root,'sitemap.xml'),'utf8'):'';
for(const file of pages.filter(f=>f!=='404.html'))check(sitemap.includes('<loc>'+base+(file==='index.html'?'':file)+'</loc>'),'Missing sitemap entry '+file);
check(!sitemap.includes('404.html'),'Error page included in sitemap');
if(errors)process.exitCode=1;else console.log('Static checks passed for all five HTML pages. Browser validation still required.');
