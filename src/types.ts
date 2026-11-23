export type ThemeKey = 'repression' | 'resistance' | 'rally' | 'memory';

export interface Link {
  title: string;
  url: string;
}

export interface Photo {
  /** Назва файлу на Wikimedia Commons */
  file: string | null;
  author: string | null;
  license: string | null;
  licenseUrl?: string | null;
  category: string | null;
  alt: string;
  /** Зовнішні посилання (напр. © Центр міської історії): тільки посилання, ніколи не вбудовувати */
  extra: Link[];
  /** Сторінка файлу на Commons */
  page: string | null;
  /** Special:FilePath …?width=1200 */
  src: string | null;
  catUrl: string | null;
  /** Підказка для пошуку на Commons (scripts/resolve-photos.mjs) */
  search?: string | null;
  note?: string | null;
}

export interface Fact {
  label: string;
  value: string;
}

export interface Quote {
  text: string;
  who: string;
  source: Link;
}

export interface Stop {
  id: number;
  slug: string;
  /** true — на пішому маршруті в центрі (1–12), false — окреме місце (13–15) */
  route: boolean;
  title: string;
  /** Підпис на мапі */
  short: string;
  address: string;
  lat: number;
  lng: number;
  /** true = місце приблизне */
  approx: boolean;
  type: ThemeKey;
  years: string;
  lead: string;
  story: string[];
  facts: Fact[];
  quote: Quote | null;
  /** Що непевне / де джерела розходяться */
  unsure: string | null;
  people: string[];
  question: string;
  sources: Link[];
  photo: Photo | null;
  /** Пряма відстань від попередньої зупинки маршруту, м; null поза маршрутом */
  fromPrev: number | null;
}

export type RouteStop = Stop & { route: true; fromPrev: number };

export interface Person {
  name: string;
  years: string | null;
  role: string;
  summary: string;
  bio: string[];
  stops: number[];
  sources: Link[];
}

export interface TimelineEvent {
  year: number;
  date: string;
  text: string;
  stop: number;
}

export interface Wave {
  years: string;
  title: string;
  text: string;
}

export interface GlossaryTerm {
  term: string;
  text: string;
}

export interface Dataset {
  version: number;
  types: Record<ThemeKey, string>;
  context: {
    title: string;
    intro: string[];
    waves: Wave[];
    system: string[];
    ethics: string;
    critical: string;
  };
  stops: Stop[];
  people: Person[];
  timeline: TimelineEvent[];
  glossary: GlossaryTerm[];
}

/** Портрет людини з Wikimedia Commons (src/data/portraits.json) */
export interface Portrait {
  /** Файл на Commons; null для власного файлу в public/portraits/ */
  file: string | null;
  /** Шлях до власного файлу (відносно сайту) */
  local?: string;
  alt: string;
  note: string | null;
  author: string | null;
  license: string | null;
  licenseUrl: string | null;
  page: string | null;
  src: string;
}

/** Доповнення з досліджень (src/data/research.json), окремо від основного тексту */
export interface Addition {
  text: string;
  source: Link;
}

export type View =
  | { kind: 'about'; anchor?: 'glossary' }
  | { kind: 'stop'; id: number }
  | { kind: 'map'; id?: number }
  | { kind: 'person'; slug: string }
  | { kind: 'walk' }
  | { kind: 'people' }
  | { kind: 'sources'; stop?: number };
