'use strict';

const fs = require('node:fs');
const path = require('node:path');
const read = (name, encoding) => fs.readFileSync(path.join(__dirname, name), encoding);
const voiceScript = require('./curriculum.js');

function dataUrl(file, mime) {
  return `data:${mime};base64,${read(file).toString('base64')}`;
}

const image = name => dataUrl(`assets/${name}.webp`, 'image/webp');
const sprites = fs.readdirSync(path.join(__dirname, 'assets'))
  .filter(name => name.endsWith('.webp'))
  .map(name => path.basename(name, '.webp'));
const embedded = Object.fromEntries(sprites.map(name => [name, image(name)]));
const voice = Object.fromEntries(Object.keys(voiceScript).map(key => [key, dataUrl(`assets/voice/${key}.mp3`, 'audio/mpeg')]));

function inlineLookup(source, name, object) {
  const signature = new RegExp(`function ${name}\\([^)]*\\) \\{[^}]*\\}[^\\n]*\\n\\}`);
  const match = source.match(signature);
  if (!match) throw new Error(`Cannot inline ${name}`);
  return source.replace(match[0], () => `const ${name}Files = ${JSON.stringify(object)};\nfunction ${name}(name) { return ${name}Files[name]; }`);
}

const scripts = ['curriculum', 'music', 'voice', 'writing', 'learning', 'prizes', 'game'];
const javascript = scripts.map(name => {
  const source = read(`${name}.js`, 'utf8');
  if (name === 'game') return inlineLookup(source, 'asset', embedded);
  if (name === 'voice') return inlineLookup(source, 'voiceAsset', voice);
  return source;
}).join('\n');

const demo = read('index.html', 'utf8')
  .replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, url) => `<style>\n${read(url.split('?')[0], 'utf8')}</style>`)
  .replace(/^  <script src="[^"]+" defer><\/script>\n/gm, '')
  .replace('assets/busya.webp', () => image('busya'))
  .replace('</body>', () => `<script>\n${javascript}</script>\n</body>`);

fs.writeFileSync(path.join(__dirname, 'demo.html'), demo);
