import { useMemo } from 'react';
import { additions, creditName, data, getStop, headline, outlet, pad2, personSlug, portraitOf } from '../data';
import type { Link } from '../types';

interface Props {
  stop?: number;
  onOpen: (id: number) => void;
  onPerson: (slug: string) => void;
  onAll: () => void;
}

interface Entry {
  link: Link;
  stops: Set<number>;
  people: Set<string>;
}

function collect() {
  const map = new Map<string, Entry>();
  const add = (link: Link, stop?: number, person?: string) => {
    const e = map.get(link.url) ?? { link, stops: new Set<number>(), people: new Set<string>() };
    if (stop != null) e.stops.add(stop);
    if (person) e.people.add(person);
    map.set(link.url, e);
  };
  for (const s of data.stops) {
    s.sources.forEach((l) => add(l, s.id));
    if (s.quote) add(s.quote.source, s.id);
    additions(s.id).forEach((a) => add(a.source, s.id));
  }
  for (const p of data.people) p.sources.forEach((l) => add(l, undefined, p.name));

  const groups = new Map<string, Entry[]>();
  for (const e of map.values()) {
    const key = outlet(e.link);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups.entries()]
    .map(([name, entries]) => ({ name, entries: entries.sort((a, b) => headline(a.link).localeCompare(headline(b.link), 'uk')) }))
    .sort((a, b) => b.entries.length - a.entries.length || a.name.localeCompare(b.name, 'uk'));
}

export default function Sources({ stop, onOpen, onPerson, onAll }: Props) {
  const groups = useMemo(collect, []);
  const total = groups.reduce((n, g) => n + g.entries.length, 0);
  const focus = stop != null ? getStop(stop) : undefined;
  const focusLinks = focus
    ? [...focus.sources, ...(focus.quote ? [focus.quote.source] : []), ...additions(focus.id).map((a) => a.source)].filter(
        (l, i, arr) => arr.findIndex((x) => x.url === l.url) === i,
      )
    : [];
  const photos = data.stops.filter((s) => s.photo?.src);
  const faces = data.people.filter((p) => portraitOf(p.name));

  let n = 0;
  return (
    <section className="sources" aria-labelledby="src-title">
      <header className="section-head">
        <p className="kicker">Бібліографія</p>
        <h2 id="src-title" className="section-title display">
          Джерела
        </h2>
        <p className="lede">
          {total} публікацій з {groups.length} видань і архівів. Кожен аркуш і кожна біографія спираються на ці тексти;
          цифри біля посилань показують, де саме їх використано.
        </p>
      </header>

      {focus && (
        <section className="sources__focus" aria-label={`Джерела до аркуша ${pad2(focus.id)}`}>
          <p className="label">
            Аркуш {pad2(focus.id)} · {focus.title}
          </p>
          <ol className="biblio biblio--focus">
            {focusLinks.map((l) => (
              <li key={l.url}>
                <span className="biblio__outlet">{outlet(l)}</span>
                <a className="biblio__title" href={l.url} target="_blank" rel="noreferrer">
                  {headline(l)}
                </a>
              </li>
            ))}
          </ol>
          <p className="sources__back">
            <button type="button" className="linkbtn" onClick={() => onOpen(focus.id)}>
              ← назад до аркуша
            </button>
            <button type="button" className="linkbtn" onClick={onAll}>
              усі джерела
            </button>
          </p>
        </section>
      )}

      {groups.map((g) => (
        <section key={g.name} className="biblio-group">
          <h3 className="biblio-group__name">
            {g.name}
            <span className="biblio-group__count">{g.entries.length}</span>
          </h3>
          <ol className="biblio">
            {g.entries.map((e) => {
              n += 1;
              const hit = focus && e.stops.has(focus.id);
              return (
                <li key={e.link.url} className={hit ? 'is-hit' : undefined}>
                  <span className="biblio__n">{n}</span>
                  <div>
                    <a className="biblio__title" href={e.link.url} target="_blank" rel="noreferrer">
                      {headline(e.link)}
                    </a>
                    <p className="biblio__refs">
                      {[...e.stops]
                        .sort((a, b) => a - b)
                        .map((id) => (
                          <button key={id} type="button" className={`ref ref--${getStop(id)?.type}`} onClick={() => onOpen(id)} title={getStop(id)?.title}>
                            {pad2(id)}
                          </button>
                        ))}
                      {[...e.people].map((name) => {
                        const p = data.people.find((x) => x.name === name)!;
                        return (
                          <button key={name} type="button" className="ref ref--person" onClick={() => onPerson(personSlug(p))}>
                            {name}
                          </button>
                        );
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      <section className="biblio-group">
        <h3 className="biblio-group__name">
          Фотографії
          <span className="biblio-group__count">{photos.length}</span>
        </h3>
        <ol className="credits">
          {photos.map((s) => (
            <li key={s.id}>
              <span className="biblio__n">{pad2(s.id)}</span>
              <span>
                <a href={s.photo!.page ?? '#'} target="_blank" rel="noreferrer">
                  {s.photo!.alt}
                </a>
                <span className="muted">
                  {' '}
                  · {creditName(s.photo!.author)}, {s.photo!.license}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <h3 className="biblio-group__name biblio-group__name--sub">
          Портрети
          <span className="biblio-group__count">{faces.length}</span>
        </h3>
        <ol className="credits">
          {faces.map((p) => {
            const f = portraitOf(p.name)!;
            return (
              <li key={p.name}>
                <span className="biblio__n">·</span>
                <span>
                  {f.page ? (
                    <a href={f.page} target="_blank" rel="noreferrer">
                      {p.name}
                    </a>
                  ) : (
                    p.name
                  )}
                  <span className="muted">
                    {' '}
                    · {f.page ? `${creditName(f.author)}, ${f.license ?? 'ліцензія не вказана'}` : 'додане вручну, автора й ліцензію не встановлено'}
                    {f.note ? ` · ${f.note}` : ''}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
        <p className="muted small">
          Світлини з Wikimedia Commons під вільними ліцензіями. Архівні фото Центру міської історії захищені авторським
          правом, тому на аркушах лише посилання на них. Мапа: © учасники OpenStreetMap, OpenMapTiles, OpenFreeMap.
        </p>
      </section>
    </section>
  );
}
