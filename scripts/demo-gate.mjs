// Puts the static demo behind a sign-in screen and out of search.
//
// GitHub Pages serves files and nothing else, so there is no way to send a
// WWW-Authenticate header and get the browser's own password prompt. This is a
// screen drawn over the page instead: it keeps the demo away from people who
// stumble on the link and from crawlers, and it is not security - the files are
// public in the gh-pages branch of a public repository.
//
//   node scripts/demo-gate.mjs <dir> <user> <password>
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [dir, user, pass] = process.argv.slice(2)
if (!dir || !user || !pass) {
  console.error('usage: node scripts/demo-gate.mjs <dir> <user> <password>')
  process.exit(1)
}
// the pair is compared as a hash, so it is not sitting in the page as text
const digest = createHash('sha256').update(`${user}:${pass}`).digest('hex')

const gate = `<meta name="robots" content="noindex, nofollow">
<style id="demo-gate-hide">html{visibility:hidden}</style>
<script>(function(){var K='am-demo-auth',H='${digest}';
try{if(localStorage.getItem(K)===H){document.getElementById('demo-gate-hide').remove();return}}catch(e){}
function hex(b){return Array.from(new Uint8Array(b)).map(function(x){return x.toString(16).padStart(2,'0')}).join('')}
function draw(){var d=document.createElement('div');d.id='demo-gate';d.setAttribute('style','visibility:visible;position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#0a0a0c;color:#fff;font:15px/1.5 Archivo,Helvetica Neue,Arial,sans-serif;padding:16px');
d.innerHTML='<form style="width:min(340px,100%);display:grid;gap:12px;background:#15151a;border:1px solid #32323a;border-radius:10px;padding:24px"><p style="margin:0;font-weight:700;font-size:18px">Streams Charts Awards · demo</p><p style="margin:0;color:#a5a5ac;font-size:14px">Sign in to view the preview.</p><label style="display:grid;gap:4px;font-size:13px;color:#a5a5ac">Login<input id="demo-user" autocomplete="username" required style="font:inherit;color:#fff;background:#0a0a0c;border:1px solid #48484f;border-radius:8px;padding:10px 12px"></label><label style="display:grid;gap:4px;font-size:13px;color:#a5a5ac">Password<input id="demo-pass" type="password" autocomplete="current-password" required style="font:inherit;color:#fff;background:#0a0a0c;border:1px solid #48484f;border-radius:8px;padding:10px 12px"></label><p id="demo-err" role="alert" style="margin:0;color:#ff5c5c;font-size:13px;min-height:1em"></p><button style="font:700 13px/1 inherit;letter-spacing:.06em;text-transform:uppercase;color:#0a0a0c;background:#fff;border:0;border-radius:8px;padding:13px;cursor:pointer">Sign in</button></form>';
document.body.appendChild(d);document.getElementById('demo-user').focus();
d.querySelector('form').addEventListener('submit',function(e){e.preventDefault();var s=document.getElementById('demo-user').value.trim()+':'+document.getElementById('demo-pass').value;
crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)).then(function(b){if(hex(b)===H){try{localStorage.setItem(K,H)}catch(x){}d.remove();document.getElementById('demo-gate-hide').remove()}else{document.getElementById('demo-err').textContent='Wrong login or password.'}})})}
if(document.body)draw();else document.addEventListener('DOMContentLoaded',draw)})()</script>`

let n = 0
function walk(d) {
  for (const name of readdirSync(d)) {
    const p = join(d, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (name.endsWith('.html')) {
      let html = readFileSync(p, 'utf8')
      if (html.includes('demo-gate-hide')) continue
      // the app's own robots meta says index; the demo's goes in its place
      html = html.replace(/<meta name="robots"[^>]*>/g, '')
      html = html.replace(/<head([^>]*)>/, `<head$1>${gate}`)
      writeFileSync(p, html)
      n++
    }
  }
}
walk(dir)
writeFileSync(join(dir, 'robots.txt'), 'User-agent: *\nDisallow: /\n')
console.log(`gated ${n} pages`)
