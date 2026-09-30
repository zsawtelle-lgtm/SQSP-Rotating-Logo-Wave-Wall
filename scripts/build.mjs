// Bundles src/ into a single snippet for Squarespace Code Injection.
// Usage: node scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'src/logo-wave.css'), 'utf8').trim();
const js = readFileSync(join(root, 'src/logo-wave.js'), 'utf8').trim();

const snippet = `<!-- Rotating Logo Wave Wall. Paste into a page's Advanced > Page Header Code Injection,
     or Settings > Advanced > Code Injection > Footer. Generated from src/ by scripts/build.mjs. -->
<style>
${css}
</style>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<script>
${js}
</script>
`;

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/code-injection.html'), snippet);
console.log('Wrote dist/code-injection.html');
