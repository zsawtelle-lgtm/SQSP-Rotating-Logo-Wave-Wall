// Builds dist/waves.js and dist/waves.min.js from src/.
// Usage: npm run build
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify } from 'terser';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const { version } = JSON.parse(read('package.json'));

const css = read('src/waves.css')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*([{}:;,])\s*/g, '$1')
  .trim();

const js = read('src/waves.js')
  .replaceAll('__VERSION__', version)
  .replace('"__CSS__"', JSON.stringify(css));

const min = await minify(js, { format: { comments: /^!/ } });

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/waves.js'), js);
writeFileSync(join(root, 'dist/waves.min.js'), min.code + '\n');
console.log(`Built waves v${version}: dist/waves.js, dist/waves.min.js`);
