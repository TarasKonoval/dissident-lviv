import { useEffect, useState, type RefObject } from 'react';

/** Тонка смужка під шапкою: скільки тексту вже прочитано. */
export default function ReadingProgress({ target }: { target: RefObject<HTMLElement | null> }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = target.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - innerHeight;
      setP(total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    addEventListener('scroll', on, { passive: true });
    addEventListener('resize', on);
    return () => {
      removeEventListener('scroll', on);
      removeEventListener('resize', on);
      cancelAnimationFrame(raf);
    };
  }, [target]);
  return (
    <div className="progress" role="progressbar" aria-label="Прочитано" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}>
      <span style={{ transform: `scaleX(${p})` }} />
    </div>
  );
}
