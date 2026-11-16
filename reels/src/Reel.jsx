import React from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import logo from './logo.jpg';
import { loadFont as loadDisplay } from '@remotion/google-fonts/BarlowCondensed';
import { loadFont as loadBody } from '@remotion/google-fonts/Inter';

const DISPLAY = loadDisplay('normal', { weights: ['600', '700', '800'], subsets: ['latin', 'latin-ext'] }).fontFamily;
const BODY = loadBody('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin', 'latin-ext'] }).fontFamily;

export const FPS = 30;
// Scene lengths in frames (30 fps): 3 + 5 + 6 + 6 + 5 + 5 = 30 seconds
const SCENES = [
  { id: 'hook', len: 90 },
  { id: 'odds', len: 150 },
  { id: 'ft', len: 180 },
  { id: 'goals', len: 180 },
  { id: 'htft', len: 150 },
  { id: 'outro', len: 150 },
];
export const TOTAL_FRAMES = SCENES.reduce((s, x) => s + x.len, 0);

const COLOR = {
  bg1: '#04100b',
  bg2: '#0d2a1d',
  card: 'rgba(255,255,255,0.06)',
  cardLine: 'rgba(255,255,255,0.12)',
  text: '#f1f6f3',
  muted: '#93ab9e',
  accent: '#3fd38a',
  accentSoft: 'rgba(63,211,138,0.22)',
  bar: 'rgba(255,255,255,0.22)',
};

// ---------- Texts ----------
const TEXT = {
  tr: {
    hook1: 'Aynı oranlarla', hook2: (n) => `${n} maç oynandı.`, hook3: 'Nasıl bittiler?', watch: 'Sona kadar izle',
    oddsTitle: 'bwin oranları', similar: (tol, exact) => (exact ? 'birebir aynı oranlı maç' : `${tol} aralığında benzer maç`),
    ftTitle: 'Maç Sonucu', inMatches: (n) => `${n} maçta`, ftLabels: ['Ev sahibi', 'Beraberlik', 'Deplasman'],
    impliedTitle: 'Oranın ima ettiği', goalsTitle: 'Goller', btts: 'KG Var', over25: '2,5 Üst', over15: '1,5 Üst', over35: '3,5 Üst',
    avg: 'Maç başı ort.', goalsUnit: 'gol', htftTitle: 'İY / MS', htftSub: 'En sık 3 sonuç',
    htftHow: 'Örnek: 0/1 = ilk yarı berabere, maçı ev sahibi kazandı',
    outro1: 'Sence skor', outro2: 'ne olur?', comment: 'Tahminini yorumlara yaz',
    disclaimer: 'Bahis tavsiyesi değildir. Geçmiş sonuçlar istatistiktir, kesinlik değildir. 18+',
    follow: 'Daha fazla analiz için takip etmeyi unutma', draw: '0',
  },
  en: {
    hook1: 'Same odds,', hook2: (n) => `${n} matches.`, hook3: 'How did they end?', watch: 'Watch till the end',
    oddsTitle: 'bwin odds', similar: (tol, exact) => (exact ? 'matches with identical odds' : `similar matches within ${tol}`),
    ftTitle: 'Full-time result', inMatches: (n) => `in ${n} matches`, ftLabels: ['Home', 'Draw', 'Away'],
    impliedTitle: 'Implied by the odds', goalsTitle: 'Goals', btts: 'BTTS', over25: 'Over 2.5', over15: 'Over 1.5', over35: 'Over 3.5',
    avg: 'Avg. per match', goalsUnit: 'goals', htftTitle: 'HT / FT', htftSub: 'Top 3 outcomes',
    htftHow: 'Example: X/1 = draw at half-time, home team won',
    outro1: 'What will', outro2: 'the score be?', comment: 'Drop your prediction below',
    disclaimer: 'Not betting advice. Past results are statistics, not certainties. 18+',
    follow: "Don't forget to follow for more analysis", draw: 'X',
  },
};

// ---------- Helpers ----------
const loc = (lang) => (lang === 'tr' ? 'tr-TR' : 'en-GB');
const pct = (p, lang, digits = 0) => {
  const v = (p * 100).toLocaleString(loc(lang), { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return lang === 'tr' ? `%${v}` : `${v}%`;
};
const odd = (v, lang) => (lang === 'tr' ? v.toFixed(2).replace('.', ',') : v.toFixed(2));
const num = (v, lang, d) => v.toLocaleString(loc(lang), { minimumFractionDigits: d, maximumFractionDigits: d });
const upper = (s, lang) => s.toLocaleUpperCase(loc(lang));
const drawLabel = (k, t) => k.split('/').map((x) => (x === '0' ? t.draw : x)).join('/');

function teamColor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h}, 55%, 42%)`;
}
function monogram(name, lang) {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
  const s = words.length > 1 ? words[0][0] + words[1][0] + (words[2] ? words[2][0] : '') : name.slice(0, 3);
  return upper(s, lang);
}

// Spring that starts at `delay` frames into the current sequence
function useIn(delay = 0, config = { damping: 200 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config });
}

// ---------- Building blocks ----------
const Background = () => {
  const frame = useCurrentFrame();
  const glow = interpolate(Math.sin(frame / 40), [-1, 1], [0.25, 0.45]);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 70% at 50% 18%, ${COLOR.bg2} 0%, ${COLOR.bg1} 70%)` }}>
      {/* faint pitch markings */}
      <svg width="1080" height="1920" style={{ position: 'absolute', opacity: 0.07 }}>
        <g fill="none" stroke="#ffffff" strokeWidth="4">
          <rect x="70" y="140" width="940" height="1640" rx="8" />
          <line x1="70" y1="960" x2="1010" y2="960" />
          <circle cx="540" cy="960" r="170" />
          <rect x="300" y="140" width="480" height="260" />
          <rect x="300" y="1520" width="480" height="260" />
        </g>
      </svg>
      <div style={{ position: 'absolute', left: 140, right: 140, top: 520, height: 700, borderRadius: '50%', background: COLOR.accent, filter: 'blur(220px)', opacity: glow * 0.35 }} />
    </AbsoluteFill>
  );
};

// Story-style segment bar at the top
const ProgressBar = () => {
  const frame = useCurrentFrame();
  let start = 0;
  return (
    // Placed below Instagram's top bar ("Reels" title, camera icon), which covers roughly the top 180 px
    <div style={{ position: 'absolute', top: 200, left: 80, right: 130, display: 'flex', gap: 12 }}>
      {SCENES.map((s) => {
        const p = Math.min(1, Math.max(0, (frame - start) / s.len));
        start += s.len;
        return (
          <div key={s.id} style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
            <div style={{ width: `${p * 100}%`, height: '100%', background: COLOR.text }} />
          </div>
        );
      })}
    </div>
  );
};

// The logo is a round badge on a white square: scale it up inside a circle so the white corners are cut off.
const Logo = ({ size }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flex: 'none', boxShadow: '0 6px 20px rgba(0,0,0,0.4)' }}>
    <Img src={logo} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.16)' }} />
  </div>
);

const BrandTag = ({ brand }) => (
  <div style={{ position: 'absolute', top: 232, left: 80, display: 'flex', alignItems: 'center', gap: 16, fontFamily: BODY, fontWeight: 700, fontSize: 32, color: COLOR.text, letterSpacing: 0.5 }}>
    <Logo size={64} />
    <span>{brand.handle ? `@${brand.handle.replace(/^@/, '')}` : brand.name}</span>
  </div>
);

// Fades each scene in and out
const Scene = ({ len, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, len - 10, len], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const y = interpolate(frame, [0, 14], [40, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  // Padding keeps content inside Instagram's safe zone (caption/buttons cover the bottom and the right edge)
  return <AbsoluteFill style={{ opacity, transform: `translateY(${y}px)`, padding: '330px 130px 400px 80px', fontFamily: BODY, color: COLOR.text }}>{children}</AbsoluteFill>;
};

const Title = ({ children, sub }) => (
  <div style={{ marginBottom: 60 }}>
    <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 120, lineHeight: 1, letterSpacing: 1 }}>{children}</div>
    {sub && <div style={{ fontSize: 40, color: COLOR.muted, marginTop: 16, fontWeight: 500 }}>{sub}</div>}
  </div>
);

const Pill = ({ children, style }) => (
  <div style={{ display: 'inline-block', padding: '14px 30px', borderRadius: 999, background: COLOR.accentSoft, color: COLOR.accent, fontWeight: 700, fontSize: 34, ...style }}>{children}</div>
);

const Team = ({ name, lang, scale = 1 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 380 }}>
    <div style={{
      width: 230, height: 230, borderRadius: '50%', background: teamColor(name), transform: `scale(${scale})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 92,
      border: '6px solid rgba(255,255,255,0.85)', boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
    }}>{monogram(name, lang)}</div>
    <div style={{ marginTop: 26, fontSize: 46, fontWeight: 700, textAlign: 'center', lineHeight: 1.15 }}>{name}</div>
  </div>
);

// ---------- Scenes ----------
const HookScene = ({ p, t, len }) => {
  const frame = useCurrentFrame();
  const a = useIn(0), b = useIn(8), c = useIn(16), d = useIn(30);
  const pulse = interpolate(Math.sin(frame / 5), [-1, 1], [0.6, 1]);
  const line = (s, v, color) => (
    <div style={{ opacity: v, transform: `translateX(${(1 - v) * -60}px)`, color }}>{s}</div>
  );
  return (
    <Scene len={len}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 150, lineHeight: 1.02, letterSpacing: 1 }}>
          {line(t.hook1, a, COLOR.text)}
          {line(t.hook2(p.n.toLocaleString(loc(p.lang))), b, COLOR.text)}
          {line(t.hook3, c, COLOR.accent)}
        </div>
        <div style={{ marginTop: 60, opacity: d, display: 'flex', alignItems: 'center', gap: 18, fontSize: 40, fontWeight: 600, color: COLOR.muted }}>
          <span style={{ opacity: pulse }}>▼</span> {t.watch}
        </div>
      </div>
      <div style={{ opacity: d, background: COLOR.card, border: `2px solid ${COLOR.cardLine}`, borderRadius: 28, padding: '34px 40px' }}>
        <div style={{ fontSize: 50, fontWeight: 700 }}>{p.match.home} <span style={{ color: COLOR.muted }}>–</span> {p.match.away}</div>
        <div style={{ marginTop: 14, fontSize: 34, color: COLOR.muted }}>{p.match.league} · {p.match.date}{p.match.time ? ` · ${p.match.time}` : ''}</div>
      </div>
    </Scene>
  );
};

const OddsScene = ({ p, t, len }) => {
  const frame = useCurrentFrame();
  const teams = useIn(0);
  const labels = ['1', t.draw, '2'];
  const count = Math.round(interpolate(frame, [70, 120], [0, p.n], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }));
  const countIn = useIn(62);
  return (
    <Scene len={len}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 20 }}>
        <Team name={p.match.home} lang={p.lang} scale={teams} />
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 84, color: COLOR.muted, marginTop: 70, opacity: teams }}>VS</div>
        <Team name={p.match.away} lang={p.lang} scale={teams} />
      </div>
      <div style={{ marginTop: 90, fontSize: 40, fontWeight: 600, color: COLOR.muted, textTransform: 'uppercase', letterSpacing: 4 }}>{t.oddsTitle}</div>
      <div style={{ display: 'flex', gap: 30, marginTop: 26 }}>
        {p.odds.map((o, i) => <OddTile key={i} label={labels[i]} value={odd(o, p.lang)} delay={18 + i * 8} />)}
      </div>
      <div style={{ marginTop: 'auto', opacity: countIn, textAlign: 'center' }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 220, lineHeight: 1, color: COLOR.accent }}>{count.toLocaleString(loc(p.lang))}</div>
        <div style={{ fontSize: 44, fontWeight: 600, marginTop: 10 }}>{t.similar(p.tolText, p.exact)}</div>
        <div style={{ fontSize: 32, color: COLOR.muted, marginTop: 10 }}>{p.filterText}</div>
      </div>
    </Scene>
  );
};

const OddTile = ({ label, value, delay }) => {
  const v = useIn(delay, { damping: 12, stiffness: 160 });
  return (
    <div style={{ flex: 1, background: COLOR.card, border: `2px solid ${COLOR.cardLine}`, borderRadius: 28, padding: '28px 0', textAlign: 'center', transform: `scale(${0.6 + 0.4 * v})`, opacity: Math.min(1, v * 1.5) }}>
      <div style={{ fontSize: 40, color: COLOR.muted, fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: DISPLAY, fontSize: 120, fontWeight: 800, lineHeight: 1.05 }}>{value}</div>
    </div>
  );
};

const FtScene = ({ p, t, len }) => {
  const frame = useCurrentFrame();
  const labels = ['1', t.draw, '2'];
  const max = Math.max(...p.ft);
  const grow = interpolate(frame, [15, 75], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const foot = useIn(85);
  return (
    <Scene len={len}>
      <Title sub={t.inMatches(p.n.toLocaleString(loc(p.lang)))}>{t.ftTitle}</Title>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 50, padding: '0 20px' }}>
        {p.ft.map((v, i) => {
          const top = v === max;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 96, color: top ? COLOR.accent : COLOR.text, opacity: grow }}>{pct(v * grow, p.lang)}</div>
              <div style={{ width: '100%', height: Math.max(6, (v / max) * 470 * grow), borderRadius: '24px 24px 6px 6px', background: top ? COLOR.accent : COLOR.bar, marginTop: 14 }} />
              <div style={{ marginTop: 22, fontFamily: DISPLAY, fontWeight: 800, fontSize: 90 }}>{labels[i]}</div>
              <div style={{ fontSize: 32, color: COLOR.muted, fontWeight: 600 }}>{t.ftLabels[i]}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 50, opacity: foot, fontSize: 34, color: COLOR.muted, textAlign: 'center' }}>
        {t.impliedTitle}: {p.implied.map((v, i) => `${labels[i]} ${pct(v, p.lang)}`).join('  ·  ')}
      </div>
    </Scene>
  );
};

const Ring = ({ value, label, delay, lang }) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [delay, delay + 50], [0, value], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const r = 170, c = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: 400, height: 400 }}>
        <svg width="400" height="400" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="200" cy="200" r={r} stroke="rgba(255,255,255,0.12)" strokeWidth="34" fill="none" />
          <circle cx="200" cy="200" r={r} stroke={COLOR.accent} strokeWidth="34" fill="none" strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 116 }}>{pct(v, lang)}</div>
      </div>
      <div style={{ marginTop: 20, fontSize: 48, fontWeight: 700 }}>{label}</div>
    </div>
  );
};

const GoalsScene = ({ p, t, len }) => {
  const stats = useIn(90);
  const chip = (label, val) => (
    <div style={{ flex: 1, background: COLOR.card, border: `2px solid ${COLOR.cardLine}`, borderRadius: 24, padding: '26px 10px', textAlign: 'center' }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 84, lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: 30, color: COLOR.muted, fontWeight: 600, marginTop: 8 }}>{label}</div>
    </div>
  );
  return (
    <Scene len={len}>
      <Title sub={t.inMatches(p.n.toLocaleString(loc(p.lang)))}>{t.goalsTitle}</Title>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 30 }}>
        <Ring value={p.btts} label={t.btts} delay={12} lang={p.lang} />
        <Ring value={p.ou25} label={t.over25} delay={30} lang={p.lang} />
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', gap: 24, opacity: stats, transform: `translateY(${(1 - stats) * 30}px)` }}>
        {chip(t.over15, pct(p.ou15, p.lang))}
        {chip(t.over35, pct(p.ou35, p.lang))}
        {chip(`${t.avg} ${t.goalsUnit}`, num(p.avgGoals, p.lang, 2))}
      </div>
    </Scene>
  );
};

const HtftScene = ({ p, t, len }) => {
  const frame = useCurrentFrame();
  const max = Math.max(...p.htft.map((x) => x.p), 0.0001);
  return (
    <Scene len={len}>
      <Title sub={`${t.htftSub} · ${t.inMatches(p.htN.toLocaleString(loc(p.lang)))}`}>{t.htftTitle}</Title>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 56 }}>
        {p.htft.map((x, i) => {
          const d = 15 + i * 14;
          const v = interpolate(frame, [d, d + 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
          return (
            <div key={x.k} style={{ display: 'flex', alignItems: 'center', gap: 34, opacity: Math.min(1, v * 2) }}>
              <div style={{ width: 90, height: 90, borderRadius: 24, background: i === 0 ? COLOR.accent : COLOR.card, color: i === 0 ? COLOR.bg1 : COLOR.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 60 }}>{i + 1}</div>
              <div style={{ width: 220, fontFamily: DISPLAY, fontWeight: 800, fontSize: 110 }}>{drawLabel(x.k, t)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ height: 34, borderRadius: 17, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <div style={{ width: `${(x.p / max) * 100 * v}%`, height: '100%', borderRadius: 17, background: i === 0 ? COLOR.accent : COLOR.bar }} />
                </div>
              </div>
              <div style={{ width: 200, textAlign: 'right', fontFamily: DISPLAY, fontWeight: 800, fontSize: 84, color: i === 0 ? COLOR.accent : COLOR.text }}>{pct(x.p * v, p.lang)}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 32, color: COLOR.muted, textAlign: 'center' }}>{t.htftHow}</div>
    </Scene>
  );
};

const OutroScene = ({ p, t, len }) => {
  const a = useIn(0), b = useIn(14), c = useIn(30);
  return (
    <Scene len={len}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 160, lineHeight: 1, opacity: a }}>{t.outro1}</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 160, lineHeight: 1, color: COLOR.accent, opacity: b }}>{t.outro2}</div>
        <div style={{ marginTop: 50, opacity: c }}><Pill>{t.comment}</Pill></div>
      </div>
      <div style={{ opacity: c, borderTop: `2px solid ${COLOR.cardLine}`, paddingTop: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <Logo size={150} />
          <div>
            <div style={{ fontSize: 50, fontWeight: 700 }}>{p.brand.handle ? `@${p.brand.handle.replace(/^@/, '')}` : p.brand.name}</div>
            <div style={{ fontSize: 34, color: COLOR.accent, fontWeight: 600, marginTop: 8 }}>{t.follow}</div>
          </div>
        </div>
        <div style={{ fontSize: 28, color: COLOR.muted, marginTop: 30, lineHeight: 1.4 }}>{t.disclaimer}</div>
      </div>
    </Scene>
  );
};

const SCENE_COMPONENTS = { hook: HookScene, odds: OddsScene, ft: FtScene, goals: GoalsScene, htft: HtftScene, outro: OutroScene };

export const Reel = (props) => {
  const t = TEXT[props.lang] || TEXT.en;
  let from = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.bg1 }}>
      <Background />
      {SCENES.map((s) => {
        const C = SCENE_COMPONENTS[s.id];
        const el = (
          <Sequence key={s.id} from={from} durationInFrames={s.len} name={s.id}>
            <C p={props} t={t} len={s.len} />
          </Sequence>
        );
        from += s.len;
        return el;
      })}
      <ProgressBar />
      <BrandTag brand={props.brand} />
    </AbsoluteFill>
  );
};
