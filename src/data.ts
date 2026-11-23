import raw from './data/lviv.json';
import researchRaw from './data/research.json';
import portraitsRaw from './data/portraits.json';
import type { Addition, Dataset, Link, Person, Portrait, RouteStop, Stop, View } from './types';

export const data = raw as unknown as Dataset;

export const ROUTE = data.stops.filter((s): s is RouteStop => s.route);
export const OFF_ROUTE = data.stops.filter((s) => !s.route);
export const ROUTE_TOTAL = ROUTE.length;
export const VERTEP_SLUG = 'vertep';

/** Порядок аркушів для презентації: маршрут 1–12, потім окремі місця 13–15. */
export const SEQUENCE: number[] = [...ROUTE, ...OFF_ROUTE].map((s) => s.id);

const research = (researchRaw as unknown as { stops: Record<string, Addition[]> }).stops;
export const additions = (id: number): Addition[] => research[String(id)] ?? [];

const portraits = portraitsRaw as unknown as Record<string, Portrait>;
export const portraitOf = (name: string): Portrait | undefined => portraits[name];

/** Ініціали для заглушки без портрета: «Ірина Калинець» → «ІК» */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}]/gu, '')[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** Автор з Commons іноді — посилання на профіль; показуємо коротке ім'я. */
export function creditName(author: string | null | undefined): string {
  if (!author) return 'автор на Commons';
  if (!/^https?:\/\//.test(author)) return author;
  try {
    const u = new URL(author);
    const tail = decodeURIComponent(u.pathname.split('/').pop() ?? '');
    return tail.includes(':') ? tail.split(':').pop()! : u.hostname.replace(/^www\./, '');
  } catch {
    return author;
  }
}

export function getStop(id: number): Stop | undefined {
  return data.stops.find((s) => s.id === id);
}

/* ---------- Люди: slug з імені ---------- */

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i',
  й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh',
  ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia',
};

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[’'ʼ]/g, '')
    .split('')
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const personSlug = (p: Person) => slugify(p.name);
export const personByName = (name: string) => data.people.find((p) => p.name === name);
export const personBySlug = (slug: string) => data.people.find((p) => personSlug(p) === slug);

/* ---------- Хеш-маршрути ---------- */

export function parseHash(hash: string): View {
  const h = decodeURIComponent(hash.replace(/^#\/?/, ''));
  const m = /^stop-(\d+)$/.exec(h);
  if (m && getStop(Number(m[1]))) return { kind: 'stop', id: Number(m[1]) };
  const pm = /^person-(.+)$/.exec(h);
  if (pm && personBySlug(pm[1])) return { kind: 'person', slug: pm[1] };
  if (h === 'map') return { kind: 'map' };
  const mm = /^map-(\d+)$/.exec(h);
  if (mm && getStop(Number(mm[1]))) return { kind: 'map', id: Number(mm[1]) };
  if (h === 'walk') return { kind: 'walk' };
  if (h === 'people') return { kind: 'people' };
  if (h === 'sources') return { kind: 'sources' };
  const sm = /^sources-(\d+)$/.exec(h);
  if (sm && getStop(Number(sm[1]))) return { kind: 'sources', stop: Number(sm[1]) };
  if (h === 'glossary') return { kind: 'about', anchor: 'glossary' };
  const bySlug = data.stops.find((s) => s.slug === h);
  if (bySlug) return { kind: 'stop', id: bySlug.id };
  return { kind: 'about' };
}

export function viewHash(v: View): string {
  switch (v.kind) {
    case 'stop':
      return `#stop-${v.id}`;
    case 'person':
      return `#person-${v.slug}`;
    case 'map':
      return v.id ? `#map-${v.id}` : '#map';
    case 'walk':
      return '#walk';
    case 'people':
      return '#people';
    case 'sources':
      return v.stop ? `#sources-${v.stop}` : '#sources';
    default:
      return v.anchor ? `#${v.anchor}` : '#about';
  }
}

/* ---------- Формати ---------- */

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** 49,8345° пн. ш. · 24,0186° сх. д. */
export function formatCoords(lat: number, lng: number): string {
  const f = (n: number) => Math.abs(n).toFixed(4).replace('.', ',');
  return `${f(lat)}° ${lat >= 0 ? 'пн.' : 'пд.'} ш. · ${f(lng)}° ${lng >= 0 ? 'сх.' : 'зх.'} д.`;
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} м`;
  return `${(m / 1000).toFixed(1).replace('.', ',')} км`;
}

export function formatMinutes(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} хв`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} год ${r} хв` : `${h} год`;
}

/** Назва видання з «Видання: заголовок» */
export const outlet = (l: Link) => (l.title.includes(':') ? l.title.slice(0, l.title.indexOf(':')).trim() : l.title);
export const headline = (l: Link) => (l.title.includes(':') ? l.title.slice(l.title.indexOf(':') + 1).trim() : l.title);

/* ---------- Прогулянка ---------- */

export const DETOUR = 1.25; // пряма → реальна вулиця
export const SPEED_KMH = 4.5;
export const MIN_PER_STOP = 8;

/** Пішохідна відстань (м) і час (хв) для ділянки з прямою відстанню `straight`. */
export function leg(straight: number) {
  const walk = straight * DETOUR;
  return { walk, minutes: walk / ((SPEED_KMH * 1000) / 60) };
}

type LatLng = { lat: number; lng: number };

export function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function nearestRouteStop(p: LatLng) {
  return ROUTE.map((s) => ({ s, d: haversine(p, s) })).sort((a, b) => a.d - b.d)[0];
}

const ll = (s: LatLng) => `${s.lat},${s.lng}`;

export function googleWalkUrl(from: LatLng, to: LatLng, via: LatLng[] = [], mode = 'walking') {
  const p = new URLSearchParams({ api: '1', travelmode: mode, origin: ll(from), destination: ll(to) });
  if (via.length) p.set('waypoints', via.map(ll).join('|'));
  return `https://www.google.com/maps/dir/?${p.toString()}`;
}

export const googlePlaceUrl = (s: LatLng) => `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;

export const osmUrl = (s: LatLng) => `https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lng}#map=18/${s.lat}/${s.lng}`;

/* ---------- Хронологія ---------- */

const MONTHS: Record<string, number> = {
  січня: 0, лютого: 1, березня: 2, квітня: 3, травня: 4, червня: 5,
  липня: 6, серпня: 7, вересня: 8, жовтня: 9, листопада: 10, грудня: 11,
  січень: 0, лютий: 1, березень: 2, квітень: 3, травень: 4, червень: 5,
  липень: 6, серпень: 7, вересень: 8, жовтень: 9, листопад: 10, грудень: 11,
};

/** Дробовий рік для пропорційної осі: «18 квітня 1966» → 1966.29. Невідомий місяць → середина року. */
export function fractionalYear(date: string, year: number): number {
  const lower = date.toLowerCase();
  if (lower.includes('літо')) return year + 6.5 / 12;
  const day = Number(/(\d{1,2})\s+[а-яіїєґ]/i.exec(lower)?.[1] ?? 15);
  for (const [name, idx] of Object.entries(MONTHS)) {
    if (lower.includes(name)) return year + (idx + (day - 0.5) / 31) / 12;
  }
  return year + 0.5;
}

/* ---------- Словник: перше входження терміна в тексті ---------- */

const L = "[\\p{L}'’ʼ]*";
/** Як шукати кожен термін у тексті (з відмінками). Ключ — точна назва з glossary. */
const GLOSSARY_PATTERNS: Record<string, string> = {
  Самвидав: `[Сс]амвидав${L}`,
  Шістдесятники: `[Шш]істдесятник${L}`,
  '«Покіс»': '«покіс»',
  'Операція «Блок»': '«Блок»',
  'Стаття 62 КК УРСР': `[Сс]татт${L} 62`,
  '«Профілактика»': `«[Пп]рофілактик${L}»`,
  '«Український вісник»': `«Українськ${L} вісник${L}»`,
  '«Пролісок»': `«Пролісок»|«Проліску»`,
  'УГГ і УГС': `Українськ${L} Гельсінськ${L} (?:груп|спілк)${L}|УГС`,
  'Товариство рідної мови': `Товариств${L} рідної мови`,
  'ШІЗО і ПКТ': 'ШІЗО|ПКТ',
  'ДКНС (ГКЧП)': 'ДКНС',
};

export const glossaryMatchers = data.glossary
  .filter((g) => GLOSSARY_PATTERNS[g.term])
  .map((g) => ({ term: g, re: new RegExp(GLOSSARY_PATTERNS[g.term], 'u') }));
