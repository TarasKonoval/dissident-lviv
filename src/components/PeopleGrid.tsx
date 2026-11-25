import Face from './Face';
import { useRef } from 'react';
import Prose from './Prose';
import ReadingProgress from './ReadingProgress';
import { creditName, data, getStop, initials, pad2, personSlug, portraitOf, readingTime } from '../data';
import type { Person } from '../types';

function StopBadges({ person, onOpen }: { person: Person; onOpen: (id: number) => void }) {
  return (
    <ul className="badges" aria-label="Де згадується">
      {person.stops.map((id) => {
        const s = getStop(id);
        if (!s) return null;
        return (
          <li key={id}>
            <button type="button" className={`badge badge--${s.type}${s.route ? '' : ' badge--off'}`} onClick={() => onOpen(id)} title={s.title}>
              {pad2(id)}
              <span className="badge__name">{s.short}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Людина без вільного портрета: ініціали контуром, як номер аркуша, без порожньої рамки. */
function Monogram({ name, size }: { name: string; size: 'md' | 'lg' }) {
  return (
    <span className={`mono mono--${size}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

interface GridProps {
  onOpen: (id: number) => void;
  onPerson: (slug: string) => void;
}

export default function PeopleGrid({ onOpen, onPerson }: GridProps) {
  return (
    <section className="people" aria-labelledby="people-title">
      <header className="section-head">
        <p className="kicker">Покажчик імен</p>
        <h2 id="people-title" className="section-title display">
          Люди
        </h2>
      </header>
      <ol className="people__list">
        {data.people.map((p) => (
          <li key={p.name} className={`person${portraitOf(p.name) ? '' : ' person--text'}`}>
            <button type="button" className="person__card" onClick={() => onPerson(personSlug(p))}>
              {portraitOf(p.name) ? <Face name={p.name} size="md" /> : <Monogram name={p.name} size="md" />}
              <span className="person__head">
                <span className="person__name">{p.name}</span>
                <span className="person__years">{p.years ?? 'роки життя невідомі'}</span>
              </span>
            </button>
            <p className="person__role">{p.role}</p>
            <p className="person__text">{p.summary}</p>
            <button type="button" className="linkbtn person__more" onClick={() => onPerson(personSlug(p))}>
              Читати біографію →
            </button>
            <StopBadges person={p} onOpen={onOpen} />
          </li>
        ))}
      </ol>
    </section>
  );
}

interface PageProps {
  person: Person;
  onOpen: (id: number) => void;
  onClose: () => void;
}

export function PersonPage({ person, onOpen, onClose }: PageProps) {
  const i = data.people.indexOf(person);
  const portrait = portraitOf(person.name);
  const article = useRef<HTMLElement>(null);
  const time = readingTime([person.summary, ...person.bio]);
  return (
    <article ref={article} className="personpage" aria-labelledby="person-title">
      <ReadingProgress target={article} />
      <header className={`personpage__hero${portrait ? '' : ' personpage__hero--text'}`}>
        {portrait ? <Face name={person.name} size="lg" /> : <Monogram name={person.name} size="lg" />}
        <div className="personpage__head">
          <p className="hero__kicker">
            <span>
              Довідка {pad2(i + 1)} з {pad2(data.people.length)}
            </span>
            <span>{person.years ?? 'роки життя невідомі'}</span>
            <span>{time}</span>
          </p>
          <h2 id="person-title" className="personpage__name" tabIndex={-1}>
            {person.name}
          </h2>
          <p className="personpage__role">{person.role}</p>
          <button type="button" className="linkbtn" onClick={onClose}>
            ← Назад (Esc)
          </button>
        </div>
      </header>
      {portrait && (
        <p className="hero__credit">
          {portrait.note && <span className="hero__note">{portrait.note}. </span>}
          {portrait.page ? (
            <>
              Фото: {creditName(portrait.author)},{' '}
              {portrait.licenseUrl ? (
                <a href={portrait.licenseUrl} target="_blank" rel="noreferrer">
                  {portrait.license}
                </a>
              ) : (
                portrait.license ?? 'ліцензія не вказана'
              )}
              ,{' '}
              <a href={portrait.page} target="_blank" rel="noreferrer">
                {portrait.file ? 'Wikimedia Commons' : 'джерело'}
              </a>
            </>
          ) : (
            <>Фото додане вручну; автора й ліцензію ще не встановлено.</>
          )}
        </p>
      )}

      <div className="sheet__grid">
        <div className="sheet__main">
          <p className="sheet__lead">{person.summary}</p>
          <Prose paragraphs={person.bio} glossary className="story story--bio" />
        </div>
        <aside className="sheet__rail personpage__rail" aria-label="Коротко">
          <div className="idcard">
            <p className="idcard__name">{person.name}</p>
            <p className="idcard__years">
              {person.years ?? 'роки життя невідомі'} · {time}
            </p>
            <p className="idcard__role">{person.role}</p>
            <h3 className="label">На мапі</h3>
            <StopBadges person={person} onOpen={onOpen} />
            <a className="rail__sources" href="#sources">
              Джерела · {person.sources.length} →
            </a>
          </div>
        </aside>
      </div>
    </article>
  );
}
