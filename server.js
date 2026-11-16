'use strict';
// Odds Analysis (bwin) – local server.
//  - serves the page in public/
//  - downloads match results and bwin odds from football-data.co.uk
//  - stores everything in data/bwin.json
//  - writes a self-contained single-file version (odds-analysis.html) after every save
// Usage:  node server.js [--open] [--no-update]   start the server on http://localhost:3737
//         node server.js --update                 update once and exit (scheduled tasks, CI)
// Environment:
//   ODDS_DATA_DIR    data folder (default ./data)
//   ODDS_STANDALONE  path of the single-file page (default ./odds-analysis.html)
//   ODDS_EMBED_MODE  'file' (downloaded file) or 'web' (self-updating site, e.g. GitHub Pages)

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const fd = require('./footballdata');

const PORT = Number(process.env.PORT) || 3737;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = process.env.ODDS_DATA_DIR || path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'bwin.json');
const STANDALONE_FILE = process.env.ODDS_STANDALONE || path.join(ROOT, 'odds-analysis.html');
const EMBED_MODE = process.env.ODDS_EMBED_MODE === 'web' ? 'web' : 'file';

// A match in memory = [league, date, home, away, odd1, oddX, odd2, ftHome, ftAway, htHome, htAway]
const K = { lg: 0, date: 1, home: 2, away: 3, o1: 4, o0: 5, o2: 6, fh: 7, fa: 8, hh: 9, ha: 10 };
const keyOf = (r) => `${r[K.lg]}|${r[K.date]}|${r[K.home]}|${r[K.away]}`;
const toRow = (m) => [m.lg, m.date, m.home, m.away, m.o1, m.o0, m.o2, m.ft[0], m.ft[1], m.ht ? m.ht[0] : null, m.ht ? m.ht[1] : null];

// ---------- Storage ----------
const db = { lastUpdate: null, summary: null, seasons: {}, fixtures: [], fixturesFetched: null, fixturesPublished: null, matches: new Map() };

function loadDb() {
  if (!fs.existsSync(DB_FILE)) return;
  const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  db.lastUpdate = raw.lastUpdate || null;
  db.summary = raw.summary || null;
  db.seasons = raw.seasons || {};
  db.fixtures = raw.fixtures || [];
  db.fixturesFetched = raw.fixturesFetched || null;
  db.fixturesPublished = raw.fixturesPublished || null;
  db.matches = new Map((raw.matches || []).map((r) => [keyOf(r), r]));
}

function saveDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const rows = [...db.matches.values()].sort((a, b) => (a[K.date] < b[K.date] ? -1 : a[K.date] > b[K.date] ? 1 : 0));
  const json = JSON.stringify({
    version: 2, source: 'football-data.co.uk – bwin odds',
    lastUpdate: db.lastUpdate, summary: db.summary, seasons: db.seasons,
    fixtures: db.fixtures, fixturesFetched: db.fixturesFetched, fixturesPublished: db.fixturesPublished,
    columns: Object.keys(K), matches: rows,
  });
  if (fs.existsSync(DB_FILE)) {
    try { fs.copyFileSync(DB_FILE, DB_FILE.replace(/\.json$/, '.bak.json')); } catch { /* keep going without a backup */ }
  }
  writeFileSafe(DB_FILE, json);
  dataCache = null;
  writeStandalone();
}

function writeFileSafe(file, content) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, content);
  try {
    fs.renameSync(tmp, file);
  } catch {
    // Synced folders (e.g. Google Drive) sometimes refuse renames: write directly instead.
    fs.writeFileSync(file, content);
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  }
}

// Page + styles + script + gzip-compressed data from public/ → one HTML file that needs no server.
function writeStandalone() {
  try {
    const payload = JSON.stringify({ meta: meta(), fixtures: db.fixtures, matches: [...db.matches.values()] });
    const b64 = zlib.gzipSync(payload, { level: 9 }).toString('base64');
    const css = fs.readFileSync(path.join(PUBLIC, 'style.css'), 'utf8');
    const js = fs.readFileSync(path.join(PUBLIC, 'app.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
    let html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
    const cssTag = '<link rel="stylesheet" href="style.css">';
    const jsTag = '<script src="app.js"></script>';
    if (!html.includes(cssTag) || !html.includes(jsTag)) throw new Error('index.html is missing the expected tags');
    html = html
      .replace(cssTag, () => `<style>\n${css}\n</style>`)
      .replace(jsTag, () => `<script>window.EMBED_MODE="${EMBED_MODE}";window.EMBEDDED_DATA="${b64}";</script>\n<script>\n${js}\n</script>`);
    fs.mkdirSync(path.dirname(STANDALONE_FILE), { recursive: true });
    writeFileSafe(STANDALONE_FILE, html);
    console.log(`Single-file page written: ${path.basename(STANDALONE_FILE)} (${(Buffer.byteLength(html) / 1048576).toFixed(1)} MB)`);
  } catch (e) {
    console.error('Could not write the single-file page:', e.message);
  }
}

function upsert(row) {
  const k = keyOf(row);
  const old = db.matches.get(k);
  if (!old) { db.matches.set(k, row); return 'added'; }
  if (JSON.stringify(old) !== JSON.stringify(row)) { db.matches.set(k, row); return 'updated'; }
  return null;
}

// ---------- Update job (runs in the background and reports progress) ----------
let job = { running: false, done: 0, total: 0, phase: '', error: null, summary: null };

function seasonsToFetch() {
  const all = fd.allSeasons();
  const curStart = fd.currentSeasonStart();
  const cur = fd.seasonCode(curStart);
  const prev = fd.seasonCode(curStart - 1);
  return all.filter((s) => {
    const info = db.seasons[s];
    if (!info) return true;                                         // never downloaded
    if (s === cur) return true;                                     // running season: every time
    if (s === prev && info.fetched < `${curStart}-09-01`) return true; // final version of last season (summer fixes)
    return false;
  });
}

async function runUpdate(onProgress = () => {}) {
  if (job.running) throw new Error('An update is already running');
  const seasons = seasonsToFetch();
  const tasks = [];
  for (const s of seasons) for (const div of Object.keys(fd.LEAGUES)) tasks.push({ s, div });
  job = { running: true, done: 0, total: tasks.length + 1, phase: 'starting', error: null, summary: null, startedAt: new Date().toISOString() };
  const counts = { added: 0, updated: 0, files: 0, failedFiles: [] };
  const seasonOk = Object.fromEntries(seasons.map((s) => [s, { ok: true, count: 0 }]));
  try {
    // 1) Upcoming fixtures
    job.phase = 'fixtures';
    try {
      const fx = await fd.fetchFixtures();
      db.fixtures = fx.list.map((m) => ({ lg: m.lg, date: m.date, time: m.time, home: m.home, away: m.away, o1: m.o1, o0: m.o0, o2: m.o2 }));
      db.fixturesPublished = fx.published;
      db.fixturesFetched = new Date().toISOString();
    } catch (e) {
      counts.failedFiles.push('fixtures.csv: ' + e.message);
    }
    job.done++; onProgress(job);

    // 2) Season files (6 parallel requests)
    let i = 0;
    const worker = async () => {
      while (i < tasks.length) {
        const t = tasks[i++];
        job.phase = `season ${t.s.slice(0, 2)}/${t.s.slice(2)}`;
        try {
          const list = await fd.fetchSeasonLeague(t.s, t.div);
          for (const m of list) { const r = upsert(toRow(m)); if (r) counts[r]++; }
          seasonOk[t.s].count += list.length;
          counts.files++;
        } catch (e) {
          seasonOk[t.s].ok = false;
          counts.failedFiles.push(e.message);
        }
        job.done++; onProgress(job);
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));

    const today = new Date().toLocaleDateString('sv-SE');
    for (const [s, v] of Object.entries(seasonOk)) if (v.ok) db.seasons[s] = { fetched: today, count: v.count };
    if (!counts.files && counts.failedFiles.length) throw new Error('Could not reach football-data.co.uk: ' + counts.failedFiles[0]);

    db.lastUpdate = new Date().toISOString();
    db.summary = {
      added: counts.added, updated: counts.updated, files: counts.files, seasons,
      fixtures: db.fixtures.length, failed: counts.failedFiles.slice(0, 20), failedCount: counts.failedFiles.length,
      total: db.matches.size,
    };
    saveDb();
    job.summary = db.summary;
    return db.summary;
  } catch (e) {
    job.error = e.message;
    throw e;
  } finally {
    job.running = false; job.phase = 'done';
  }
}

// ---------- Import (this app's own JSON backup or CSV export) ----------
// CSV headers: current English ones and the earlier Turkish ones are both accepted.
const CSV_ALIASES = {
  league: ['league', 'lig'], date: ['date', 'tarih'], home: ['home', 'ev'], away: ['away', 'deplasman'],
  ht: ['ht_score', 'iy_skor'], ft: ['ft_score', 'ms_skor'], o1: ['bwin_1'], o0: ['bwin_x', 'bwin_0'], o2: ['bwin_2'],
};

function importText(text) {
  text = text.replace(/^﻿/, '').trim();
  let rows = [];
  if (text.startsWith('{') || text.startsWith('[')) {
    const data = JSON.parse(text);
    rows = Array.isArray(data) ? data : data.matches;
    if (!Array.isArray(rows)) throw new Error('No "matches" array found in the JSON file');
  } else {
    const lines = text.split(/\r?\n/);
    const h = lines[0].split(';');
    const ix = Object.fromEntries(Object.entries(CSV_ALIASES).map(([k, names]) => [k, h.findIndex((x) => names.includes(x))]));
    if (Object.values(ix).some((v) => v < 0)) throw new Error('Unrecognised CSV. Only this app\'s own CSV export can be imported.');
    const num = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')));
    const sc = (v) => { const m = /^(\d+)-(\d+)$/.exec(v || ''); return m ? [Number(m[1]), Number(m[2])] : [null, null]; };
    for (const l of lines.slice(1)) {
      if (!l.trim()) continue;
      const c = l.split(';');
      const [fh, fa] = sc(c[ix.ft]); const [hh, ha] = sc(c[ix.ht]);
      rows.push([c[ix.league], c[ix.date], c[ix.home], c[ix.away], num(c[ix.o1]), num(c[ix.o0]), num(c[ix.o2]), fh, fa, hh, ha]);
    }
  }
  const counts = { added: 0, updated: 0, unchanged: 0, invalid: 0 };
  const okOdd = (v) => typeof v === 'number' && v > 1 && v < 1000;
  const okGoal = (v) => Number.isInteger(v) && v >= 0 && v < 50;
  for (const r of rows) {
    if (!Array.isArray(r) || r.length < 9 || !/^\d{4}-\d{2}-\d{2}$/.test(r[1]) || !r[2] || !r[3] ||
        !okOdd(r[4]) || !okOdd(r[5]) || !okOdd(r[6]) || !okGoal(r[7]) || !okGoal(r[8])) { counts.invalid++; continue; }
    const row = [String(r[0]), r[1], String(r[2]), String(r[3]), r[4], r[5], r[6], r[7], r[8],
      okGoal(r[9]) ? r[9] : null, okGoal(r[10]) ? r[10] : null];
    counts[upsert(row) || 'unchanged']++;
  }
  if (counts.added || counts.updated) saveDb();
  return { ...counts, total: db.matches.size };
}

// ---------- CSV export (semicolon-separated, decimal comma: opens directly in Excel with TR/EU locale) ----------
function toCsv() {
  const f = (v) => (v == null ? '' : v.toFixed(2).replace('.', ','));
  const q = (s) => (/[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
  const lines = ['league;league_name;date;home;away;ht_score;ft_score;bwin_1;bwin_x;bwin_2'];
  for (const r of [...db.matches.values()].sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0))) {
    lines.push([r[0], q(fd.LEAGUES[r[0]] || r[0]), r[1], q(r[2]), q(r[3]),
      r[9] == null ? '' : `${r[9]}-${r[10]}`, `${r[7]}-${r[8]}`, f(r[4]), f(r[5]), f(r[6])].join(';'));
  }
  return '﻿' + lines.join('\r\n');
}

// ---------- HTTP ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
let dataCache = null; // pre-compressed /api/data response

function meta() {
  const dates = db.matches.size ? [...db.matches.values()].reduce((a, r) => [a[0] < r[1] ? a[0] : r[1], a[1] > r[1] ? a[1] : r[1]], ['9999', '0000']) : [null, null];
  return {
    lastUpdate: db.lastUpdate, summary: db.summary, total: db.matches.size,
    from: dates[0], to: dates[1], fixturesFetched: db.fixturesFetched, fixturesPublished: db.fixturesPublished,
    today: new Date().toLocaleDateString('sv-SE'), source: 'football-data.co.uk – bwin',
  };
}

function send(req, res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  let buf = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  const headers = { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra };
  if (buf.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    buf = zlib.gzipSync(buf); headers['Content-Encoding'] = 'gzip';
  }
  res.writeHead(status, headers); res.end(buf);
}

function readBody(req, limit = 200 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('File too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  try {
    if (p === '/api/data' && req.method === 'GET') {
      if (!dataCache) {
        const json = JSON.stringify({ meta: meta(), fixtures: db.fixtures, matches: [...db.matches.values()] });
        dataCache = { raw: Buffer.from(json), gz: zlib.gzipSync(json) };
      }
      const gz = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(gz ? { 'Content-Encoding': 'gzip' } : {}) });
      return res.end(gz ? dataCache.gz : dataCache.raw);
    }
    if (p === '/api/update' && req.method === 'POST') {
      if (!job.running) runUpdate().catch((e) => console.error('Update failed:', e.message));
      return send(req, res, 202, job);
    }
    if (p === '/api/update' && req.method === 'GET') return send(req, res, 200, job);
    if (p === '/api/import' && req.method === 'POST') {
      return send(req, res, 200, { summary: importText(await readBody(req)) });
    }
    if (p === '/api/export.json' && req.method === 'GET') {
      const stamp = new Date().toLocaleDateString('sv-SE');
      return send(req, res, 200, JSON.stringify({ version: 2, exported: new Date().toISOString(), columns: Object.keys(K), matches: [...db.matches.values()] }),
        'application/json; charset=utf-8', { 'Content-Disposition': `attachment; filename="bwin-matches-${stamp}.json"` });
    }
    if (p === '/api/export.csv' && req.method === 'GET') {
      return send(req, res, 200, toCsv(), 'text/csv; charset=utf-8', { 'Content-Disposition': `attachment; filename="bwin-matches-${new Date().toLocaleDateString('sv-SE')}.csv"` });
    }
    if (req.method === 'GET') {
      const file = path.normalize(path.join(PUBLIC, p === '/' ? 'index.html' : decodeURIComponent(p)));
      if (file.startsWith(PUBLIC) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        return send(req, res, 200, fs.readFileSync(file), MIME[path.extname(file)] || 'application/octet-stream');
      }
    }
    send(req, res, 404, { error: 'Not found' });
  } catch (e) {
    console.error(e);
    send(req, res, 500, { error: e.message });
  }
}

loadDb();
if (process.argv.includes('--update')) {
  let last = 0;
  runUpdate((j) => { if (j.done - last >= 25 || j.done === j.total) { last = j.done; console.log(`  ${j.done}/${j.total} – ${j.phase}`); } })
    .then((s) => { console.log(new Date().toISOString(), JSON.stringify(s)); })
    .catch((e) => { console.error('Update failed:', e.message); process.exitCode = 1; });
} else {
  const url = `http://localhost:${PORT}`;
  const openBrowser = () => {
    if (!process.argv.includes('--open')) return;
    require('child_process').exec(process.platform === 'win32' ? `start "" "${url}"` : `open "${url}"`);
  };
  const server = http.createServer(handle);
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      // Already running (e.g. an earlier window): just open the browser.
      console.log(`Server is already running: ${url}`);
      openBrowser();
      setTimeout(() => process.exit(0), 1500);
    } else {
      console.error('Could not start the server:', e.message);
      process.exitCode = 1;
    }
  });
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Odds Analysis (bwin) is running: ${url}  (matches stored: ${db.matches.size})`);
    console.log('Close this window or press Ctrl+C to stop.');
    openBrowser();
    // Update on every start; on success odds-analysis.html is rewritten as well.
    if (!process.argv.includes('--no-update')) {
      console.log('Updating data…');
      runUpdate()
        .then((s) => console.log(`Updated: ${s.added} new matches, ${s.fixtures} upcoming fixtures, ${s.total} in total.`))
        .catch((e) => {
          console.error('Update failed:', e.message);
          if (!fs.existsSync(STANDALONE_FILE) && db.matches.size) writeStandalone(); // at least write it from existing data
        });
    }
  });
}
