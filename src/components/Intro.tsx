import Prose from './Prose';
import { OFF_ROUTE, ROUTE, creditName, data, getStop } from '../data';
import type { Stop } from '../types';

interface Props {
  onOpen: (id: number) => void;
  onWalk: () => void;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const COUNT = ['', 'Одна хвиля', 'Дві хвилі', 'Три хвилі', 'Чотири хвилі', "П'ять хвиль", 'Шість хвиль', 'Сім хвиль'];

/** Розділи довгого читання: id секції → підпис у рядку змісту */
const PARTS: [string, string][] = [
  ['ctx-intro', 'Передісторія'],
  ['waves-title', 'Хвилі'],
  ['system-title', 'Як працювала система'],
  ['ethics-title', 'Етика'],
  ['toc-title', 'Аркуші'],
  ['glossary', 'Словник'],
];

function Toc({ stops, onOpen }: { stops: Stop[]; onOpen: (id: number) => void }) {
  return (
    <ol className="toc__list">
      {stops.map((s) => (
        <li key={s.id}>
          <button type="button" className="toc__item" onClick={() => onOpen(s.id)}>
            <span className={`num num--${s.type}${s.approx ? ' num--approx' : ''}${s.route ? '' : ' num--off'}`}>{s.id}</span>
            <span className="toc__title">{s.title}</span>
            <span className="toc__years">{s.years}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/** Обкладинка вступу: тюрма на Лонцького, через яку пройшли майже всі герої. */
const cover = getStop(3)?.photo;

export default function Intro({ onOpen, onWalk }: Props) {
  const { context } = data;
  // без зміни хешу: інакше роутер поверне вступ на початок
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="intro">
      <header className="hero hero--intro">
        {cover?.src && <img className="hero__img" src={cover.src} alt={cover.alt} decoding="async" />}
        <div className="hero__tint" aria-hidden="true" />
        <div className="hero__fade" aria-hidden="true" />
        <div className="hero__body">
          <span className="hero__num hero__num--years" aria-hidden="true">
            1965
            <br />
            1991
          </span>
          <div className="hero__text">
            <p className="hero__kicker">
              <span className="hero__type hero__type--resistance">
                {ROUTE.length} адрес пішки · {OFF_ROUTE.length} окремо · {data.people.length} людей
              </span>
            </p>
            <h2 id="ctx-title" className="hero__title">
              {context.title}
            </h2>
          </div>
        </div>
      </header>
      {cover && (
        <p className="hero__credit">
          {cover.alt}. Фото: {creditName(cover.author)}, {cover.license}, Wikimedia Commons
        </p>
      )}

      <nav className="parts" aria-label="Розділи вступу">
        {PARTS.map(([id, label]) => (
          <button key={id} type="button" className="parts__link" onClick={() => jump(id)}>
            {label}
          </button>
        ))}
      </nav>

      <section id="ctx-intro" aria-label="Передісторія" className="intro__read">
        <Prose paragraphs={context.intro} className="story story--intro" glossary />
        <p className="intro__start">
          <button type="button" className="btn" onClick={() => onOpen(ROUTE[0].id)}>
            Почати з аркуша 01 →
          </button>
          <a className="btn btn--quiet" href="#map">
            Відкрити мапу
          </a>
          <button type="button" className="btn btn--quiet" onClick={onWalk}>
            Режим прогулянки
          </button>
        </p>
      </section>

      <section aria-labelledby="waves-title">
        <h2 id="waves-title" className="intro__h">
          {COUNT[context.waves.length] ?? `Хвилі: ${context.waves.length}`}
        </h2>
        <ol className="waves">
          {context.waves.map((w, i) => (
            <li key={w.years} className="wave">
              <p className="wave__no">
                <span className="wave__roman">{ROMAN[i]}</span>
                <span className="wave__years">{w.years}</span>
              </p>
              <div className="wave__body">
                <h3 className="wave__title">{w.title}</h3>
                <p>{w.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="system-title" className="system">
        <h2 id="system-title" className="intro__h">
          Як працювала система
        </h2>
        <Prose paragraphs={context.system} className="story" />
      </section>

      <section aria-labelledby="ethics-title" className="ethics">
        <h2 id="ethics-title" className="intro__h">
          Етика
        </h2>
        <p className="ethics__text">{context.ethics}</p>
      </section>

      <aside className="margin-note margin-note--wide" aria-label="Як читати карту критично">
        <p className="margin-note__label">На полях</p>
        <p>{context.critical}</p>
      </aside>

      <section aria-labelledby="toc-title" className="toc">
        <h2 id="toc-title" className="intro__h">
          Аркуші
        </h2>
        <p className="toc__group">Піший маршрут</p>
        <Toc stops={ROUTE} onOpen={onOpen} />
        <p className="toc__group">Окремо від маршруту</p>
        <Toc stops={OFF_ROUTE} onOpen={onOpen} />
      </section>

      <section id="glossary" aria-labelledby="glossary-title" className="glossary">
        <h2 id="glossary-title" className="section-title display">
          Словник
        </h2>
        <dl className="glossary__list">
          {data.glossary.map((g) => (
            <div key={g.term} className="glossary__item">
              <dt>{g.term}</dt>
              <dd>{g.text}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
