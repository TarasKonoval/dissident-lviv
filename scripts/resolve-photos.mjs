#!/usr/bin/env node
// Резолвер фото з Wikimedia Commons.
//
//   node scripts/resolve-photos.mjs
//       Показати кандидатів для зупинок без photo.file:
//       — якщо є photo.search: пошук файлів на Commons (топ-8 з мініатюрами);
//       — якщо є photo.category: файли з категорії.
//       Нічого не записує, поки ви не оберете файл.
//
//   node scripts/resolve-photos.mjs --pick porokhova="Назва файлу.jpg" --pick stadion="Інший.jpg"
//       Обрати файл для зупинки (за slug). Те саме можна записати в scripts/photos.choice.json:
//       {
//         "stops":  { "porokhova": "Назва файлу.jpg",
//                     "kalyntsi": { "file": "…", "alt": "…", "note": "підпис під фото" } },
//         "people": { "Ірина Калинець": "Назва файлу.jpg" }
//       }
//       Скрипт підтягує imageinfo + extmetadata і заповнює file, author, license, licenseUrl, page, src, catUrl.
//       Портрети людей записуються в src/data/portraits.json.
//       Власне фото: покладіть файл у public/portraits/ і вкажіть { "local": "portraits/<файл>.jpg" }
//       (можна додати "author", "license", "page", коли джерело відоме).
//
//   --force   перезаписати вже заповнені author/license
//
// Портрети — лише вільні ліцензії з Wikimedia Commons, кожен перевірений очима перед вибором.

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, '..', 'src', 'data', 'lviv.v4.json');
const CHOICE = path.join(HERE, 'photos.choice.json');
const PORTRAITS = path.join(HERE, '..', 'src', 'data', 'portraits.json');
const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'DysydentskyiLviv/1.0 (student project; resolve-photos.mjs)';

// Назви файлів, які майже напевно не підходять (інтер'єри, люди, події, деталі).
const SKIP =
  /(interior|inside|інтер|hall|зал|aula|portrait|портрет|people|person|люди|concert|концерт|match|матч|fans|фанат|wedding|selfie|protest|rally|мітинг|ceremony|meeting|graduat|students|студент|staircase|сходи|ceiling|plafond|стеля|detail|деталь|plaque|дошка|table|map|plan|\.svg$|\.pdf$|\.tif|\.ogg|\.webm|\.mp3|logo|герб|stamp|марка|coin|монета)/i;

const args = process.argv.slice(2);
const force = args.includes('--force');
const choice = existsSync(CHOICE) ? JSON.parse(await readFile(CHOICE, 'utf8')) : {};
// старий формат: { slug: файл } без розділів
const stopChoice = choice.stops ?? (choice.people ? {} : choice);
const peopleChoice = choice.people ?? {};
const picks = {};
for (const [slug, v] of Object.entries(stopChoice)) picks[slug] = typeof v === 'string' ? { file: v } : v;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--pick' && args[i + 1]) {
    const [slug, ...rest] = args[++i].split('=');
    picks[slug] = { ...(picks[slug] ?? {}), file: rest.join('=') };
  }
}
for (const v of Object.values(picks)) v.file = String(v.file).replace(/^File:/, '');

async function api(params) {
  const url = new URL(API);
  for (const [k, v] of Object.entries({ format: 'json', formatversion: '2', ...params })) url.searchParams.set(k, v);
  for (let attempt = 1; ; attempt++) {
    await new Promise((r) => setTimeout(r, 900)); // Commons обмежує частоту запитів
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (e) {
      if (attempt >= 5) throw e;
      await new Promise((r) => setTimeout(r, 4000 * attempt));
    }
  }
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };
const stripHtml = (s) =>
  (s ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e) => ENTITIES[e])
    .replace(/\s+/g, ' ')
    .trim();
const underscore = (f) => f.replace(/ /g, '_');
const filePage = (f) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(underscore(f))}`;
const fileSrc = (f) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(underscore(f))}?width=1200`;
const thumb = (f) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(underscore(f))}?width=400`;
const catPage = (c) => `https://commons.wikimedia.org/wiki/${encodeURIComponent(underscore(c)).replace(/%3A/, ':')}`;

const usable = (c) =>
  (c.mime?.startsWith('image/jpeg') || c.mime?.startsWith('image/png')) && !SKIP.test(c.title) && c.w >= 1000;

function toCandidate(p) {
  const ii = p.imageinfo?.[0];
  return { title: p.title.replace(/^File:/, ''), w: ii?.width ?? 0, h: ii?.height ?? 0, mime: ii?.mime };
}

async function fromCategory(category) {
  const data = await api({
    action: 'query',
    generator: 'categorymembers',
    gcmtitle: category,
    gcmtype: 'file',
    gcmlimit: '100',
    prop: 'imageinfo',
    iiprop: 'size|mime',
  });
  return (data.query?.pages ?? [])
    .map(toCandidate)
    .filter(usable)
    .filter((c) => c.w >= c.h)
    .sort((a, b) => b.w * b.h - a.w * a.h);
}

async function fromSearch(query) {
  // list=search у просторі файлів (6); imageinfo підтягуємо через generator
  const data = await api({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: '30',
    prop: 'imageinfo',
    iiprop: 'size|mime',
  });
  return (data.query?.pages ?? [])
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map(toCandidate)
    .filter(usable);
}

async function credit(file) {
  const data = await api({ action: 'query', titles: `File:${file}`, prop: 'imageinfo|categories', iiprop: 'url|extmetadata', clshow: '!hidden', cllimit: '20' });
  const page = data.query?.pages?.[0];
  if (!page || page.missing) throw new Error(`Файл не знайдено на Commons: ${file}`);
  const m = page.imageinfo[0].extmetadata ?? {};
  return {
    author: stripHtml(m.Artist?.value) || null,
    license: stripHtml(m.LicenseShortName?.value) || null,
    licenseUrl: m.LicenseUrl?.value ?? null,
    page: page.imageinfo[0].descriptionurl ?? filePage(file),
    category: page.categories?.[0]?.title ?? null,
  };
}

function print(stop, list, how) {
  console.log(`\n#${stop.id} ${stop.slug} — ${how}`);
  if (!list.length) console.log('   (немає придатних фото; перегляньте вручну)');
  list.slice(0, 8).forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.title}  (${c.w}×${c.h})`);
    console.log(`      ${thumb(c.title)}`);
  });
  console.log(`   → обрати: node scripts/resolve-photos.mjs --pick ${stop.slug}="<назва файлу>"`);
}

const json = JSON.parse(await readFile(DATA, 'utf8'));
let changed = false;

for (const stop of json.stops) {
  const pick = picks[stop.slug];
  if (!stop.photo && pick) {
    // зупинка без фото: створюємо об'єкт (alt обов'язковий)
    stop.photo = { file: null, author: null, license: null, licenseUrl: null, category: null, alt: pick.alt ?? stop.title, extra: [], page: null, src: null, catUrl: null, search: null, note: null };
  }
  const photo = stop.photo;
  if (!photo) continue;

  if (pick) {
    if (pick.file !== photo.file) {
      photo.file = pick.file;
      photo.author = photo.license = photo.licenseUrl = null; // новий файл — новий кредит
      photo.page = photo.src = null;
      changed = true;
    }
    if (pick.alt && pick.alt !== photo.alt) (photo.alt = pick.alt), (changed = true);
    if (pick.note !== undefined && pick.note !== photo.note) (photo.note = pick.note), (changed = true);
  }

  if (!photo.file) {
    try {
      if (photo.search) print(stop, await fromSearch(photo.search), `пошук «${photo.search}»`);
      else if (photo.category) print(stop, await fromCategory(photo.category), photo.category);
    } catch (e) {
      console.log(`   помилка: ${e.message}`);
    }
    continue;
  }

  const complete = photo.author && photo.license && photo.licenseUrl && photo.page && photo.src;
  if (complete && !force) continue;
  try {
    const c = await credit(photo.file);
    if (force || !photo.author) photo.author = c.author;
    if (force || !photo.license) photo.license = c.license;
    if (force || !photo.licenseUrl) photo.licenseUrl = c.licenseUrl;
    photo.page = c.page;
    photo.src = fileSrc(photo.file);
    if (!photo.category && c.category) {
      photo.category = c.category;
      photo.catUrl = catPage(c.category);
    }
    changed = true;
    console.log(`✓ #${stop.id} ${stop.slug}: ${photo.author} · ${photo.license}`);
  } catch (e) {
    console.log(`✗ #${stop.id} ${stop.slug}: ${e.message}`);
  }
}

if (changed) {
  await writeFile(DATA, JSON.stringify(json, null, 2) + '\n');
  console.log('\nЗаписано в src/data/lviv.v4.json');
}

/* ---------- Портрети ---------- */
const names = Object.keys(peopleChoice);
if (names.length) {
  const known = new Set(json.people.map((p) => p.name));
  const portraits = existsSync(PORTRAITS) ? JSON.parse(await readFile(PORTRAITS, 'utf8')) : {};
  let pchanged = false;
  for (const name of names) {
    if (!known.has(name)) {
      console.log(`✗ портрет: «${name}» немає в people`);
      continue;
    }
    const v = peopleChoice[name];
    const pick = typeof v === 'string' ? { file: v } : v;
    if (pick.local) {
      // власний файл у public/portraits/ — без запиту до Commons
      const entry = { file: null, local: pick.local, alt: pick.alt ?? name, note: pick.note ?? null, author: pick.author ?? null, license: pick.license ?? null, licenseUrl: null, page: pick.page ?? null, src: pick.local };
      if (JSON.stringify(portraits[name]) !== JSON.stringify(entry)) {
        portraits[name] = entry;
        pchanged = true;
        console.log(`✓ портрет ${name}: локальний файл ${pick.local}`);
      }
      continue;
    }
    const file = String(pick.file).replace(/^File:/, '');
    const cur = portraits[name];
    if (cur && cur.file === file && cur.author && !force) continue;
    try {
      const c = await credit(file);
      portraits[name] = {
        file,
        alt: pick.alt ?? name,
        note: pick.note ?? null,
        author: c.author,
        license: c.license,
        licenseUrl: c.licenseUrl,
        page: c.page,
        src: fileSrc(file).replace('width=1200', 'width=600'),
      };
      pchanged = true;
      console.log(`✓ портрет ${name}: ${c.author} · ${c.license}`);
    } catch (e) {
      console.log(`✗ портрет ${name}: ${e.message}`);
    }
  }
  for (const name of Object.keys(portraits)) {
    if (!peopleChoice[name]) {
      delete portraits[name];
      pchanged = true;
    }
  }
  if (pchanged) {
    await writeFile(PORTRAITS, JSON.stringify(portraits, null, 2) + '\n');
    console.log('Записано в src/data/portraits.json');
  }
}
