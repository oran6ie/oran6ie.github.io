import { useEffect } from 'react';
import { aiProjects } from '../content/aiProjects';
import { player } from '../content/game';
import { projects } from '../content/projects';
import { about, arsenal, education, experience, languages, LINKS } from '../content/site';
import { LoopClip } from '../components/shared/LoopClip';
import { asset } from '../lib/media';
import { sfx } from '../lib/sfx';
import { yearsActive } from './panels';
import { go } from './route';
import { CopyEmailButton } from './ui';

const BASE = import.meta.env.BASE_URL;

/* Recruiter mode: everything on one readable page, no game required. */
export function QuickView() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const yrs = yearsActive();

  return (
    <div className="quick">
      <header className="quick-head px-window">
        <img className="pixel-sprite quick-portrait" src={asset('media/game/portrait-long.png')} alt="Pixel portrait of Alankrit" />
        <div className="quick-id">
          <h1 className="quick-name">Alankrit Thapa</h1>
          <p className="quick-role">{player.title}</p>
          <p className="quick-meta">{player.base} · {yrs}+ years · <span className="status-ok">● Available</span></p>
        </div>
        <div className="quick-actions">
          <CopyEmailButton>Email me</CopyEmailButton>
          <a className="px-btn ghost" href={`${BASE}cv/`}>View CV</a>
          <button className="px-btn ghost" onClick={() => { sfx.warm(); sfx.start(); go('hub'); }}>Play the portfolio</button>
        </div>
      </header>

      <section className="quick-section">
        <h2 className="px-h2">Summary</h2>
        <p className="body-text">{about.text}</p>
        <div className="tag-row">{about.tags.map((t) => <span key={t} className="px-tag">{t}</span>)}</div>
      </section>

      <section className="quick-section">
        <h2 className="px-h2">Selected work</h2>
        <div className="quick-work">
          {projects.map((p) => (
            <a key={p.title} className="quick-card" href={p.url} target="_blank" rel="noopener noreferrer">
              <div className="quest-media"><LoopClip src={p.preview} poster={p.poster} alt={p.title} /></div>
              <div className="quest-info">
                <div className="quest-title">{p.title}</div>
                <div className="quest-type">{p.type}</div>
                {p.reward && <div className="quest-reward">★ {p.reward}</div>}
              </div>
            </a>
          ))}
          {aiProjects.map((p) => (
            <a key={p.title + p.titleItalic} className="quick-card" href={`${BASE}ai/`}>
              <div className="quest-media">
                {p.motionClips[0] && <LoopClip src={typeof p.motionClips[0] === 'string' ? p.motionClips[0] : p.motionClips[0].src} alt={p.title} />}
              </div>
              <div className="quest-info">
                <div className="quest-title">{p.title} {p.titleItalic}</div>
                <div className="quest-type">AI-assisted campaign</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      <div className="quick-cols">
        <section className="quick-section">
          <h2 className="px-h2">Experience</h2>
          <ul className="quick-list">
            {experience.map((x) => (
              <li key={x.role + x.from}>
                <div className="quick-li-head"><b>{x.role}</b><span>{x.from} — {x.to}</span></div>
                <div className="quick-li-sub">{x.company}</div>
                <p className="body-text small">{x.desc}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="quick-section">
          <h2 className="px-h2">Tools</h2>
          <ul className="quick-tools">
            {arsenal.map((a) => <li key={a.name}><span>{a.name}</span><span className="quick-bar"><span style={{ width: `${a.pct}%` }} /></span></li>)}
          </ul>
          <h2 className="px-h2">Education</h2>
          <p className="body-text"><b>{education.degree} {education.field}</b><br />{education.school} · {education.from} — {education.to}</p>
          <h2 className="px-h2">Languages</h2>
          <p className="body-text">{languages.map((l) => `${l.name} (${l.level})`).join(' · ')}</p>
          <h2 className="px-h2">Links</h2>
          <div className="link-row">
            <a className="px-link" href={LINKS.behance} target="_blank" rel="noopener noreferrer">Behance</a>
            <a className="px-link" href={LINKS.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <a className="px-link" href={LINKS.youtube} target="_blank" rel="noopener noreferrer">YouTube</a>
          </div>
        </section>
      </div>
    </div>
  );
}
