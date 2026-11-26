import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root='docs';
const html=fs.readFileSync(root+'/index.html','utf8');
let errors=0;
function check(ok,message){if(!ok){console.error(message);errors++}}
const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
check(new Set(ids).size===ids.length,'Duplicate HTML IDs');
for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){
 const u=m[1];
 if(u.startsWith('#'))check(ids.includes(u.slice(1)),'Missing section '+u);
 else if(u.startsWith('./'))check(fs.existsSync(path.join(root,u)),'Missing asset '+u);
}
for(const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)){
 if(/type="application\/ld\+json"/.test(m[1]||"")){try{JSON.parse(m[2])}catch{check(false,"Invalid JSON-LD")}continue}
 const r=spawnSync(process.execPath,['--check'],{input:m[2],encoding:'utf8'});
 check(r.status===0,r.stderr||'Script syntax check failed');
}
for(const f of ['favicon.svg','brand-logo.svg','sitemap.xml'])check(fs.existsSync(path.join(root,f)),'Missing '+f);
check(html.includes('rel="canonical"'),'Missing canonical URL');
check(html.includes('name="description"'),'Missing description');
check(html.includes('id="lang-toggle"'),'Missing language control');
check(!html.includes('github.com/eduardorbworld/rolezinfrontin'),'Client repository linked publicly');
if(errors)process.exitCode=1;else console.log('Static portfolio checks passed. Browser validation still required.');
