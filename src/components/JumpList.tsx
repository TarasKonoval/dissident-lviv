import { NOTE } from '../data';

const RUN_IN = /^(\d{4}(?:[–-]\d{4})?)\.\s+/;

/** Короткий підпис абзацу: рік-врізка або «Сьогодні», інакше перші слова. */
function label(p: string) {
  const note = NOTE.exec(p);
  if (note) return { mark: note[1], text: '' };
  const m = RUN_IN.exec(p);
  const rest = m ? p.slice(m[0].length) : p;
  const words = rest.split(/\s+/).slice(0, 6).join(' ').replace(/[,.:;]$/, '');
  return { mark: m?.[1] ?? '', text: `${words}…` };
}

interface Props {
  paragraphs: string[];
  ids: string;
}

/** «Зміст» довгого аркуша: стрибок до абзацу без зміни хешу (хеш — це маршрут). */
export default function JumpList({ paragraphs, ids }: Props) {
  const jump = (i: number) => {
    const el = document.getElementById(`${ids}-${i}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <details className="jump">
      <summary>
        Зміст <span className="jump__count">{paragraphs.length} абзаців</span>
      </summary>
      <ol className="jump__list">
        {paragraphs.map((p, i) => {
          const l = label(p);
          return (
            <li key={i}>
              <button type="button" className="jump__item" onClick={() => jump(i)}>
                <span className="jump__n">{String(i + 1).padStart(2, '0')}</span>
                {l.mark && <span className="jump__mark">{l.mark}</span>}
                <span className="jump__text">{l.text}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
