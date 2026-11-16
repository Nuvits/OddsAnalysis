'use strict';
// football-data.co.uk: match results + bwin 1X2 odds.
// Columns (see https://football-data.co.uk/notes.txt): Date, Time, HomeTeam, AwayTeam, FTHG, FTAG, HTHG, HTAG,
// BWH/BWD/BWA = bwin home/draw/away odds (collected before closing).
// bwin odds are available from the 2004/05 season onwards.

const BASE = 'https://football-data.co.uk';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const FIRST_SEASON_START = 2004;

// League codes used by football-data ("main leagues"). Display names live in the page (both languages).
const LEAGUES = {
  E0: 'England Premier League', E1: 'England Championship', E2: 'England League One', E3: 'England League Two',
  EC: 'England National League', SC0: 'Scotland Premiership', SC1: 'Scotland Championship', SC2: 'Scotland League One',
  SC3: 'Scotland League Two', D1: 'Germany Bundesliga', D2: 'Germany 2. Bundesliga', I1: 'Italy Serie A', I2: 'Italy Serie B',
  SP1: 'Spain La Liga', SP2: 'Spain Segunda', F1: 'France Ligue 1', F2: 'France Ligue 2', N1: 'Netherlands Eredivisie',
  B1: 'Belgium Pro League', P1: 'Portugal Liga', T1: 'Turkey Süper Lig', G1: 'Greece Super League',
};

// Season codes such as "2627". A season starts in July.
function seasonCode(startYear) {
  const a = String(startYear % 100).padStart(2, '0');
  const b = String((startYear + 1) % 100).padStart(2, '0');
  return a + b;
}
function currentSeasonStart(now = new Date()) {
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}
function allSeasons(now = new Date()) {
  const out = [];
  for (let y = FIRST_SEASON_START; y <= currentSeasonStart(now); y++) out.push(seasonCode(y));
  return out;
}

// Minimal CSV parser that understands quoted fields
function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function toIso(d) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(String(d || '').trim());
  if (!m) return null;
  const y = m[3].length === 2 ? '20' + m[3] : m[3];
  return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}
const odd = (v) => { const n = Number(v); return Number.isFinite(n) && n > 1 ? Math.round(n * 100) / 100 : null; };
const goals = (v) => { if (v == null || String(v).trim() === '') return null; const n = Number(v); return Number.isInteger(n) && n >= 0 ? n : null; };

// Turns a CSV file into records. results=true: only matches with a score; false: fixtures (no score).
function parseFile(text, results = true) {
  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ''));
  if (!rows.length) return [];
  const h = rows[0].map((x) => x.trim());
  const ix = (k) => h.indexOf(k);
  const I = {
    div: ix('Div'), date: ix('Date'), time: ix('Time'), home: ix('HomeTeam'), away: ix('AwayTeam'),
    fh: ix('FTHG'), fa: ix('FTAG'), hh: ix('HTHG'), ha: ix('HTAG'), o1: ix('BWH'), o0: ix('BWD'), o2: ix('BWA'),
  };
  if (I.o1 < 0 || I.home < 0 || I.date < 0) return [];
  const out = [];
  for (const r of rows.slice(1)) {
    const date = toIso(r[I.date]);
    const home = (r[I.home] || '').trim(); const away = (r[I.away] || '').trim();
    const o1 = odd(r[I.o1]), o0 = odd(r[I.o0]), o2 = odd(r[I.o2]);
    if (!date || !home || !away || !o1 || !o0 || !o2) continue;
    const m = { lg: (r[I.div] || '').trim(), date, time: I.time >= 0 ? (r[I.time] || '').trim() : '', home, away, o1, o0, o2 };
    if (results) {
      const fh = goals(r[I.fh]), fa = goals(r[I.fa]);
      if (fh === null || fa === null) continue;
      m.ft = [fh, fa];
      const hh = I.hh >= 0 ? goals(r[I.hh]) : null, ha = I.ha >= 0 ? goals(r[I.ha]) : null;
      if (hh !== null && ha !== null) m.ht = [hh, ha];
    }
    out.push(m);
  }
  return out;
}

async function getText(url, withMeta = false) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(45000) });
      if (res.status === 404 || res.status === 300) return null; // league not covered that season
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!withMeta) return text;
      const lm = res.headers.get('last-modified');
      return { text, lastModified: lm ? new Date(lm).toISOString() : null };
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error(`${url}: ${lastErr.message}`);
}

async function fetchSeasonLeague(season, div) {
  const text = await getText(`${BASE}/mmz4281/${season}/${div}.csv`);
  return text ? parseFile(text, true) : [];
}

// Upcoming fixtures with bwin odds. Per football-data, odds are collected on Fridays by 17:00
// (weekend fixtures) and on Tuesdays by 13:00 (midweek fixtures), UK time.
async function fetchFixtures() {
  const r = await getText(`${BASE}/fixtures.csv`, true);
  if (!r) return { list: [], published: null };
  return { list: parseFile(r.text, false).filter((m) => LEAGUES[m.lg]), published: r.lastModified };
}

module.exports = { LEAGUES, allSeasons, seasonCode, currentSeasonStart, fetchSeasonLeague, fetchFixtures, parseFile };
