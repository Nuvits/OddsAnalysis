'use strict';
// Renders an Instagram Reel (Remotion template in ./reels) from analysis numbers.
// Used by server.js (local "Create Reels video" button) and by the "Make reel" GitHub workflow.
// CLI: node reelrender.js <props.json> <output-folder>
//   props.json holds one reel or an array of reels (one per language, e.g. English and Turkish).
//
// Branding (name, Instagram handle) per language comes from reels/brand.json; the logos are reels/src/logo-<lang>.jpg.
// Background music: a track from ./music (ODDS_MUSIC_DIR) is mixed in. With several tracks, the match decides which one,
// so the language versions of one match share a track. Without any track the video is silent.
//
// Remotion is installed outside the project (ODDS_REELS_ENGINE, default ~/.odds-analysis/reels-engine)
// because node_modules does not work on synced drives such as Google Drive.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const REELS_DIR = path.join(__dirname, 'reels');
const ENGINE = process.env.ODDS_REELS_ENGINE || path.join(os.homedir(), '.odds-analysis', 'reels-engine');
const MUSIC_DIR = process.env.ODDS_MUSIC_DIR || path.join(__dirname, 'music');
const LANGS = ['en', 'tr'];

function run(cmd, args, cwd, onOutput) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, shell: process.platform === 'win32', windowsHide: true });
    let tail = '';
    const take = (d) => { const s = d.toString(); tail = (tail + s).slice(-4000); if (onOutput) onOutput(s); };
    p.stdout.on('data', take); p.stderr.on('data', take);
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args[0]} failed (exit ${code}): ${tail.replace(/\x1b\[[0-9;]*m/g, '').trim().split('\n').slice(-3).join(' | ')}`))));
  });
}

// Installs Remotion into the engine folder when missing or outdated, then copies the template source.
async function ensureEngine(onProgress) {
  fs.mkdirSync(ENGINE, { recursive: true });
  const wanted = JSON.parse(fs.readFileSync(path.join(REELS_DIR, 'package.json'), 'utf8'));
  let installed = null;
  try { installed = JSON.parse(fs.readFileSync(path.join(ENGINE, 'node_modules', 'remotion', 'package.json'), 'utf8')).version; } catch { /* not installed */ }
  fs.copyFileSync(path.join(REELS_DIR, 'package.json'), path.join(ENGINE, 'package.json'));
  if (installed !== wanted.dependencies.remotion) {
    onProgress({ phase: 'installing', done: 0, total: 0 });
    await run('npm', ['install', '--no-fund', '--no-audit'], ENGINE);
  }
  fs.rmSync(path.join(ENGINE, 'src'), { recursive: true, force: true });
  fs.cpSync(path.join(REELS_DIR, 'src'), path.join(ENGINE, 'src'), { recursive: true });
}

const DEFAULT_BRAND = { en: { name: 'Odds Memory', handle: '' }, tr: { name: 'Oran Hafızası', handle: '' } };
function loadBrand(lang) {
  let b = {};
  try { b = JSON.parse(fs.readFileSync(path.join(REELS_DIR, 'brand.json'), 'utf8')); } catch { /* defaults */ }
  return { ...DEFAULT_BRAND[lang], ...(b[lang] || {}) };
}

// Picks a music track for the match (same match → same track) and copies it into the engine's public folder.
function prepareMusic(props) {
  const pub = path.join(ENGINE, 'public');
  fs.rmSync(pub, { recursive: true, force: true });
  let tracks = [];
  try { tracks = fs.readdirSync(MUSIC_DIR).filter((f) => /\.(mp3|m4a|aac|wav|ogg)$/i.test(f)).sort(); } catch { /* no music folder */ }
  if (!tracks.length) return null;
  let h = 0;
  for (const ch of `${props.match.home}|${props.match.away}|${props.match.dateIso}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const track = tracks[h % tracks.length];
  const name = 'music' + path.extname(track).toLowerCase();
  fs.mkdirSync(pub, { recursive: true });
  fs.copyFileSync(path.join(MUSIC_DIR, track), path.join(pub, name));
  return { file: name, track };
}

// ---------- Input checks: only known fields with sane values reach the template ----------
const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '');
const numIn = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi);
const fracs = (a, len) => Array.isArray(a) && a.length === len && a.every((x) => numIn(x, 0, 1));

function validateProps(p) {
  const errors = [];
  if (!p || typeof p !== 'object') throw new Error('Reel data must be a JSON object');
  const m = p.match || {};
  const out = {
    lang: LANGS.includes(p.lang) ? p.lang : 'en',
    match: {
      home: str(m.home, 40), away: str(m.away, 40), league: str(m.league, 50),
      date: str(m.date, 20), dateIso: /^\d{4}-\d{2}-\d{2}$/.test(m.dateIso || '') ? m.dateIso : '', time: /^\d{2}:\d{2}$/.test(m.time || '') ? m.time : '',
    },
    odds: p.odds, n: p.n, exact: !!p.exact, tolText: str(p.tolText, 12), filterText: str(p.filterText, 80),
    ft: p.ft, implied: p.implied, ht: p.ht, htN: p.htN,
    btts: p.btts, ou15: p.ou15, ou25: p.ou25, ou35: p.ou35, avgGoals: p.avgGoals,
    htft: Array.isArray(p.htft) ? p.htft.slice(0, 3).map((x) => ({ k: String(x && x.k), p: x && x.p })) : [],
  };
  if (!out.match.home || !out.match.away) errors.push('home and away team names are required');
  if (!(Array.isArray(out.odds) && out.odds.length === 3 && out.odds.every((x) => numIn(x, 1.01, 1000)))) errors.push('odds must be three numbers above 1');
  if (!(Number.isInteger(out.n) && out.n > 0 && out.n < 1e6)) errors.push('n (number of matching matches) must be a positive integer');
  if (!(Number.isInteger(out.htN) && out.htN >= 0 && out.htN <= out.n)) errors.push('htN is invalid');
  for (const k of ['ft', 'implied', 'ht']) if (!fracs(out[k], 3)) errors.push(`${k} must be three fractions`);
  for (const k of ['btts', 'ou15', 'ou25', 'ou35']) if (!numIn(out[k], 0, 1)) errors.push(`${k} must be a fraction`);
  if (!numIn(out.avgGoals, 0, 20)) errors.push('avgGoals is invalid');
  if (!out.htft.every((x) => /^[012]\/[012]$/.test(x.k) && numIn(x.p, 0, 1))) errors.push('htft entries are invalid');
  if (errors.length) throw new Error('Invalid reel data: ' + errors.join('; '));
  return out;
}

// A request is one reel or a list of reels in different languages (at most one per language).
function validateRequest(raw) {
  const list = (Array.isArray(raw) ? raw : [raw]).map(validateProps);
  if (!list.length || list.length > LANGS.length) throw new Error(`Invalid reel data: expected 1–${LANGS.length} reels`);
  if (new Set(list.map((p) => p.lang)).size !== list.length) throw new Error('Invalid reel data: one reel per language');
  return list;
}

const slug = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i')
  .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'match';

function fileNameFor(props) {
  return `${props.match.dateIso || new Date().toISOString().slice(0, 10)}_${slug(props.match.home)}-${slug(props.match.away)}_${props.lang}.mp4`;
}

// Renders the reel to outFile. onProgress receives { phase, done, total }.
async function renderReel(rawProps, outFile, onProgress = () => {}) {
  const props = validateProps(rawProps);
  onProgress({ phase: 'preparing', done: 0, total: 0 });
  await ensureEngine(onProgress);
  const music = prepareMusic(props);
  const full = { ...props, brand: loadBrand(props.lang), music: music ? music.file : null };
  fs.writeFileSync(path.join(ENGINE, 'props.json'), JSON.stringify(full));
  fs.mkdirSync(path.join(ENGINE, 'out'), { recursive: true });
  const tmpOut = path.join('out', 'reel.mp4');
  onProgress({ phase: 'rendering', done: 0, total: 0 });
  await run('npx', ['remotion', 'render', 'src/index.jsx', 'Reel', tmpOut, '--props=props.json'], ENGINE, (s) => {
    const clean = s.replace(/\x1b\[[0-9;]*m/g, '');
    const m = [...clean.matchAll(/(Rendered|Encoded)\s+(\d+)\/(\d+)/g)].pop();
    if (m) onProgress({ phase: m[1] === 'Encoded' ? 'encoding' : 'rendering', done: Number(m[2]), total: Number(m[3]) });
  });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.copyFileSync(path.join(ENGINE, tmpOut), outFile);
  return outFile;
}

// Renders every reel of a request into outDir. onProgress also receives { step, steps, lang }.
async function renderReels(raw, outDir, onProgress = () => {}) {
  const list = validateRequest(raw);
  const files = [];
  for (let i = 0; i < list.length; i++) {
    const name = fileNameFor(list[i]);
    await renderReel(list[i], path.join(outDir, name), (p) => onProgress({ ...p, step: i + 1, steps: list.length, lang: list[i].lang }));
    files.push(name);
  }
  return files;
}

module.exports = { renderReel, renderReels, validateProps, validateRequest, fileNameFor, ENGINE };

if (require.main === module) {
  const [propsFile, outDir] = process.argv.slice(2);
  if (!propsFile || !outDir) { console.error('Usage: node reelrender.js <props.json> <output-folder>'); process.exit(2); }
  let last = '';
  renderReels(JSON.parse(fs.readFileSync(propsFile, 'utf8')), outDir, (p) => {
    const line = `[${p.lang}] ` + (p.total ? `${p.phase} ${p.done}/${p.total}` : p.phase);
    if (line !== last && (!p.total || p.done % 150 === 0 || p.done === p.total)) { console.log(line); last = line; }
  })
    .then((files) => files.forEach((f) => console.log('Reel written: ' + path.join(outDir, f))))
    .catch((e) => { console.error(e.message); process.exit(1); });
}
