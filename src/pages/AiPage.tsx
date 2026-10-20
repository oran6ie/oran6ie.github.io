import { useRef, useState } from 'react';
import { AiProjectBlock, type MediaItem } from '../components/ai/AiProjectBlock';
import { BackToTop, Ticker } from '../components/shared/Bits';
import { CrtOverlay } from '../components/shared/CrtOverlay';
import { Cursor } from '../components/shared/Cursor';
import { aiBio, aiProjects, aiTicker } from '../content/aiProjects';
import { LINKS, SITE_VERSION } from '../content/site';
import { useEscape, useNavHidden } from '../lib/hooks';
import { asset, isVideoFile, markSkipIntro, replayClass } from '../lib/media';

const BASE = import.meta.env.BASE_URL;
const CURSOR_TARGETS = 'a,button,.img-cell,.stage-header';

const CHANNELS = [
  { label: 'About', href: `${BASE}#about` },
  { label: 'Work', href: `${BASE}#work` },
  { label: 'Experience', href: `${BASE}#experience` },
  { label: 'AI Works', href: `${BASE}ai/`, current: true },
  { label: 'Contact', href: `${BASE}#contact` },
];

function Lightbox({ item, onClose }: { item: MediaItem | null; onClose: () => void }) {
  useEscape(onClose, item !== null);
  if (!item) return null;
  return (
    <div id="lightbox" className="open" onClick={onClose}>
      <span className="lb-close" onClick={onClose}>✕ &nbsp;CLOSE</span>
      {isVideoFile(item.src)
        ? <video src={asset(item.src)} autoPlay muted loop playsInline onClick={(e) => e.stopPropagation()} />
        : <img src={asset(item.src)} alt="" onClick={(e) => e.stopPropagation()} />}
    </div>
  );
}

export function AiPage() {
  const navHidden = useNavHidden();
  const flashRef = useRef<HTMLDivElement>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState<MediaItem | null>(null);

  return (
    <>
      <CrtOverlay />
      <Cursor hoverSelector={CURSOR_TARGETS} />
      <div id="nav-flash" ref={flashRef} />
      <Lightbox item={zoom} onClose={() => setZoom(null)} />

      <div id="app">
        <nav id="main-nav" className={navHidden ? 'hide' : ''}>
          <a href={BASE} className="nav-logo" onClick={markSkipIntro}>AT<span>·</span></a>
          <div className="nav-channels">
            {CHANNELS.map((ch, i) => (
              <a
                key={ch.label}
                href={ch.href}
                className={ch.current ? 'nav-ch active' : 'nav-ch'}
                onClick={() => { replayClass(flashRef.current, 'go'); if (!ch.current) markSkipIntro(); }}
              >
                <span className="nav-ch-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="nav-ch-label">{ch.label}</span>
              </a>
            ))}
          </div>
          <div className="nav-right">
            <div className="nav-status"><div className="nav-dot" /><span>Available</span></div>
            <a href={BASE} className="btn-cv" onClick={markSkipIntro}>← Main Portfolio</a>
          </div>
        </nav>

        <section id="hero">
          <Ticker items={aiTicker} dot="·" />
          <div className="hero-meta">
            <span className="i-rec">REC</span>
            <span className="hero-meta-sep" />
            <span className="hl">CH · AI</span>
            <span className="hero-meta-sep" />
            <span>Input · Composite</span>
            <span className="hero-meta-sep" />
            <span>Format · AI-2026-KOL</span>
          </div>
          <h1 className="hero-name">AI<br /><em>Works</em></h1>
          <div className="hero-bottom">
            <p className="hero-bio">{aiBio}</p>
            <div className="hero-stats">
              <div>
                <div className="hero-stat-v">{String(aiProjects.length).padStart(2, '0')}</div>
                <div className="hero-stat-k">AI Projects</div>
              </div>
              <div>
                <div className="hero-stat-v">'25</div>
                <div className="hero-stat-k">Active Since</div>
              </div>
            </div>
          </div>
          <a className="hero-back-link" href={BASE} onClick={markSkipIntro} aria-label="Click here to go back to my main portfolio">
            <span className="hero-back-copy">
              <span className="hero-back-kicker">Back to Main Portfolio</span>
              <span className="hero-back-title">Click Here to Go Back to My Main Portfolio</span>
            </span>
            <span className="hero-back-arrow" aria-hidden="true">↖</span>
          </a>
          <div className="pipeline-legend">
            {['REF IMAGES', 'AI GENERATE', 'MOTION', 'FINAL EDIT'].map((s, i) => (
              <div key={s} className={`pl-step s${i + 1}`}><span className="sn">STAGE 0{i + 1}</span>{s}</div>
            ))}
          </div>
        </section>

        <section id="projects">
          <div className="sec-eyebrow">
            <span className="sec-eyebrow-num">——</span>
            <span className="sec-eyebrow-label">AI Pipeline Projects</span>
            <div className="sec-eyebrow-rule" />
          </div>
          {aiProjects.map((p, i) => (
            <AiProjectBlock
              key={p.title + p.titleItalic}
              p={p}
              index={i}
              open={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? null : i)}
              onZoom={setZoom}
            />
          ))}
        </section>

        <footer>
          <span className="footer-txt">© {new Date().getFullYear()} Alankrit Thapa &nbsp;·&nbsp; AI Works &nbsp;·&nbsp; oran6ie.github.io/ai</span>
          <div className="footer-links">
            <span id="site-version">{SITE_VERSION}</span>
            <a href={BASE} onClick={markSkipIntro}>← Main Portfolio</a>
            <a href={LINKS.behance} target="_blank" rel="noopener noreferrer">Behance</a>
            <a href={LINKS.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          </div>
        </footer>

        <BackToTop />
      </div>
    </>
  );
}
