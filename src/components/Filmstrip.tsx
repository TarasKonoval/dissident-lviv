import { useEffect, useRef } from 'react';
import { OFF_ROUTE, ROUTE, SEQUENCE, data, getStop, pad2 } from '../data';
import type { ThemeKey } from '../types';

interface Props {
  focusId: number | null;
  filter: ThemeKey | null;
  onFilter: (t: ThemeKey | null) => void;
  onFocus: (id: number) => void;
  onOpen: (id: number) => void;
  big: boolean;
  onBig: (big: boolean) => void;
}

/** Стрічка аркушів над мапою: фокус — на мапі, клік по фокусованій картці — читати. */
export default function Filmstrip({ focusId, filter, onFilter, onFocus, onOpen, big, onBig }: Props) {
  const ids = SEQUENCE.filter((id) => !filter || getStop(id)!.type === filter);
  const box = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>('.card.is-focus');
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [focusId]);

  return (
    <div className="film">
      <div className="film__head">
        {filter ? (
          <>
            <span className={`film__count film__count--${filter}`}>
              {data.types[filter]} · {ids.length} з {SEQUENCE.length}
            </span>
            <button type="button" className="film__clear" onClick={() => onFilter(null)}>
              × показати всі
            </button>
          </>
        ) : (
          <>
            <span className="film__count">
              {ROUTE.length} адрес пішки · {OFF_ROUTE.length} окремо
            </span>
            <span className="film__hint">Оберіть точку на мапі або картку; ще раз — щоб читати</span>
          </>
        )}
        <button type="button" className="film__big" aria-pressed={big} onClick={() => onBig(!big)}>
          {big ? '↙ Менша мапа' : '↗ Більша мапа'}
        </button>
      </div>
      <ol className="film__list" ref={box}>
        {ids.map((id) => {
          const s = getStop(id)!;
          const focus = id === focusId;
          return (
            <li key={id}>
              <button
                type="button"
                className={`card card--${s.type}${s.route ? '' : ' card--off'}${focus ? ' is-focus' : ''}`}
                aria-current={focus ? 'true' : undefined}
                onClick={() => (focus ? onOpen(id) : onFocus(id))}
                style={focus && s.photo?.src ? { ['--card-img' as string]: `url("${s.photo.src}")` } : undefined}
              >
                <span className="card__n">{pad2(id)}</span>
                <span className="card__title">{s.title}</span>
                <span className="card__foot">
                  <span>{s.years}</span>
                  {focus && <span className="card__read">Читати →</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
