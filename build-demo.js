'use strict';

const fs = require('node:fs');
const path = require('node:path');
const read = (name, encoding) => fs.readFileSync(path.join(__dirname, name), encoding);

const image = name => `data:image/webp;base64,${read(`assets/${name}.webp`).toString('base64')}`;
const spriteNames = [
  'apple', 'pear', 'orange', 'busya-dragon', 'busya-balloon',
  'candy', 'cookie-star', 'cookie-tree', 'winter-apple', 'winter-flight', 'winter-tree',
];
const images = Object.fromEntries(spriteNames.map(name => [name, image(name)]));
const game = read('game.js', 'utf8').replace(
  'function asset(name) {\n  return `assets/${name}.webp`;\n}',
  () => `const embeddedImages = ${JSON.stringify(images)};\nfunction asset(name) {\n  return embeddedImages[name];\n}`,
);
const demo = read('index.html', 'utf8')
  .replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${read('styles.css', 'utf8')}</style>`)
  .replace('  <script src="music.js" defer></script>\n', '')
  .replace('  <script src="game.js" defer></script>\n', '')
  .replace('assets/busya.webp', () => image('busya'))
  .replace('</body>', () => `<script>\n${read('music.js', 'utf8')}\n${game}</script>\n</body>`);

fs.writeFileSync(path.join(__dirname, 'demo.html'), demo);
