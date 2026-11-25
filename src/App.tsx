import { useCallback, useEffect, useRef, useState } from 'react';
import MapView from './components/MapView';
import Filmstrip from './components/Filmstrip';
import StopSheet from './components/StopSheet';
import Timeline from './components/Timeline';
import WalkMode from './components/WalkMode';
import PeopleGrid, { PersonPage } from './components/PeopleGrid';
import Intro from './components/Intro';
import Sources from './components/Sources';
import { ROUTE, SEQUENCE, getStop, pad2, parseHash, personBySlug, viewHash } from './data';
import type { ThemeKey, View } from './types';

function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

export default function App() {
  const [view, setView] = useState<View>(() => parseHash(location.hash));
  const [filter, setFilter] = useState<ThemeKey | null>(null);
  /** «Більша мапа»: хронологію сховано, мапа на весь екран під шапкою */
  const [bigMap, setBigMap] = useState(false);
  /** Тему виставляє index.html до першого кадру; тут — лише перемикач */
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector<HTMLMetaElement>('meta[name=theme-color]')?.setAttribute('content', theme === 'light' ? '#f3eee3' : '#0e0d13');
  }, [theme]);
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    // одразу, щоб мапа (її ефект іде раніше за ефект App) прочитала нові кольори
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem('dl-theme', next);
    } catch {
      /* приватний режим */
    }
  };
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  /** Вкладки на вузькому екрані гортаються вбік; згасання показує, з якого боку є ще */
  const tabsRef = useRef<HTMLElement>(null);
  const [tabsFade, setTabsFade] = useState('');
  const measureTabs = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    const start = el.scrollLeft > 2;
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setTabsFade(start && end ? 'both' : start ? 'start' : end ? 'end' : '');
  }, []);
  useEffect(() => {
    measureTabs();
    window.addEventListener('resize', measureTabs);
    return () => window.removeEventListener('resize', measureTabs);
  }, [measureTabs]);
  const narrow = useMedia('(max-width: 899px)');
  const firstRender = useRef(true);
  /** Звідки відкрили сторінку людини — туди повертає Esc */
  const beforePerson = useRef<View>({ kind: 'people' });
  /** Остання точка, з якою працювали: на неї відкривається мапа й вкладка «Аркуші» */
  const lastStop = useRef<number>(ROUTE[0].id);
  if (view.kind === 'stop' || (view.kind === 'map' && view.id)) lastStop.current = view.id!;

  // Хеш → вигляд
  useEffect(() => {
    const on = () => setView(parseHash(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const go = useCallback((v: View) => {
    const h = viewHash(v);
    if (location.hash !== h) location.hash = h;
    else setView(v);
  }, []);
  const openStop = useCallback((id: number) => go({ kind: 'stop', id }), [go]);
  const focusOnMap = useCallback((id: number) => go({ kind: 'map', id }), [go]);
  const openPerson = useCallback(
    (slug: string) => {
      if (view.kind !== 'person') beforePerson.current = view;
      go({ kind: 'person', slug });
    },
    [go, view],
  );
  const closePerson = useCallback(() => go(beforePerson.current), [go]);

  // Після зміни вигляду: на початок сторінки (або до словника)
  useEffect(() => {
    const behavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth';
    if (view.kind === 'about' && view.anchor) {
      const to = (b: ScrollBehavior) => document.getElementById(view.anchor!)?.scrollIntoView({ behavior: b, block: 'start' });
      if (firstRender.current) {
        // при відкритті за посиланням довгий вступ ще досипає шрифти й фото: стрибаємо одразу і ще раз після розкладки
        requestAnimationFrame(() => to('auto'));
        setTimeout(() => to('auto'), 600);
      } else requestAnimationFrame(() => to(behavior));
      firstRender.current = false;
      return;
    }
    tabsRef.current?.querySelector('[aria-current=page]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (view.kind === 'map') return;
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (view.kind === 'stop' || view.kind === 'person') {
      document.getElementById(view.kind === 'stop' ? 'sheet-title' : 'person-title')?.focus({ preventScroll: true });
    }
  }, [view, reducedMotion]);

  // Клавіші презентації: ← / → гортають аркуші (або точки на мапі), Esc закриває сторінку людини
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'Escape' && view.kind === 'person') {
        closePerson();
        return;
      }
      if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') {
        toggleFullscreen();
        return;
      }
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const step = e.key === 'ArrowRight' ? 1 : -1;
      if (view.kind === 'map') {
        e.preventDefault();
        const i = view.id ? SEQUENCE.indexOf(view.id) : -1;
        const j = Math.min(Math.max(i + step, 0), SEQUENCE.length - 1);
        focusOnMap(SEQUENCE[j]);
        return;
      }
      if (view.kind !== 'stop' && view.kind !== 'about') return;
      const i = view.kind === 'stop' ? SEQUENCE.indexOf(view.id) : -1;
      const j = i + step;
      e.preventDefault();
      if (j < 0) go({ kind: 'about' });
      else if (j < SEQUENCE.length) openStop(SEQUENCE[j]);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, go, openStop, focusOnMap, closePerson]);

  const onMap = view.kind === 'map';
  const mapFocus = onMap ? view.id ?? null : null;
  const stop = view.kind === 'stop' ? getStop(view.id) : undefined;
  const person = view.kind === 'person' ? personBySlug(view.slug) : undefined;
  const seqIdx = stop ? SEQUENCE.indexOf(stop.id) : -1;

  const tabs: { key: View['kind'][]; label: string; onClick: () => void }[] = [
    { key: ['about'], label: 'Вступ', onClick: () => go({ kind: 'about' }) },
    { key: ['map'], label: 'Мапа', onClick: () => go({ kind: 'map' }) },
    { key: ['stop'], label: 'Аркуші', onClick: () => openStop(lastStop.current) },
    { key: ['walk'], label: 'Прогулянка', onClick: () => go({ kind: 'walk' }) },
    { key: ['people', 'person'], label: 'Люди', onClick: () => go({ kind: 'people' }) },
    { key: ['sources'], label: 'Джерела', onClick: () => go({ kind: 'sources' }) },
  ];

  return (
    <div className={`app${onMap ? ' app--map' : ''}`}>
      <a className="skip" href="#panel">
        До тексту
      </a>

      <header className="masthead">
        <h1 className="title">
          <a href="#about" onClick={() => go({ kind: 'about' })}>
            Дисидентський Львів
          </a>
        </h1>
        <nav className="tabs" aria-label="Розділи" ref={tabsRef} onScroll={measureTabs} data-fade={tabsFade || undefined}>
          {tabs.map((t) => (
            <button
              key={t.label}
              type="button"
              className="tabs__btn"
              aria-current={t.key.includes(view.kind) ? 'page' : undefined}
              onClick={t.onClick}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="tool tool--theme"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Увімкнути темну тему' : 'Увімкнути світлу тему'}
        >
          {theme === 'light' ? 'Темна' : 'Світла'}
        </button>
        <button type="button" className="tool tool--fs" onClick={toggleFullscreen} title="Повний екран (F)">
          Повний екран
        </button>
      </header>

      {/* Зала мапи: змонтована завжди, щоб не перевантажувати тайли */}
      <section className="stage" aria-label="Мапа" hidden={!onMap}>
        <div className="stage__map">
          <MapView
            selectedId={mapFocus}
            filter={filter}
            onFilter={setFilter}
            onSelect={focusOnMap}
            mode={theme}
            reducedMotion={reducedMotion}
            visible={onMap}
          />
          <Filmstrip
            focusId={mapFocus}
            filter={filter}
            onFilter={setFilter}
            onFocus={focusOnMap}
            onOpen={openStop}
            big={bigMap}
            onBig={setBigMap}
          />
        </div>
        {!bigMap && <Timeline selectedId={mapFocus} filter={filter} onSelect={focusOnMap} />}
      </section>

      {/* Зала читання */}
      {!onMap && (
        <main id="panel" className="panel" tabIndex={-1}>
          {narrow && stop && (
            <div className="readbar" role="navigation" aria-label="Аркуші">
              <button
                type="button"
                className="readbar__btn"
                disabled={seqIdx <= 0}
                onClick={() => openStop(SEQUENCE[seqIdx - 1])}
                aria-label="Попередній аркуш"
              >
                ←
              </button>
              <span className="readbar__title">
                <span className="readbar__n">{pad2(stop.id)}</span> {stop.short}
              </span>
              <button
                type="button"
                className="readbar__btn"
                disabled={seqIdx >= SEQUENCE.length - 1}
                onClick={() => openStop(SEQUENCE[seqIdx + 1])}
                aria-label="Наступний аркуш"
              >
                →
              </button>
            </div>
          )}
          {view.kind === 'about' && <Intro onOpen={openStop} onWalk={() => go({ kind: 'walk' })} />}
          {stop && <StopSheet stop={stop} onGo={openStop} onPerson={openPerson} theme={theme} />}
          {person && <PersonPage person={person} onOpen={openStop} onClose={closePerson} />}
          {view.kind === 'walk' && <WalkMode onOpen={openStop} />}
          {view.kind === 'people' && <PeopleGrid onOpen={openStop} onPerson={openPerson} />}
          {view.kind === 'sources' && (
            <Sources stop={view.stop} onOpen={openStop} onPerson={openPerson} onAll={() => go({ kind: 'sources' })} />
          )}
        </main>
      )}
    </div>
  );
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
