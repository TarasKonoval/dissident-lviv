import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MLMap, type Marker, type PaddingOptions } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { STYLE_URL, restyle } from '../mapStyle';
import { ROUTE, SEQUENCE, data, formatDistance, getStop, nearestRouteStop, pad2 } from '../data';
import type { Stop, ThemeKey } from '../types';

interface Props {
  selectedId: number | null;
  filter: ThemeKey | null;
  onFilter: (t: ThemeKey | null) => void;
  onSelect: (id: number) => void;
  mode: 'light' | 'dark';
  reducedMotion: boolean;
  /** Мапа змонтована завжди, але видна лише на екрані «Мапа» */
  visible: boolean;
}

const THEMES = Object.keys(data.types) as ThemeKey[];
const COUNTS = Object.fromEntries(THEMES.map((t) => [t, data.stops.filter((s) => s.type === t).length])) as Record<ThemeKey, number>;
const MAX_SELECT_ZOOM = 15.5;

export function routeGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: ROUTE.slice(1).map((s, i) => ({
      type: 'Feature',
      properties: { last: i === ROUTE.length - 2 },
      geometry: {
        type: 'LineString',
        coordinates: [
          [ROUTE[i].lng, ROUTE[i].lat],
          [s.lng, s.lat],
        ],
      },
    })),
  };
}

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function paintRoute(map: MLMap) {
  if (!map.getLayer('route')) return;
  const ink = cssVar('--route') || '#4a3b8c';
  map.setPaintProperty('route', 'line-color', ink);
  map.setPaintProperty('route-last', 'line-color', ink);
}

/** Пунктирний маршрут 1→12; останній відрізок до Личакова світліший. */
export function addRoute(map: MLMap) {
  map.addSource('route', { type: 'geojson', data: routeGeoJSON() });
  map.addLayer({
    id: 'route',
    type: 'line',
    source: 'route',
    filter: ['!', ['get', 'last']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1.6, 17, 3], 'line-dasharray': [2, 2], 'line-opacity': 0.85 },
  });
  map.addLayer({
    id: 'route-last',
    type: 'line',
    source: 'route',
    filter: ['get', 'last'],
    layout: { 'line-cap': 'round' },
    paint: { 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1.4, 17, 2.4], 'line-dasharray': [1, 3], 'line-opacity': 0.4 },
  });
  paintRoute(map);
}

function boundsOf(stops: Stop[]) {
  const b = new maplibregl.LngLatBounds();
  stops.forEach((s) => b.extend([s.lng, s.lat]));
  return b;
}

/** Сусіди на маршруті: попередня й наступна зупинки, щоб їх було видно після переходу. */
function neighbourhood(s: Stop): Stop[] {
  if (!s.route) return [s];
  const i = ROUTE.findIndex((r) => r.id === s.id);
  return [ROUTE[i - 1], s, ROUTE[i + 1]].filter(Boolean) as Stop[];
}

export default function MapView({ selectedId, filter, onFilter, onSelect, mode, reducedMotion, visible }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markers = useRef(new Map<number, { marker: Marker; el: HTMLButtonElement }>());
  const meMarker = useRef<Marker | null>(null);
  const modeRef = useRef(mode);
  const [ready, setReady] = useState(false);
  const [geo, setGeo] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  /** Відступи з урахуванням верхньої смуги (чипи + кнопки), кнопок масштабу справа і атрибуції знизу. */
  function padding(): PaddingOptions {
    const top =
      chips.current && wrap.current
        ? chips.current.getBoundingClientRect().bottom - wrap.current.getBoundingClientRect().top
        : 50;
    const narrow = (wrap.current?.clientWidth ?? 800) < 520;
    // стрічка карток лежить поверх нижньої частини мапи
    const film = wrap.current?.parentElement?.querySelector('.film')?.getBoundingClientRect().height ?? 0;
    return { top: Math.max(top, 40) + 28, bottom: Math.max(48, film + 24), left: narrow ? 28 : 44, right: narrow ? 56 : 96 };
  }

  // Ініціалізація мапи — один раз
  useEffect(() => {
    if (!box.current) return;
    const map = new maplibregl.Map({
      container: box.current,
      style: STYLE_URL,
      bounds: boundsOf(ROUTE),
      fitBoundsOptions: { padding: { top: 90, bottom: 48, left: 40, right: 90 } },
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(
      new maplibregl.AttributionControl({ compact: true, customAttribution: 'Фото: Wikimedia Commons' }),
      'bottom-left',
    );
    mapRef.current = map;
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(box.current);

    map.on('error', (e) => {
      if (!map.isStyleLoaded() && /style|fetch/i.test(String(e.error?.message))) setFailed(true);
    });

    map.on('load', () => {
      // компактна атрибуція стартує згорнутою, щоб не перекривати мапу на телефоні
      box.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
      restyle(map, modeRef.current);
      addRoute(map);
      setReady(true);
    });

    // Маркери: справжні <button>, щоб працювала клавіатура. Порядок DOM = порядок презентації.
    SEQUENCE.map((id) => getStop(id)!).forEach((s) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `pin pin--${s.type}${s.approx ? ' pin--approx' : ''}${s.route ? '' : ' pin--off'}`;
      el.setAttribute(
        'aria-label',
        `${pad2(s.id)}. ${s.title}${s.route ? '' : ' (поза маршрутом)'}${s.approx ? ' (місце приблизне)' : ''}`,
      );
      el.innerHTML = `<span class="pin__n">${s.id}</span><span class="pin__label">${s.short}</span>`;
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        onSelectRef.current(s.id);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([s.lng, s.lat]).addTo(map);
      markers.current.set(s.id, { marker, el });
    });

    return () => {
      ro.disconnect();
      map.remove();
      markers.current.clear();
      mapRef.current = null;
    };
  }, []);

  // Тема базової мапи
  useEffect(() => {
    modeRef.current = mode;
    const map = mapRef.current;
    if (map && ready) {
      restyle(map, mode);
      paintRoute(map);
    }
  }, [mode, ready]);

  // Виділення + фільтр
  useEffect(() => {
    markers.current.forEach(({ el }, id) => {
      const s = getStop(id)!;
      el.classList.toggle('is-active', id === selectedId);
      el.classList.toggle('is-dim', !!filter && s.type !== filter);
      el.classList.toggle('is-match', !!filter && s.type === filter);
      el.setAttribute('aria-pressed', String(id === selectedId));
      el.style.zIndex = id === selectedId ? '3' : '';
    });
  }, [selectedId, filter]);

  // Кадрування: без вибору — увесь маршрут; з вибором — точка разом із сусідами
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !visible) return;
    map.resize();
    const s = selectedId != null ? getStop(selectedId) : undefined;
    const duration = reducedMotion ? 0 : 1100;
    if (!s) {
      // без вибраної точки: увесь маршрут або місця обраної теми
      const themed = filter ? data.stops.filter((x) => x.type === filter) : [];
      map.fitBounds(boundsOf(themed.length ? themed : ROUTE), { padding: padding(), maxZoom: 15.5, duration });
    } else if (s.route) {
      map.fitBounds(boundsOf(neighbourhood(s)), { padding: padding(), maxZoom: MAX_SELECT_ZOOM, duration });
    } else {
      // окремі місця за 2–4 км від центру: летимо до самої точки
      map.flyTo({ center: [s.lng, s.lat], zoom: 15, padding: padding(), duration: reducedMotion ? 0 : 1600, essential: false });
    }
  }, [selectedId, reducedMotion, ready, visible, filter]);

  function showAll() {
    mapRef.current?.fitBounds(boundsOf(data.stops), { padding: padding(), duration: reducedMotion ? 0 : 900 });
  }

  function locate() {
    if (!('geolocation' in navigator)) {
      setGeo('Геолокація недоступна в цьому браузері.');
      return;
    }
    setGeo('Шукаю…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const map = mapRef.current;
        if (!map) return;
        if (!meMarker.current) {
          const el = document.createElement('div');
          el.className = 'me';
          el.setAttribute('aria-hidden', 'true');
          meMarker.current = new maplibregl.Marker({ element: el });
        }
        meMarker.current.setLngLat([me.lng, me.lat]).addTo(map);
        const nearest = nearestRouteStop(me);
        setGeo(`Найближче: ${pad2(nearest.s.id)} ${nearest.s.short}, ${formatDistance(nearest.d)} по прямій`);
        map.flyTo({ center: [me.lng, me.lat], zoom: Math.max(map.getZoom(), 15), padding: padding(), duration: reducedMotion ? 0 : 900 });
      },
      () => setGeo('Не вдалося визначити місце. Дозвольте доступ до геолокації.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="map" ref={wrap}>
      <div ref={box} className="map__canvas" role="region" aria-label="Мапа маршруту" />
      {failed && (
        <p className="map__fail">Базова мапа не завантажилася. Маршрут і точки працюють; перевірте з'єднання.</p>
      )}
      <div ref={chips} className="map__top">
        <div className="map__chips" role="group" aria-label="Фільтр за темою">
          {THEMES.map((t) => (
            <button
              key={t}
              type="button"
              className={`plate plate--${t}`}
              aria-pressed={filter === t}
              onClick={() => onFilter(filter === t ? null : t)}
            >
              <span className="plate__label">{data.types[t]}</span>
              <span className="plate__count" aria-label={`${COUNTS[t]} місць`}>
                {COUNTS[t]}
              </span>
            </button>
          ))}
        </div>
        <div className="map__tools">
          <button type="button" className="tool" onClick={showAll} title="Показати всі місця, включно з окремими">
            Усі місця
          </button>
          <button type="button" className="tool" onClick={locate}>
            Де я?
          </button>
        </div>
      </div>
      {geo && (
        <p className="map__geo" role="status">
          {geo}
        </p>
      )}
    </div>
  );
}
