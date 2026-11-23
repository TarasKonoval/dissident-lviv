import { useEffect, useState } from 'react';
import {
  DETOUR,
  MIN_PER_STOP,
  OFF_ROUTE,
  ROUTE,
  SPEED_KMH,
  formatDistance,
  formatMinutes,
  googleWalkUrl,
  leg,
  nearestRouteStop,
  pad2,
} from '../data';

interface Props {
  onOpen: (id: number) => void;
}

const KEY = 'dl-walk-here';

const legs = ROUTE.map((s) => ({ s, ...leg(s.fromPrev) }));
let acc = 0;
const cumulative = legs.map((l) => (acc += l.walk));
const walkTotal = acc;
const minutesTotal = legs.reduce((t, l) => t + l.minutes, 0);
const grandMinutes = minutesTotal + MIN_PER_STOP * ROUTE.length;

const fullRoute = googleWalkUrl(ROUTE[0], ROUTE[ROUTE.length - 1], ROUTE.slice(1, -1));

export default function WalkMode({ onOpen }: Props) {
  const [here, setHere] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem(KEY));
      return v >= 0 && v < ROUTE.length ? v : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, String(here));
    } catch {
      /* приватний режим */
    }
  }, [here]);

  const cur = ROUTE[here];
  const nxt = ROUTE[here + 1];
  const nextLeg = nxt ? legs[here + 1] : null;

  function arrive(i: number) {
    setHere(i);
  }

  return (
    <section className="walk" aria-labelledby="walk-title">
      <header className="section-head">
        <p className="kicker">Режим прогулянки</p>
        <h2 id="walk-title" className="section-title display">
          Маршрут пішки
        </h2>
        <dl className="facts facts--walk">
          <div className="facts__item">
            <dt>Пішки</dt>
            <dd>{formatDistance(walkTotal)}</dd>
          </div>
          <div className="facts__item">
            <dt>У дорозі</dt>
            <dd>{formatMinutes(minutesTotal)}</dd>
          </div>
          <div className="facts__item">
            <dt>Разом із зупинками</dt>
            <dd>≈ {formatMinutes(grandMinutes)}</dd>
          </div>
        </dl>
        <p className="muted small">
          {ROUTE.length} зупинок по {MIN_PER_STOP} хв. Відстані: пряма × {String(DETOUR).replace('.', ',')}, швидкість{' '}
          {String(SPEED_KMH).replace('.', ',')} км/год. Це оцінка, не навігація.
        </p>
        <p>
          <a className="btn" href={fullRoute} target="_blank" rel="noreferrer">
            Відкрити маршрут у Google Картах ↗
          </a>
        </p>
      </header>

      <div className="here" aria-live="polite">
        <p className="label">Я тут</p>
        <p className="here__now">
          <span className="here__n">{pad2(cur.id)}</span> {cur.title}
        </p>
        {nxt && nextLeg ? (
          <>
            <p className="here__next">
              Далі: <b>{pad2(nxt.id)} {nxt.short}</b> · {formatDistance(nextLeg.walk)} · ~{formatMinutes(nextLeg.minutes)}
            </p>
            <div className="here__actions">
              <a className="btn btn--quiet" href={googleWalkUrl(cur, nxt)} target="_blank" rel="noreferrer">
                Як дійти ↗
              </a>
              <button type="button" className="btn" onClick={() => arrive(here + 1)}>
                Прийшли → {pad2(nxt.id)}
              </button>
            </div>
          </>
        ) : (
          <p className="here__next">Кінцева точка. Час для розмови.</p>
        )}
        <div className="here__actions here__actions--minor">
          {here > 0 && (
            <button type="button" className="linkbtn" onClick={() => arrive(here - 1)}>
              ← на крок назад
            </button>
          )}
          <button type="button" className="linkbtn" onClick={() => onOpen(cur.id)}>
            Читати аркуш {pad2(cur.id)}
          </button>
          <a className="linkbtn" href={`#map-${cur.id}`}>
            Показати на мапі
          </a>
        </div>
      </div>

      <ol className="itinerary">
        {legs.map(({ s, walk, minutes }, i) => (
          <li key={s.id} className={`itinerary__item${i === here ? ' is-here' : ''}${i < here ? ' is-done' : ''}`}>
            {i > 0 && (
              <p className={`itinerary__leg${i === legs.length - 1 ? ' itinerary__leg--last' : ''}`}>
                <span>
                  {formatDistance(walk)} · {formatMinutes(minutes)}
                </span>
                <span className="muted">разом {formatDistance(cumulative[i])}</span>
              </p>
            )}
            <div className="itinerary__stop">
              <span className={`num num--${s.type}${s.approx ? ' num--approx' : ''}`}>{s.id}</span>
              <div>
                <button type="button" className="itinerary__title" onClick={() => onOpen(s.id)}>
                  {s.title}
                </button>
                <p className="itinerary__addr">
                  {s.address}
                  {s.approx && <span className="muted"> · місце приблизне</span>}
                </p>
                <p className="itinerary__lead">{s.lead}</p>
                {i !== here && (
                  <button type="button" className="linkbtn" onClick={() => arrive(i)}>
                    Я тут
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <section className="offroute" aria-labelledby="off-title">
        <h3 id="off-title" className="label">
          Окремо: дістатися транспортом
        </h3>
        <ol className="offroute__list">
          {OFF_ROUTE.map((s) => {
            const near = nearestRouteStop(s);
            return (
              <li key={s.id} className="itinerary__stop">
                <span className={`num num--${s.type} num--off`}>{s.id}</span>
                <div>
                  <button type="button" className="itinerary__title" onClick={() => onOpen(s.id)}>
                    {s.title}
                  </button>
                  <p className="itinerary__addr">
                    {s.address}
                    {s.approx && <span className="muted"> · місце приблизне</span>}
                  </p>
                  <p className="itinerary__addr">
                    {formatDistance(near.d)} по прямій від {pad2(near.s.id)} {near.s.short} ·{' '}
                    <a href={googleWalkUrl(near.s, s, [], 'transit')} target="_blank" rel="noreferrer">
                      маршрут транспортом ↗
                    </a>
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </section>
  );
}
