import { useState, type ReactNode } from 'react';
import type { AiProject, Media, Tag } from '../../content/aiProjects';
import { useInView } from '../../lib/hooks';
import { LoopClip } from '../shared/LoopClip';
import { VideoEmbed } from '../shared/VideoEmbed';

export type MediaItem = { src: string; poster?: string };
const toItem = (m: Media): MediaItem => (typeof m === 'string' ? { src: m } : m);

function TagChip({ tag }: { tag: Tag }) {
  return typeof tag === 'string'
    ? <span className="p-tag">{tag}</span>
    : <span className={`p-tag ${tag.color}`}>{tag.label}</span>;
}

function ImgGrid({ media, max, label, cols, onZoom }: {
  media: Media[]; max: number; label: string; cols: string; onZoom: (m: MediaItem) => void;
}) {
  const items = media.slice(0, max).map(toItem);
  if (items.length === 0) {
    return (
      <div className="img-grid c2">
        {[1, 2].map((n) => (
          <div key={n} className="img-cell">
            <div className="img-placeholder"><span className="ph-plus">+</span><span className="ph-txt">Image coming soon</span></div>
            <div className="img-cell-overlay" />
            <span className="img-cell-label">{label} · 0{n}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={`img-grid ${cols}`}>
      {items.map((m, i) => (
        <div key={m.src} className="img-cell" onClick={() => onZoom(m)}>
          <LoopClip src={m.src} poster={m.poster} alt={`${label} ${i + 1}`} />
          <div className="img-cell-overlay" />
          <span className="img-cell-label">{label} · 0{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

function Stage({ n, label, subtitle, note, children }: {
  n: number; label: string; subtitle: string; note?: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`stage s${n}${open ? ' open' : ''}`}>
      <div className="stage-header" onClick={() => setOpen(!open)}>
        <span className="stage-num">0{n}</span>
        <span className="stage-label">{label}</span>
        <span className="stage-title-txt">{subtitle}</span>
        <span className="stage-arrow">▾</span>
      </div>
      <div className="stage-body">
        <div className="stage-inner">
          {children}
          {note && <div className="stage-note">{note}</div>}
        </div>
      </div>
    </div>
  );
}

type Props = {
  p: AiProject;
  index: number;
  open: boolean;
  onToggle: () => void;
  onZoom: (m: MediaItem) => void;
};

export function AiProjectBlock({ p, index, open, onToggle, onZoom }: Props) {
  const [ref, visible] = useInView<HTMLDivElement>();
  const preview = [p.motionClips[0], p.genImages[0], p.refImages[0]].find(Boolean);
  const previewItem = preview ? toItem(preview) : null;
  const refCols = p.refImages.length >= 4 ? 'c4' : p.refImages.length === 3 ? 'c3' : 'c2';
  const genCols = p.genImages.length >= 3 ? 'c3' : 'c2';

  return (
    <div ref={ref} className={`project-block${visible ? ' visible' : ''}${open ? ' open' : ''}`}>
      <button className="project-summary" type="button" onClick={onToggle} aria-expanded={open}>
        <div className="proj-main">
          <div className="proj-thumb">
            {previewItem
              ? <LoopClip src={previewItem.src} poster={previewItem.poster} alt={`${p.title} preview`} />
              : <div className="proj-thumb-placeholder">Preview Soon</div>}
          </div>
          <div className="proj-copy">
            <div className="proj-index">PROJECT · {String(index + 1).padStart(2, '0')}</div>
            <h2 className="proj-title">{p.title}<br /><em>{p.titleItalic}</em></h2>
            <div className="proj-click-hint">Click to view project</div>
            <div className="proj-tags">{p.tags.map((t, i) => <TagChip key={i} tag={t} />)}</div>
          </div>
        </div>
        <div className="proj-summary-side">
          <p className="proj-desc">{p.desc}</p>
          <span className="project-toggle-arrow">▾</span>
        </div>
      </button>

      <div className="project-body">
        <div className="project-body-inner">
          <div className="pipeline">
            <Stage n={1} label="REF IMAGES" subtitle="Source / Reference Material" note={p.refNote}>
              <ImgGrid media={p.refImages} max={4} label="REF" cols={refCols} onZoom={onZoom} />
            </Stage>
            <div className="stage-connector">→ GENERATE</div>
            <Stage n={2} label="AI GENERATE" subtitle="Studio-Grade Stills from Reference" note={p.genNote}>
              <ImgGrid media={p.genImages} max={3} label="GEN" cols={genCols} onZoom={onZoom} />
            </Stage>
            <div className="stage-connector">→ MOTION</div>
            <Stage n={3} label="MOTION" subtitle="AI-Animated Video Clips" note={p.motionNote}>
              <ImgGrid media={p.motionClips} max={2} label="MOT" cols="c2" onZoom={onZoom} />
            </Stage>
            <div className="stage-connector">→ FINAL CUT</div>
            <Stage n={4} label="FINAL EDIT" subtitle="Complete Edited Video" note={p.finalNote}>
              <div className="video-wrap">
                {p.finalVideo ? <VideoEmbed value={p.finalVideo} /> : (
                  <div className="video-placeholder">
                    <div className="play-btn">▶</div>
                    <span className="play-label">Final video coming soon</span>
                  </div>
                )}
              </div>
            </Stage>
          </div>
        </div>
      </div>
    </div>
  );
}
