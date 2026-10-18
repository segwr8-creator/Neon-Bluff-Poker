import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const mobile = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(mobile, '../dist/client');
const target = path.join(mobile, 'www');
const api = 'https://neon-bluff-poker.segwr8.workers.dev';
await access(path.join(source, 'index.html'));
await access(path.join(source, 'safe-area.css'));
await rm(target, {recursive: true, force: true});
await mkdir(target, {recursive: true});
await cp(source, target, {recursive: true});
await writeFile(path.join(target, 'runtime-config.js'), `globalThis.NEON_API_BASE_URL = ${JSON.stringify(api)};\n`);
for (const name of ['index.html', 'game.html']) {
  const file = path.join(target, name);
  await access(file);
  let html = await readFile(file, 'utf8');
  if (!/<meta\s+name="viewport"[^>]*>/i.test(html)) throw new Error('Missing viewport in '+name);
  html = html.replace(/<meta\s+name="viewport"[^>]*>/i, '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">');
  // Require the known lobby expressions: fail the build if a future edit needs adapting.
  for (const expression of ["location.origin+'/?room='", "location.origin+'/?'"]) {
    if (!html.includes(expression)) throw new Error('Invite expression changed; review mobile links in '+name);
    html = html.replaceAll(expression, expression.replace('location.origin', 'globalThis.NEON_API_BASE_URL'));
  }
  html = html.replace('</head>', '<style>button,a,input,select,.card{touch-action:manipulation}</style></head>');
  await writeFile(file, html);
}
console.log('Mobile assets prepared; no server or database credentials included.');
