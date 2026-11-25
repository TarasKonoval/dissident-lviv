import { useMemo, useRef, useState } from 'react';
import { data, fractionalYear, getStop, pad2 } from '../data';

interface Props {
  selectedId: number | null;
  filter?: string | null;
  onSelect: (id: number) => void;
}

/* Вісь: 1945–1958 стиснуто у вузький «вступ», далі 1959–1992 пропорційно. */
const PRE: [number, number] = [1945, 1959];
const MAIN: [number, number] = [1959, 1992];
const PRE_W = 6; // % ширини під «до 1959»
const GAP: [number, number] = [1982, 1986];
const NEAR = 0.12; // років: ближчі події зсуваються вбік, як штрихи
const PEAK_MIN = 3; // скільки подій за місяць робить «пік» із підписом
const PEAK_GAP = 4; // % ширини: ближчі піки отримують спільний підпис
const YEARS = [1946, 1960, 1965, 1970, 1975, 1980, 1985, 1990];

const NOMINATIVE: Record<string, string> = {
  січня: 'січень', лютого: 'лютий', березня: 'березень', квітня: 'квітень', травня: 'травень', червня: 'червень',
  липня: 'липень', серпня: 'серпень', вересня: 'вересень', жовтня: 'жовтень', листопада: 'листопад', грудня: 'грудень',
};

function pct(y: number) {
  if (y < PRE[1]) return ((y - PRE[0]) / (PRE[1] - PRE[0])) * PRE_W;
  return PRE_W + ((y - MAIN[0]) / (MAIN[1] - MAIN[0])) * (100 - PRE_W);
}

/** «24 серпня 1965» → «серпень 1965»; без місяця — null */
function monthKey(date: string, year: number) {
  const m = Object.keys(NOMINATIVE).find((g) => date.toLowerCase().includes(g));
  return m ? `${NOMINATIVE[m]} ${year}` : null;
}

export default function Timeline({ selectedId, filter = null, onSelect }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const lastPointer = useRef<string>('mouse');
  const armed = useRef<number | null>(null);

  const { events, peaks } = useMemo(() => {
    const placed = data.timeline
      .map((e, i) => ({ ...e, i, x: fractionalYear(e.date, e.year), type: getStop(e.stop)?.type ?? 'resistance' }))
      .sort((a, b) => a.x - b.x);
    const events = placed.map((e, k) => {
      let shift = 0;
      for (let j = 0; j < k; j++) if (e.x - placed[j].x < NEAR) shift++;
      return { ...e, left: pct(e.x), shift };
    });
    const groups = new Map<string, number[]>();
    for (const e of events) {
      const key = monthKey(e.date, e.year);
      if (key) groups.set(key, [...(groups.get(key) ?? []), e.left]);
    }
    const raw = [...groups.entries()]
      .filter(([, xs]) => xs.length >= PEAK_MIN)
      .map(([label, xs]) => ({ label, left: xs.reduce((a, b) => a + b, 0) / xs.length }))
      .sort((a, b) => a.left - b.left);
    // Сусідні місяці зливаємо в один підпис: «серпень–вересень 1965»
    const peaks: { label: string; left: number }[] = [];
    for (const p of raw) {
      const prev = peaks[peaks.length - 1];
      if (prev && p.left - prev.left < PEAK_GAP) {
        const [m1, y1] = prev.label.split(' ');
        const [m2, y2] = p.label.split(' ');
        prev.label = y1 === y2 ? `${m1}–${m2} ${y2}` : `${prev.label} – ${p.label}`;
        prev.left = (prev.left + p.left) / 2;
      } else peaks.push({ ...p });
    }
    return { events, peaks };
  }, []);

  const shown = active != null ? events.find((e) => e.i === active) ?? null : null;

  function click(ev: (typeof events)[number]) {
    // На дотик: перший тап показує подію, другий відкриває аркуш
    if (lastPointer.current === 'touch' && armed.current !== ev.i) {
      armed.current = ev.i;
      setActive(ev.i);
      return;
    }
    armed.current = null;
    onSelect(ev.stop);
  }

  return (
    <section className="timeline" aria-labelledby="tl-title">
      <div className="timeline__head">
        <h2 id="tl-title" className="label">
          Хронологія
        </h2>
        <p className="timeline__readout" aria-live="polite">
          {shown ? (
            <>
              <span className={`timeline__date timeline__date--${shown.type}`}>{shown.date}</span>
              <span className="timeline__text">{shown.text}</span>
              <span className="timeline__ref">арк. {pad2(shown.stop)} →</span>
            </>
          ) : (
            <span className="muted">
              {data.timeline.length} подій. Наведіть або торкніться штриха; клік показує точку на мапі.
            </span>
          )}
        </p>
      </div>
      <div className="timeline__scroll">
        <div className="timeline__track">
          <div className="timeline__gap" style={{ left: `${pct(GAP[0])}%`, width: `${pct(GAP[1]) - pct(GAP[0])}%` }}>
            <span>табори, заслання, тиша</span>
          </div>

          {peaks.map((p, i) => (
            <span
              key={p.label}
              className={`timeline__peak${i % 2 ? ' timeline__peak--low' : ''}`}
              style={{ left: `${p.left}%` }}
              aria-hidden="true"
            >
              {p.label}
            </span>
          ))}

          <ol className="timeline__events">
            {events.map((e) => (
              <li key={e.i} style={{ left: `${e.left}%`, ['--shift' as string]: e.shift }}>
                <button
                  type="button"
                  className={`tick tick--${e.type}${e.stop === selectedId ? ' is-current' : ''}${active === e.i ? ' is-active' : ''}${filter && e.type !== filter ? ' is-dim' : ''}`}
                  aria-label={`${e.date}: ${e.text}`}
                  onPointerDown={(p) => (lastPointer.current = p.pointerType)}
                  onMouseEnter={() => setActive(e.i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(e.i)}
                  onBlur={() => setActive(null)}
                  onClick={() => click(e)}
                />
              </li>
            ))}
          </ol>

          <div className="timeline__axis timeline__axis--pre" style={{ width: `${PRE_W}%` }} aria-hidden="true" />
          <div className="timeline__axis" style={{ left: `${PRE_W}%` }} aria-hidden="true" />
          {YEARS.map((y) => (
            <span
              key={y}
              className={`timeline__year${y < PRE[1] ? ' timeline__year--pre' : ''}`}
              style={{ left: `${pct(y)}%` }}
              aria-hidden="true"
            >
              {y}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
