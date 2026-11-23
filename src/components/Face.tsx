import { initials, portraitOf } from '../data';

interface Props {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

/** Портрет людини (ч/б) або монограма, якщо вільного фото немає. */
export default function Face({ name, size = 'md' }: Props) {
  const p = portraitOf(name);
  if (!p) {
    return (
      <span className={`face face--${size} face--none`} aria-hidden="true">
        <span>{initials(name)}</span>
      </span>
    );
  }
  return <img className={`face face--${size}`} src={p.src} alt={p.alt} loading="lazy" decoding="async" />;
}
