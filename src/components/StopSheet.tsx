import { useEffect, useState } from 'react';
import Face from './Face';
import MiniMap from './MiniMap';
import Prose from './Prose';
import {
  ROUTE,
  ROUTE_TOTAL,
  formatDistance,
  formatMinutes,
  leg,
  SEQUENCE,
  additions,
  creditName,
  data,
  formatCoords,
  getStop,
  googlePlaceUrl,
  osmUrl,
  pad2,
  personByName,
  personSlug,
} from '../data';
import type { Fact, Photo, Stop } from '../types';

interface Props {
  stop: Stop;
  onGo: (id: number) => void;
  onPerson: (slug: string) => void;
  theme: 'light' | 'dark';
}

/** Розмір цифри факту залежить від довжини: короткі значення стають «експонатами». */
const factSize = (f: Fact) => (f.value.length <= 6 ? 'xl' : f.value.length <= 14 ? 'lg' : 'md');

export default function StopSheet({ stop, onGo, onPerson, theme }: Props) {
  const idx = SEQUENCE.indexOf(stop.id);
  const prev = idx > 0 ? getStop(SEQUENCE[idx - 1]) : undefined;
  const next = idx < SEQUENCE.length - 1 ? getStop(SEQUENCE[idx + 1]) : undefined;
  const extra = additions(stop.id);
  const photo = stop.photo?.src ? stop.photo : null;
  const ri = ROUTE.findIndex((r) => r.id === stop.id);
  const nextOnFoot = ri >= 0 && ri < ROUTE.length - 1 ? { s: ROUTE[ri + 1], ...leg(ROUTE[ri + 1].fromPrev) } : null;

  return (
    <article className={`sheet sheet--${stop.type}${stop.route ? '' : ' sheet--off'}`} aria-labelledby="sheet-title" key={stop.id}>
      <Hero stop={stop} photo={photo} />

      <div className="sheet__grid">
        <div className="sheet__main">
          <p className="sheet__lead">{stop.lead}</p>

          <Prose paragraphs={stop.story} glossary />

          {stop.quote && (
            <figure className="pullquote">
              <blockquote>
                <p>{stop.quote.text}</p>
              </blockquote>
              <figcaption>
                <span className="pullquote__who">{stop.quote.who}</span>
                <a href={stop.quote.source.url} target="_blank" rel="noreferrer">
                  {stop.quote.source.title} ↗
                </a>
              </figcaption>
            </figure>
          )}

          {extra.length > 0 && (
            <section className="addenda" aria-label="Доповнення з джерел">
              <p className="label">Ще з джерел</p>
              {extra.map((a) => (
                <p key={a.text}>
                  {a.text}{' '}
                  <a className="addenda__src" href={a.source.url} target="_blank" rel="noreferrer">
                    {a.source.title} ↗
                  </a>
                </p>
              ))}
            </section>
          )}

          {stop.unsure && (
            <aside className="margin-note" aria-label="На полях: що непевне">
              <p className="margin-note__label">На полях</p>
              <p>{stop.unsure}</p>
            </aside>
          )}
        </div>

        <aside className="sheet__rail" aria-label="Довідка до аркуша">
          {stop.facts.length > 0 && (
            <dl className="exhibit">
              {stop.facts.map((f, i) => (
                <div key={f.label} className="exhibit__item">
                  <dt>{f.label}</dt>
                  <dd className={`exhibit__value exhibit__value--${factSize(f)}${i === 0 ? ' exhibit__value--accent' : ''}`}>{f.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="rail__map">
            <a className="rail__mapcard" href={`#map-${stop.id}`} aria-label="Відкрити на великій мапі">
              <MiniMap stop={stop} theme={theme} />
            </a>
            <a className="rail__maplink" href={`#map-${stop.id}`}>
              Відкрити на великій мапі →
            </a>
            {nextOnFoot && (
              <p className="rail__next">
                Далі пішки: {pad2(nextOnFoot.s.id)} {nextOnFoot.s.short} · {formatDistance(nextOnFoot.walk)} · ≈
                {formatMinutes(nextOnFoot.minutes)}
              </p>
            )}
          </div>

          <div className="rail__place">
            <p>{stop.address}</p>
            <p>
              {stop.approx && <abbr title="Місце приблизне">≈ </abbr>}
              {formatCoords(stop.lat, stop.lng)}
            </p>
            <p className="rail__links">
              <a href={googlePlaceUrl(stop)} target="_blank" rel="noreferrer">
                Google Карти ↗
              </a>
              <a href={osmUrl(stop)} target="_blank" rel="noreferrer">
                OpenStreetMap ↗
              </a>
            </p>
          </div>

          {stop.people.length > 0 && (
            <section className="rail__people" aria-labelledby={`ppl-${stop.id}`}>
              <h3 id={`ppl-${stop.id}`} className="label">
                Люди в цій точці
              </h3>
              <ul>
                {stop.people.map((name) => {
                  const p = personByName(name);
                  const inner = (
                    <>
                      <Face name={name} size="sm" />
                      <span className="who__text">
                        <span className="who__name">{name}</span>
                        <span className="who__years">{p?.years ?? ''}</span>
                      </span>
                    </>
                  );
                  return (
                    <li key={name}>
                      {p ? (
                        <button type="button" className="who" onClick={() => onPerson(personSlug(p))}>
                          {inner}
                        </button>
                      ) : (
                        <span className="who who--plain">{inner}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <a className="rail__sources" href={`#sources-${stop.id}`}>
            Джерела до аркуша · {stop.sources.length} →
          </a>
        </aside>
      </div>

      <nav className="pager" aria-label="Попередній і наступний аркуш">
        {prev ? (
          <button type="button" className="pager__btn" onClick={() => onGo(prev.id)}>
            <span className="pager__dir">← Попередній</span>
            <span className="pager__name">
              <span className="pager__n">{pad2(prev.id)}</span> {prev.short}
            </span>
          </button>
        ) : (
          <span />
        )}
        {next ? (
          <button type="button" className="pager__btn pager__btn--next" onClick={() => onGo(next.id)}>
            <span className="pager__dir">{next.route ? 'Наступний аркуш →' : 'Поза маршрутом →'}</span>
            <span className="pager__name">
              <span className="pager__n">{pad2(next.id)}</span> {next.short}
            </span>
          </button>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}

function Hero({ stop, photo }: { stop: Stop; photo: Photo | null }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photo?.src]);
  const showImg = photo && !failed;

  return (
    <>
      <header className={`hero${showImg ? '' : ' hero--plain'}`}>
        {showImg && (
          <img className="hero__img" src={photo.src!} alt={photo.alt} decoding="async" onError={() => setFailed(true)} />
        )}
        <div className="hero__tint" aria-hidden="true" />
        <div className="hero__fade" aria-hidden="true" />
        <div className="hero__body">
          <span className="hero__num" aria-hidden="true">
            {pad2(stop.id)}
          </span>
          <div className="hero__text">
            <p className="hero__kicker">
              <span className={`hero__type hero__type--${stop.type}`}>{data.types[stop.type]}</span>
              <span>{stop.route ? `Арк. ${pad2(stop.id)} з ${pad2(ROUTE_TOTAL)}` : 'Поза маршрутом'}</span>
              <span>{stop.years}</span>
              {stop.approx && <span className="hero__approx">місце приблизне</span>}
            </p>
            <h2 id="sheet-title" className="hero__title" tabIndex={-1}>
              {stop.title}
            </h2>
          </div>
        </div>
      </header>
      {photo && (
        <p className="hero__credit">
          {photo.note && <span className="hero__note">{photo.note} </span>}
          Фото: {creditName(photo.author)},{' '}
          {photo.licenseUrl ? (
            <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
              {photo.license}
            </a>
          ) : (
            photo.license
          )}
          ,{' '}
          <a href={photo.page ?? '#'} target="_blank" rel="noreferrer">
            Wikimedia Commons
          </a>
          {photo.extra.map((x) => (
            <span key={x.url}>
              {' · '}
              <a href={x.url} target="_blank" rel="noreferrer">
                {x.title} ↗
              </a>
            </span>
          ))}
        </p>
      )}
    </>
  );
}
