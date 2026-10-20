import { cv } from '../content/cv';
import { achievements, CAREER_START, inventory, player, rarity } from '../content/game';
import { about, arsenal, education, EMAIL, experience, languages, LINKS } from '../content/site';
import { toolIconURL } from '../game/art/toolIcons';
import { asset } from '../lib/media';

const years = Math.floor((Date.now() - CAREER_START.getTime()) / (365.25 * 864e5));

/* The CV as a game character sheet: same facts as the professional one, in pixel style. */
export function PlayerCv() {
  const levels = [...experience].reverse();
  return (
    <div className="pcv-wrap">
      <article className="pcv" aria-label="CV, Player Edition">
        <header className="pcv-head">
          <img className="pcv-portrait" src={asset('media/game/portrait-long.png')} alt="Pixel portrait of Alankrit Thapa" />
          <div className="pcv-id">
            <div className="pcv-kicker">Player 1 · Character sheet</div>
            <h1 className="pcv-name">Alankrit <span>Thapa</span></h1>
            <div className="pcv-class">{cv.subtitle}</div>
            <div className="pcv-meta">
              <span className="pcv-lv">LV {years}</span>
              <span>{years}+ years experience</span>
              <span>{cv.location}</span>
              <span className="pcv-ok">● {player.status.split(' — ')[0]}</span>
            </div>
          </div>
          <dl className="pcv-contact">
            <div><dt>Email</dt><dd><a href={`mailto:${EMAIL}`}>{EMAIL}</a></dd></div>
            <div><dt>Behance</dt><dd><a href={LINKS.behance}>behance.net/oran6ie</a></dd></div>
            <div><dt>LinkedIn</dt><dd><a href={LINKS.linkedin}>in/alankritthapa</a></dd></div>
            <div><dt>Portfolio</dt><dd><a href="https://oran6ie.github.io">oran6ie.github.io</a></dd></div>
          </dl>
        </header>

        <section className="pcv-box pcv-bio">
          <h2>Bio</h2>
          <p>{cv.bio}</p>
          <div className="pcv-tags">{about.tags.map((t) => <span key={t}>{t}</span>)}</div>
        </section>

        <div className="pcv-cols">
          <section className="pcv-box">
            <h2>Quest log · Experience</h2>
            <ol className="pcv-quests">
              {levels.map((x, i) => (
                <li key={x.role + x.from} className={x.current ? 'current' : ''}>
                  <span className="pcv-stage">1-{i + 1}</span>
                  <div>
                    <div className="pcv-when">{x.from} — {x.to}{x.current ? ' · Current' : ''}</div>
                    <div className="pcv-role">{x.role}</div>
                    <div className="pcv-where">{x.company.split(' · ')[0]} · {x.location}</div>
                    <p>{x.desc}</p>
                  </div>
                </li>
              )).reverse()}
              <li className="tutorial">
                <span className="pcv-stage">0-0</span>
                <div>
                  <div className="pcv-when">{education.from} — {education.to} · Tutorial</div>
                  <div className="pcv-role">{education.degree} {education.field}</div>
                  <div className="pcv-where">{education.school} · {education.location}</div>
                </div>
              </li>
            </ol>
          </section>

          <div className="pcv-side">
            <section className="pcv-box">
              <h2>Inventory · Tools</h2>
              <ul className="pcv-inv">
                {arsenal.map((a) => {
                  const r = rarity(a.pct);
                  return (
                    <li key={a.name} className={r.cls}>
                      <img src={toolIconURL(inventory[a.name].icon)} alt="" width={30} height={30} />
                      <div>
                        <div className="pcv-tool">{a.name} <span>{r.label}</span></div>
                        <div className="pcv-bar"><i style={{ width: `${a.pct}%` }} /></div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="pcv-box">
              <h2>Achievements</h2>
              <ul className="pcv-ach">
                {achievements.filter((a) => !a.locked).map((a) => (
                  <li key={a.name}><b>★ {a.name === 'Veteran' ? `Veteran · ${years}+ yrs` : a.name}</b> {a.desc}</li>
                ))}
              </ul>
            </section>

            <section className="pcv-box">
              <h2>Languages</h2>
              <ul className="pcv-langs">{languages.map((l) => <li key={l.name}><span>{l.name}</span><span>{l.level}</span></li>)}</ul>
            </section>
          </div>
        </div>

        <footer className="pcv-foot">
          <span>Press START at oran6ie.github.io to play the full portfolio</span>
          <span>© {new Date().getFullYear()} Alankrit Thapa</span>
        </footer>
      </article>
    </div>
  );
}
