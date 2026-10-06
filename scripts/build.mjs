import { build } from 'esbuild';
await build({ entryPoints: ['src/index.ts'], bundle: true, format: 'esm', minify: true, sourcemap: true, outfile: 'dist/anime.js', target: 'es2020' });
await build({ entryPoints: ['src/browser.ts'], bundle: true, format: 'iife', minify: true, sourcemap: true, outfile: 'dist/anime.min.js', target: 'es2020' });
