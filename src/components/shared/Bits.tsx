import { Fragment } from 'react';
import { useScrolledPast } from '../../lib/hooks';

export function BackToTop() {
  const visible = useScrolledPast(500);
  return (
    <button
      id="back-top"
      title="Back to top"
      className={visible ? 'visible' : ''}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      ↑
    </button>
  );
}

/* Endless scrolling strip — the list is rendered twice so the loop is seamless. */
export function Ticker({ items, dot = '•' }: { items: string[]; dot?: string }) {
  const run = items.map((item, i) => (
    <Fragment key={i}>
      {item}
      <span className="tdot">{dot}</span>
    </Fragment>
  ));
  return (
    <div className="hero-ticker">
      <div className="hero-ticker-track">
        {run}
        {run}
      </div>
    </div>
  );
}

export function SectionEyebrow({ label, num, reveal = true }: { label: string; num?: string; reveal?: boolean }) {
  return (
    <div className={reveal ? 'sec-eyebrow reveal' : 'sec-eyebrow'}>
      <div className="sec-eyebrow-label">{label}</div>
      <div className="sec-eyebrow-rule" />
      {num && <div className="sec-eyebrow-num">{num}</div>}
    </div>
  );
}
