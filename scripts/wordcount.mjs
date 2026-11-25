// Кількість слів у даних: node scripts/wordcount.mjs [файл]
import { readFileSync } from 'node:fs';

const file = process.argv[2] ?? new URL('../src/data/lviv.v4.json', import.meta.url);
const d = JSON.parse(readFileSync(file, 'utf8'));
const words = (s) => (s ? String(s).split(/\s+/).filter(Boolean).length : 0);
const sum = (xs) => xs.reduce((n, s) => n + words(s), 0);

const c = d.context;
const reading =
  sum(d.stops.flatMap((s) => s.story)) + sum(d.people.flatMap((p) => p.bio)) + sum(c.intro) + sum(c.system) + sum(c.waves.map((w) => w.text));

/** Усі рядки, крім бібліографії, підписів до фото та службових полів */
const SKIP = new Set(['sources', 'source', 'photo', 'url', 'slug', 'version']);
function all(v) {
  if (typeof v === 'string') return words(v);
  if (Array.isArray(v)) return v.reduce((n, x) => n + all(x), 0);
  if (v && typeof v === 'object') return Object.entries(v).reduce((n, [k, x]) => n + (SKIP.has(k) ? 0 : all(x)), 0);
  return 0;
}

console.log(`Текст для читання (історії, біографії, вступ, система, хвилі): ${reading.toLocaleString('uk')} слів`);
console.log(`Усі текстові поля без джерел і підписів до фото: ${all(d).toLocaleString('uk')} слів`);
