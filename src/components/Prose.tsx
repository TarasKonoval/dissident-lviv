import type { ReactNode } from 'react';
import { NOTE, glossaryMatchers } from '../data';
import type { GlossaryTerm } from '../types';

interface Props {
  paragraphs: string[];
  /** Позначати перше входження термінів словника */
  glossary?: boolean;
  className?: string;
  /** Префікс id абзаців (для змісту): `${ids}-${i}` */
  ids?: string;
  /** Індекси абзаців, перед якими стоїть нумерований розділювач */
  dividers?: number[];
}

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const RUN_IN = /^(\d{4}(?:[–-]\d{4})?)\.\s+/;

function Term({ term, children }: { term: GlossaryTerm; children: ReactNode }) {
  return (
    <span className="term" tabIndex={0}>
      {children}
      <span className="term__pop" role="tooltip">
        <b>{term.term}</b> {term.text}
      </span>
    </span>
  );
}

/**
 * Абзаци історії: рік на початку стає «врізкою», перше входження термінів словника отримує підказку.
 * Останній абзац «Сьогодні. …» / «Що почитати. …» стає окремою приміткою з підписом.
 */
export default function Prose({ paragraphs, glossary = false, className = 'story', ids, dividers = [] }: Props) {
  const used = new Set<string>();

  function annotate(text: string): ReactNode[] {
    if (!glossary) return [text];
    // Шукаємо найраніше входження ще не використаного терміна, і так по черзі.
    const out: ReactNode[] = [];
    let rest = text;
    let key = 0;
    for (;;) {
      let best: { idx: number; len: number; term: GlossaryTerm } | null = null;
      for (const { term, re } of glossaryMatchers) {
        if (used.has(term.term)) continue;
        const m = re.exec(rest);
        if (m && (!best || m.index < best.idx)) best = { idx: m.index, len: m[0].length, term };
      }
      if (!best) break;
      used.add(best.term.term);
      out.push(rest.slice(0, best.idx));
      out.push(
        <Term key={key++} term={best.term}>
          {rest.slice(best.idx, best.idx + best.len)}
        </Term>,
      );
      rest = rest.slice(best.idx + best.len);
    }
    out.push(rest);
    return out;
  }

  return (
    <div className={className}>
      {paragraphs.map((p, i) => {
        const id = ids ? `${ids}-${i}` : undefined;
        const d = dividers.indexOf(i);
        const divider = d >= 0 && (
          <div key={`d${i}`} className="divider" aria-hidden="true">
            <span>{ROMAN[d + 1] ?? d + 2}</span>
          </div>
        );
        const note = i === paragraphs.length - 1 && i > 0 ? NOTE.exec(p) : null;
        if (note) {
          return (
            <aside key={i} id={id} className="note" aria-label={note[1]}>
              <p className="note__label">{note[1]}</p>
              <p>{annotate(p.slice(note[0].length))}</p>
            </aside>
          );
        }
        const m = RUN_IN.exec(p);
        return [
          divider,
          <p key={i} id={id}>
            {m && <span className="runin">{m[1]}</span>}
            {annotate(m ? p.slice(m[0].length) : p)}
          </p>,
        ];
      })}
    </div>
  );
}
