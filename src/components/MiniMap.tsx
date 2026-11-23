import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { STYLE_URL, restyle } from '../mapStyle';
import { SEQUENCE, getStop } from '../data';
import { addRoute } from './MapView';
import type { Stop } from '../types';

/** Невелика нерухома мапа в бічній колонці аркуша: точка, сусіди й маршрут. */
export default function MiniMap({ stop }: { stop: Stop }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!box.current) return;
    const map = new maplibregl.Map({
      container: box.current,
      style: STYLE_URL,
      center: [stop.lng, stop.lat],
      zoom: stop.route ? 14.6 : 14.2,
      interactive: false,
      attributionControl: false,
    });
    map.on('load', () => {
      restyle(map, 'dark');
      addRoute(map);
    });
    SEQUENCE.forEach((id) => {
      const s = getStop(id)!;
      const el = document.createElement('span');
      el.className = `pin pin--mini pin--${s.type}${s.route ? '' : ' pin--off'}${id === stop.id ? ' is-active' : ''}`;
      el.setAttribute('aria-hidden', 'true');
      if (id === stop.id) el.textContent = String(id);
      new maplibregl.Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(map);
    });
    return () => map.remove();
  }, [stop]);

  return <div ref={box} className="minimap" />;
}
