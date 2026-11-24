import type { Map as MLMap } from 'maplibre-gl';

/**
 * Базова мапа — OpenFreeMap «positron» (вектор, без ключа). Ми перефарбовуємо її шари
 * у холодні паперові тони, щоб колір несли лише маркери й маршрут.
 */
export const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

type Palette = {
  bg: string;
  land: string;
  park: string;
  water: string;
  building: string;
  buildingLine: string;
  road: string;
  roadMajor: string;
  casing: string;
  rail: string;
  label: string;
  labelMinor: string;
  halo: string;
};

const LIGHT: Palette = {
  bg: '#ebe3d2',
  land: '#ebe3d2',
  park: '#d9d9bf',
  water: '#c9cfc9',
  building: '#ddd3bf',
  buildingLine: '#d2c6ae',
  road: '#f8f4ea',
  roadMajor: '#fdfaf3',
  casing: '#d3c7b0',
  rail: '#d3c8b3',
  label: '#5e5548',
  labelMinor: '#857a69',
  halo: '#efe8da',
};

const DARK: Palette = {
  bg: '#121119',
  land: '#14131b',
  park: '#15171a',
  water: '#0c0b11',
  building: '#1a1922',
  buildingLine: '#201f29',
  road: '#22212b',
  roadMajor: '#2a2834',
  casing: '#2e2c39',
  rail: '#262431',
  label: '#8a8599',
  labelMinor: '#6a6679',
  halo: '#121119',
};

const NAME = ['coalesce', ['get', 'name:uk'], ['get', 'name']];

export function restyle(map: MLMap, mode: 'light' | 'dark') {
  const c = mode === 'dark' ? DARK : LIGHT;
  const style = map.getStyle();
  if (!style?.layers) return;

  for (const layer of style.layers) {
    const id = layer.id;
    const set = (prop: string, value: unknown) => {
      try {
        map.setPaintProperty(id, prop, value);
      } catch {
        /* властивість не підходить до типу шару */
      }
    };

    switch (layer.type) {
      case 'background':
        set('background-color', c.bg);
        break;
      case 'fill':
        if (id.includes('water')) set('fill-color', c.water);
        else if (id.includes('building')) {
          set('fill-color', c.building);
          set('fill-outline-color', c.buildingLine);
        } else if (id.includes('park') || id.includes('wood')) set('fill-color', c.park);
        else if (id.includes('aeroway') || id.includes('pier')) set('fill-color', c.road);
        else set('fill-color', c.land);
        break;
      case 'line':
        if (id.includes('water')) set('line-color', c.water);
        else if (id.includes('casing') || id.includes('subtle') || id.includes('boundary')) set('line-color', c.casing);
        else if (id.includes('rail')) set('line-color', id.includes('dash') ? c.bg : c.rail);
        else if (id.includes('major') || id.includes('motorway')) set('line-color', c.roadMajor);
        else set('line-color', c.road);
        break;
      case 'symbol': {
        const layout = (layer as { layout?: Record<string, unknown> }).layout ?? {};
        if (id.includes('shield')) {
          map.setLayoutProperty(id, 'visibility', 'none');
          break;
        }
        if (layout['text-field']) map.setLayoutProperty(id, 'text-field', NAME);
        set('text-color', id.includes('highway') ? c.labelMinor : c.label);
        set('text-halo-color', c.halo);
        set('text-halo-width', 1.4);
        break;
      }
      case 'raster':
        // рельєф Natural Earth — ховаємо, на міському масштабі не потрібен
        map.setLayoutProperty(id, 'visibility', 'none');
        break;
    }
  }
}
