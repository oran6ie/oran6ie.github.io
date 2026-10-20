import { useEffect, useState } from 'react';
import { cv } from '../content/cv';
import { about, education, EMAIL, languages, LINKS } from '../content/site';
import { markSkipIntro } from '../lib/media';
import { PlayerCv } from './PlayerCv';

function goBack() {
  // Returning to the portfolio shouldn't replay the intro screen
  markSkipIntro();
  const cameFromSite = document.referrer.startsWith(location.origin);
  if (cameFromSite && history.length > 1) history.back();
  else location.href = import.meta.env.BASE_URL;
}

type Edition = 'pro' | 'player';
const editionFromUrl = (): Edition => (new URLSearchParams(location.search).get('style') === 'player' ? 'player' : 'pro');

/* Two CVs: the professional one (default, for recruiters) and the Player Edition. */
export function CvPage() {
  const [edition, setEdition] = useState<Edition>(editionFromUrl);
  const choose = (e: Edition) => {
    setEdition(e);
    const url = new URL(location.href);
    if (e === 'player') url.searchParams.set('style', 'player'); else url.searchParams.delete('style');
    history.replaceState(null, '', url);
  };
  useEffect(() => { document.title = edition === 'player' ? 'Alankrit Thapa — CV (Player Edition)' : 'Alankrit Thapa — CV'; }, [edition]);
  return (
    <>
      <div className="cv-toolbar">
        <button className="print-btn" onClick={goBack}>← Back</button>
        <div className="cv-toggle" role="radiogroup" aria-label="CV edition">
          <button role="radio" aria-checked={edition === 'pro'} className={edition === 'pro' ? 'on' : ''} onClick={() => choose('pro')}>Professional</button>
          <button role="radio" aria-checked={edition === 'player'} className={edition === 'player' ? 'on' : ''} onClick={() => choose('player')}>Player Edition</button>
        </div>
        <button className="print-btn" onClick={() => window.print()}>⎙ Print / Save PDF</button>
      </div>
      {edition === 'pro' ? <ProCv /> : <PlayerCv />}
    </>
  );
}

function ProCv() {
  return (
    <>
      <div id="scanlines" /><div id="vignette" /><div id="crt-beam" />

      <div className="page">
        <aside>
          <div>
            <div className="s-mono">{cv.mono}<em>.</em></div>
            <div className="s-role">{cv.role}</div>
          </div>
          <div className="s-section">
            <div className="s-lbl">Contact</div>
            <div className="s-item"><div className="s-key">Location</div><div className="s-val">{cv.location}</div></div>
            <div className="s-item"><div className="s-key">Email</div><div className="s-val"><a href={`mailto:${EMAIL}`}>{EMAIL}</a></div></div>
            <div className="s-item"><div className="s-key">Behance</div><div className="s-val"><a href={LINKS.behance}>behance.net/oran6ie</a></div></div>
            <div className="s-item"><div className="s-key">LinkedIn</div><div className="s-val"><a href={LINKS.linkedin}>in/alankritthapa</a></div></div>
            <div className="s-item"><div className="s-key">YouTube</div><div className="s-val"><a href={LINKS.youtube}>@oran6ie</a></div></div>
          </div>
          <div className="s-section">
            <div className="s-lbl">Arsenal</div>
            {cv.skills.map((s) => (
              <div key={s.name} className="sk-item">
                <div className="sk-name">{s.name}</div>
                <div className="sk-bar"><div className="sk-fill" style={{ width: `${s.pct}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="s-section">
            <div className="s-lbl">Languages</div>
            {languages.map((l) => (
              <div key={l.name} className="lang-r"><span className="lang-n">{l.name}</span><span className="lang-l">{l.level}</span></div>
            ))}
          </div>
          <div className="s-section">
            <div className="s-lbl">Disciplines</div>
            <div className="tag-w">{about.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
          </div>
        </aside>

        <main>
          <div className="m-hdr">
            <div className="m-eye">{cv.eyebrow}</div>
            <div className="m-name">{cv.first}<br /><em>{cv.last}</em></div>
            <div className="m-sub">{cv.subtitle}</div>
            <p className="m-bio">{cv.bio}</p>
          </div>
          <div className="m-sec">
            <div className="m-shead"><div className="m-slbl">Experience</div><div className="m-srule" /></div>
            {cv.experience.map((x) => (
              <div key={x.role + x.from} className="xp">
                <div className="xp-d">{x.from.toUpperCase()}<br />— {x.to.toUpperCase()}</div>
                <div>
                  <div className="xp-r">{x.role}</div>
                  <div className="xp-c">{x.where}</div>
                  <p className="xp-p">{x.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="m-sec">
            <div className="m-shead"><div className="m-slbl">Education</div><div className="m-srule" /></div>
            <div className="edu-r">
              <div className="edu-d">{education.from.toUpperCase()}<br />— {education.to.toUpperCase()}</div>
              <div>
                <div className="edu-deg">{education.degree} {education.field}</div>
                <div className="edu-s">{education.school}</div>
                <div className="edu-l">{education.location}</div>
              </div>
            </div>
          </div>
          <div className="fbar">
            <span>behance.net/oran6ie · linkedin.com/in/alankritthapa · {EMAIL}</span>
            <span>© {new Date().getFullYear()} Alankrit Thapa</span>
          </div>
        </main>
      </div>
    </>
  );
}
