'use strict';
/* Odds Memory – client side.
   All data is loaded once; matching and statistics run in the browser.
   Match row: [league, date, home, away, odd1, oddX, odd2, ftHome, ftAway, htHome, htAway]
   Runs in three modes:
     server – served by server.js (update/import/export available)
     file   – single downloaded file with embedded data (odds-analysis.html)
     web    – the same single file published as a self-updating site (GitHub Pages) */

const $ = (id) => document.getElementById(id);
const C = { lg: 0, date: 1, home: 2, away: 3, o1: 4, o0: 5, o2: 6, fh: 7, fa: 8, hh: 9, ha: 10 };
const ODD_INPUTS = ['ms1', 'ms0', 'ms2'];

const EMBED = typeof window.EMBEDDED_DATA === 'string';
const MODE = EMBED ? (window.EMBED_MODE === 'web' ? 'web' : 'file') : 'server';
// Web mode: reels are rendered by a GitHub workflow in this repository (see .github/workflows/reel.yml)
const REEL_REPO = MODE === 'web' && /^[\w.-]+\/[\w.-]+$/.test(window.REEL_REPO || '') ? window.REEL_REPO : '';

// =====================================================================
// Translations
// =====================================================================
const LEAGUE_NAMES = {
  tr: {
    E0: 'İngiltere Premier Lig', E1: 'İngiltere Championship', E2: 'İngiltere League One', E3: 'İngiltere League Two',
    EC: 'İngiltere National League', SC0: 'İskoçya Premiership', SC1: 'İskoçya Championship', SC2: 'İskoçya League One',
    SC3: 'İskoçya League Two', D1: 'Almanya Bundesliga', D2: 'Almanya 2. Bundesliga', I1: 'İtalya Serie A', I2: 'İtalya Serie B',
    SP1: 'İspanya La Liga', SP2: 'İspanya Segunda', F1: 'Fransa Ligue 1', F2: 'Fransa Ligue 2', N1: 'Hollanda Eredivisie',
    B1: 'Belçika Pro Lig', P1: 'Portekiz Liga', T1: 'Türkiye Süper Lig', G1: 'Yunanistan Süper Lig',
  },
  en: {
    E0: 'England Premier League', E1: 'England Championship', E2: 'England League One', E3: 'England League Two',
    EC: 'England National League', SC0: 'Scotland Premiership', SC1: 'Scotland Championship', SC2: 'Scotland League One',
    SC3: 'Scotland League Two', D1: 'Germany Bundesliga', D2: 'Germany 2. Bundesliga', I1: 'Italy Serie A', I2: 'Italy Serie B',
    SP1: 'Spain La Liga', SP2: 'Spain Segunda', F1: 'France Ligue 1', F2: 'France Ligue 2', N1: 'Netherlands Eredivisie',
    B1: 'Belgium Pro League', P1: 'Portugal Liga', T1: 'Turkey Süper Lig', G1: 'Greece Super League',
  },
};

const I18N = {
  tr: {
    appName: 'Odds Memory', title: 'Odds Memory',
    update: 'Verileri Güncelle', updating: 'Güncelleniyor…', downloading: 'İndiriliyor… %{p}', reloading: 'Yükleniyor…',
    dataMenu: 'Veri ▾', exportJson: 'JSON olarak dışa aktar (tam yedek)', exportCsv: 'CSV olarak dışa aktar',
    importBackup: 'Yedekten içe aktar…', lastUpdateDetails: 'Son güncelleme ayrıntısı',
    pickUpcoming: 'Yaklaşan maçtan seç', oddsTitle: 'bwin maç sonucu oranları', clear: 'Temizle',
    oddHome: 'Ev sahibi kazanır oranı', oddDraw: 'Beraberlik oranı', oddAway: 'Deplasman kazanır oranı',
    drawShort: '0',
    oddsHint: 'Oranları bwin\'den (ondalık, ör. 1,85) girin. Diğer bahis türlerinin sonuçları, bu oranlarla eşleşen maçların skorlarından hesaplanır.',
    matching: 'Eşleme modu', modeRange: 'Aralıklı ±', modeExact: 'Tam eşleme', tolerance: 'Tolerans', decrease: 'Azalt', increase: 'Artır',
    dateRange: 'Tarih aralığı', range_all: 'Tümü', range_60: 'Son 5 yıl', range_12: 'Son 1 yıl', range_5: 'Son 5 ay', range_3: 'Son 3 ay', range_1: 'Son 1 ay',
    rangeText_all: 'tüm tarihler', rangeText_60: 'son 5 yıl', rangeText_12: 'son 1 yıl', rangeText_5: 'son 5 ay', rangeText_3: 'son 3 ay', rangeText_1: 'son 1 ay',
    league: 'Lig', allLeagues: 'Tüm ligler', leaguesSelected: '{n} lig seçili', searchLeagues: 'Lig ara…', clearSelection: 'Seçimi temizle', noLeagues: 'Lig yok',
    nLeagues: '{n} lig',
    matchingMatches: 'eşleşen maç', matchList: 'Eşleşen maçlar', sort: 'Sırala', sortDate: 'Tarih (yeni → eski)', sortNear: 'Oran yakınlığı',
    colDate: 'Tarih', colLeague: 'Lig', colMatch: 'Maç', colHT: 'İY', colFT: 'MS',
    showMore: 'Daha fazla göster ({n} maç daha)',
    importBackupTitle: 'Yedekten içe aktar', importHint: 'Bu uygulamanın JSON ya da CSV dışa aktarımını seçin. Aynı maçlar tekrar eklenmez.',
    import: 'İçe aktar', importing: 'Aktarılıyor…', close: 'Kapat', lastUpdate: 'Son güncelleme',
    // status & notes
    loadingData: 'Veriler açılıyor…', updatedAt: 'Son güncelleme', dataDate: 'Veri tarihi', matchesRange: '<b>{n}</b> maç · {from} – {to}',
    noData: 'Henüz veri yok – {hint}',
    hint_server: '“Verileri Güncelle”ye basın', hint_file: 'bilgisayarda start.bat ile güncelleyin', hint_web: 'site kendiliğinden güncellenir, birkaç saat sonra tekrar bakın',
    bulletinManual: '— Oranları elle gir ({n} yaklaşan maç) —', bulletinEmpty: '— Yaklaşan maç listesi boş; oranları elle girin —',
    today: 'Bugün', tomorrow: 'Yarın',
    fxPublished: 'Liste football-data\'da <b>{when}</b> yayımlandı · {n} yaklaşan maç.', fxFetched: 'Liste {when} alındı.',
    fxNext: 'Sonraki listeler (en geç): {slots}', fxMidweek: '(hafta içi maç varsa)', fxWeekend: '(hafta sonu maçları)',
    fxStale: 'Yeni bir liste yayımlanmış olabilir – {hint}.',
    pickedNote: 'Oranlar football-data\'nın topladığı bwin oranlarıdır; bwin\'de şu anki oran farklıysa elle düzeltin.',
    // empty state
    emptyTitle: 'Analiz için bwin MS 1-0-2 oranlarını girin', badOdds: 'Geçersiz oran var (kırmızı kutular). Oranlar 1,01 veya üstü olmalı.',
    emptyP1: 'Soldaki kutulara oynanacak maçın bwin oranlarını yazın ya da yaklaşan maçlardan birini seçin. Geçmişte bwin\'in benzer oranlar verdiği maçlar bulunur ve nasıl bittikleri gösterilir.',
    emptyP2: 'Veri kaynağı: <b>football-data.co.uk</b> – 22 Avrupa liginde maç sonuçları ve bwin\'in maç sonucu oranları. {how}',
    how_server: '“Verileri Güncelle” süren sezonu ve yaklaşan maç listesini yeniler.',
    how_file: 'Bu dosya, bilgisayarda <b>start.bat</b> her çalıştığında yeni verilerle yeniden yazılır.',
    how_web: 'Bu sayfa her gün ve yeni oran listeleri yayımlandığında (Salı, Cuma) kendiliğinden güncellenir.',
    stMatches: 'maç', stLeagues: 'lig', stOldest: 'en eski maç', stNewest: 'en yeni maç', stUpcoming: 'yaklaşan maç',
    loadFailed: 'Veriler açılamadı: {e}', serverDown: 'Sunucuya bağlanılamadı. “start.bat” ile sunucuyu başlatıp sayfayı yenileyin.', serverDownStatus: 'Sunucuya bağlanılamadı: {e}',
    browserTooOld: 'Bu tarayıcı dosyayı açamıyor. Chrome ya da Safari\'nin güncel sürümünü kullanın.',
    // results
    oddsLabel: 'bwin MS', margin: 'bwin payı {p}', exact: 'tam eşleme', avgGoals: 'maç başı ort. {g} gol',
    noHtScores: '{n} maçta İY skoru yok (İY kartları {m} maç üzerinden)',
    smallSample: 'Örnek az: yüzdeler güvenilir değil, toleransı artırmayı ya da filtreleri gevşetmeyi deneyin',
    nMatches: '{n} maç', noDataCard: 'Veri yok', impliedBy: 'Oranın ima ettiği {p}', points: '{d} puan',
    footPrivacy: 'Gizlilik politikası', footTerms: 'Kullanım şartları', footNote: 'Bahis tavsiyesi değildir · 18+',
    cardFT: 'Maç Sonucu', cardHT: 'İlk Yarı Sonucu', cardBTTS: 'Karşılıklı Gol', yes: 'Var', no: 'Yok',
    cardOU25: '2,5 Gol Alt / Üst', cardHTOU15: 'İY 1,5 Gol Alt / Üst', cardOU15: '1,5 Gol Alt / Üst', cardOU35: '3,5 Gol Alt / Üst',
    under: 'Alt', over: 'Üst', cardGoals: 'Toplam Gol', cardHTFT: 'İY / MS', htftCorner: 'İY \\ MS',
    noMatches: 'Eşleşen maç yok. Toleransı artırmayı ya da filtreleri gevşetmeyi deneyin.',
    // update / log / import
    updatedToast: 'Güncellendi: {added} yeni maç, {updated} maç düzeltildi, {fixtures} yaklaşan maç. Toplam {total}.',
    failedFilesNote: ' ({n} dosya indirilemedi, bir sonraki güncellemede tekrar denenecek)', updateFailed: 'Güncelleme başarısız: {e}',
    noUpdateYet: 'Henüz güncelleme yapılmadı.', logTime: 'Zaman', logSeasons: 'İndirilen sezonlar', logSeasonsRange: '{a} – {b} ({n} sezon)',
    logFiles: 'İndirilen dosya', logAdded: 'Yeni maç', logUpdated: 'Düzeltilen maç', logFixtures: 'Yaklaşan maç', logTotal: 'Toplam',
    logFailed: 'İndirilemeyen dosyalar ({n}):',
    fileChosen: '<b>{name}</b> seçildi ({mb} MB).',
    importedToast: 'İçe aktarıldı: {added} yeni, {updated} güncellendi, {unchanged} zaten vardı{invalid}. Toplam {total}.', invalidRows: ', {n} geçersiz satır',
    // reels
    makeReel: 'Reels videosu oluştur', reelTitle: 'Reels videosu oluştur',
    reelHint: 'Şu anki analiz (oranlar, filtreler, eşleşen maçlar) 30 saniyelik, 1080×1920 boyutunda, müzikli iki Reels videosuna dönüşür: biri İngilizce, biri Türkçe. İlk seferde video motoru kurulur; bu birkaç dakika sürebilir.',
    reelHome: 'Ev sahibi', reelAway: 'Deplasman', reelLeague: 'Lig', reelDate: 'Tarih', reelTime: 'Saat',
    reelCreate: 'Oluştur', reelCreating: 'Oluşturuluyor…',
    reelPhase_preparing: 'Hazırlanıyor…', reelPhase_installing: 'Video motoru kuruluyor (yalnızca ilk sefer, birkaç dakika)…',
    reelPhase_rendering: 'Kareler çiziliyor: {d}/{t}', reelPhase_encoding: 'Video kodlanıyor: {d}/{t}',
    reelSaved: 'reels/out klasörüne kaydedildi: <b>{names}</b>. Klasör Google Drive ile telefonunuza da gelir.',
    reelLang_en: 'İngilizce', reelLang_tr: 'Türkçe', reelStep: '{lang} video ({s}/{n})',
    reelNeedTeams: 'Ev sahibi ve deplasman adını yazın.', reelFailed: 'Video oluşturulamadı: {e}',
    reelSmall: 'Yalnızca {n} eşleşen maç var. Doğru bir karşılaştırma için en az {m} maç gerekir, bu yüzden video oluşturulmaz. Aralığı genişletin ya da filtreleri azaltın.',
    reelHintWeb: 'Bu sitede videolar (İngilizce ve Türkçe) GitHub\'da üretilir. “GitHub\'da devam et” bilgileri dolu bir GitHub sayfası açar; orada “Submit new issue” deyin. 4-6 dakika içinde aynı sayfaya video bağlantıları gelir. GitHub hesabınızla giriş yapmış olmanız gerekir.',
    reelGoWeb: 'GitHub\'da devam et',
    reelOpened: 'GitHub yeni sekmede açıldı. “Submit new issue” deyin; video bağlantıları 4-6 dakika içinde o sayfada görünür.',
  },
  en: {
    appName: 'Odds Memory', title: 'Odds Memory',
    update: 'Update data', updating: 'Updating…', downloading: 'Downloading… {p}%', reloading: 'Loading…',
    dataMenu: 'Data ▾', exportJson: 'Export as JSON (full backup)', exportCsv: 'Export as CSV',
    importBackup: 'Import from backup…', lastUpdateDetails: 'Last update details',
    pickUpcoming: 'Pick an upcoming match', oddsTitle: 'bwin full-time odds (1X2)', clear: 'Clear',
    oddHome: 'Home win odds', oddDraw: 'Draw odds', oddAway: 'Away win odds',
    drawShort: 'X',
    oddsHint: 'Enter bwin\'s decimal odds (e.g. 1.85). Every other market is worked out from the scores of the matches with similar odds.',
    matching: 'Matching', modeRange: 'Range ±', modeExact: 'Exact', tolerance: 'Tolerance', decrease: 'Decrease', increase: 'Increase',
    dateRange: 'Date range', range_all: 'All', range_60: 'Last 5 years', range_12: 'Last year', range_5: 'Last 5 months', range_3: 'Last 3 months', range_1: 'Last month',
    rangeText_all: 'all dates', rangeText_60: 'last 5 years', rangeText_12: 'last year', rangeText_5: 'last 5 months', rangeText_3: 'last 3 months', rangeText_1: 'last month',
    league: 'League', allLeagues: 'All leagues', leaguesSelected: '{n} leagues selected', searchLeagues: 'Search leagues…', clearSelection: 'Clear selection', noLeagues: 'No leagues',
    nLeagues: '{n} leagues',
    matchingMatches: 'matching matches', matchList: 'Matching matches', sort: 'Sort', sortDate: 'Date (newest first)', sortNear: 'Closest odds',
    colDate: 'Date', colLeague: 'League', colMatch: 'Match', colHT: 'HT', colFT: 'FT',
    showMore: 'Show more ({n} more matches)',
    importBackupTitle: 'Import from backup', importHint: 'Choose a JSON or CSV export from this app. Matches already stored are not added twice.',
    import: 'Import', importing: 'Importing…', close: 'Close', lastUpdate: 'Last update',
    loadingData: 'Opening data…', updatedAt: 'Last update', dataDate: 'Data as of', matchesRange: '<b>{n}</b> matches · {from} – {to}',
    noData: 'No data yet – {hint}',
    hint_server: 'press “Update data”', hint_file: 'update on the computer with start.bat', hint_web: 'the site updates itself, check again in a few hours',
    bulletinManual: '— Enter odds manually (upcoming matches: {n}) —', bulletinEmpty: '— No upcoming matches listed; enter odds manually —',
    today: 'Today', tomorrow: 'Tomorrow',
    fxPublished: 'List published on football-data <b>{when}</b> · upcoming matches: {n}.', fxFetched: 'List fetched {when}.',
    fxNext: 'Next lists (at the latest): {slots}', fxMidweek: '(if there are midweek games)', fxWeekend: '(weekend games)',
    fxStale: 'A newer list may be out – {hint}.',
    pickedNote: 'These are the bwin odds collected by football-data; if bwin shows different odds now, correct them by hand.',
    emptyTitle: 'Enter bwin 1X2 odds to start', badOdds: 'Some odds are invalid (red boxes). Odds must be 1.01 or higher.',
    emptyP1: 'Type the bwin odds of the match you are interested in, or pick an upcoming match. The page finds past matches where bwin offered similar odds and shows how they ended.',
    emptyP2: 'Data source: <b>football-data.co.uk</b> – results and bwin full-time odds for 22 European leagues. {how}',
    how_server: '“Update data” refreshes the current season and the upcoming match list.',
    how_file: 'This file is rewritten with fresh data every time <b>start.bat</b> runs on the computer.',
    how_web: 'This page updates itself every day and whenever new odds lists are published (Tuesday, Friday).',
    stMatches: 'matches', stLeagues: 'leagues', stOldest: 'oldest match', stNewest: 'newest match', stUpcoming: 'upcoming',
    loadFailed: 'Could not open the data: {e}', serverDown: 'Could not reach the server. Start it with “start.bat” and reload the page.', serverDownStatus: 'Could not reach the server: {e}',
    browserTooOld: 'This browser cannot open the file. Use an up-to-date Chrome or Safari.',
    oddsLabel: 'bwin 1X2', margin: 'bwin margin {p}', exact: 'exact match', avgGoals: 'avg. {g} goals per match',
    noHtScores: '{n} matches have no half-time score (half-time cards use {m} matches)',
    smallSample: 'Small sample: percentages are unreliable, try a wider tolerance or fewer filters',
    nMatches: '{n} matches', noDataCard: 'No data', impliedBy: 'Implied by the odds {p}', points: '{d} pts',
    footPrivacy: 'Privacy policy', footTerms: 'Terms of service', footNote: 'Not betting advice · 18+',
    cardFT: 'Full-time result', cardHT: 'Half-time result', cardBTTS: 'Both teams to score', yes: 'Yes', no: 'No',
    cardOU25: 'Over / Under 2.5 goals', cardHTOU15: '1st half Over / Under 1.5', cardOU15: 'Over / Under 1.5 goals', cardOU35: 'Over / Under 3.5 goals',
    under: 'Under', over: 'Over', cardGoals: 'Total goals', cardHTFT: 'HT / FT', htftCorner: 'HT \\ FT',
    noMatches: 'No matching matches. Try a wider tolerance or fewer filters.',
    updatedToast: 'Updated: {added} new matches, {updated} corrected, {fixtures} upcoming. {total} in total.',
    failedFilesNote: ' ({n} files could not be downloaded; they will be retried next time)', updateFailed: 'Update failed: {e}',
    noUpdateYet: 'No update has run yet.', logTime: 'Time', logSeasons: 'Seasons downloaded', logSeasonsRange: '{a} – {b} ({n} seasons)',
    logFiles: 'Files downloaded', logAdded: 'New matches', logUpdated: 'Corrected matches', logFixtures: 'Upcoming matches', logTotal: 'Total',
    logFailed: 'Files that failed ({n}):',
    fileChosen: '<b>{name}</b> selected ({mb} MB).',
    importedToast: 'Imported: {added} new, {updated} updated, {unchanged} already present{invalid}. {total} in total.', invalidRows: ', {n} invalid rows',
    makeReel: 'Create Reels video', reelTitle: 'Create Reels video',
    reelHint: 'Turns the current analysis (odds, filters, matching matches) into two 30-second 1080×1920 Reels videos with music: one in English, one in Turkish. The first time, the video engine is installed, which can take a few minutes.',
    reelHome: 'Home team', reelAway: 'Away team', reelLeague: 'League', reelDate: 'Date', reelTime: 'Time',
    reelCreate: 'Create', reelCreating: 'Creating…',
    reelPhase_preparing: 'Preparing…', reelPhase_installing: 'Installing the video engine (first time only, a few minutes)…',
    reelPhase_rendering: 'Rendering frames: {d}/{t}', reelPhase_encoding: 'Encoding video: {d}/{t}',
    reelSaved: 'Saved in reels/out: <b>{names}</b>. The folder syncs to your phone via Google Drive.',
    reelLang_en: 'English', reelLang_tr: 'Turkish', reelStep: '{lang} video ({s}/{n})',
    reelNeedTeams: 'Enter the home and away team names.', reelFailed: 'Could not create the video: {e}',
    reelSmall: 'Only {n} matching matches. A fair comparison needs at least {m}, so no video is made. Widen the range or remove filters.',
    reelHintWeb: 'On this site the videos (English and Turkish) are made on GitHub. “Continue on GitHub” opens a pre-filled GitHub page; tap “Submit new issue” there. Links to the videos appear on that page in 4–6 minutes. You need to be signed in to GitHub.',
    reelGoWeb: 'Continue on GitHub',
    reelOpened: 'GitHub opened in a new tab. Tap “Submit new issue”; the video links appear there in 4–6 minutes.',
  },
};

let LANG = 'tr';
const LOC = () => (LANG === 'tr' ? 'tr-TR' : 'en-GB');
function t(key, vars) {
  let s = I18N[LANG][key] ?? I18N.tr[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split('{' + k + '}').join(v);
  return s;
}

// English is the default for everyone; Turkish only when the visitor picked it with the TR/EN switch.
function detectLang() {
  try { if (localStorage.getItem('odds-lang') === 'tr') return 'tr'; } catch { /* ignore */ }
  return 'en';
}

function applyStaticTexts() {
  document.documentElement.lang = LANG;
  document.title = t('title');
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
  for (const b of document.querySelectorAll('#segLang button')) b.classList.toggle('on', b.dataset.v === LANG);
  if (MODE === 'web') { // reels go through GitHub here
    document.querySelector('#dlgReel .hint').textContent = t('reelHintWeb');
    $('reelGo').textContent = t('reelGoWeb');
  }
}

function setLang(lang) {
  LANG = lang;
  try { localStorage.setItem('odds-lang', lang); } catch { /* ignore */ }
  applyStaticTexts();
  $('tol').value = fmtOdd(S.tol);
  for (const k of ODD_INPUTS) { const n = parseNum($(k).value); if (n && n > 1) $(k).value = fmtOdd(n); }
  if (S.meta) { renderStatus(); renderBulletin(); renderLeagues(); }
  const id = $('bulletin').value; if (id) showPicked(S.fixtures.find((x) => fixtureId(x) === id));
  analyze();
}

// =====================================================================
// State, formatting, helpers
// =====================================================================
const S = {
  matches: [], fixtures: [], lgCounts: [], meta: null,
  mode: 'tol', tol: 0.05, range: 'all', lgSel: new Set(),
  sortBy: 'date', shown: 150, last: null,
};

const fmtOdd = (v) => (v == null ? '' : LANG === 'tr' ? Number(v).toFixed(2).replace('.', ',') : Number(v).toFixed(2));
const fmtInt = (n) => n.toLocaleString(LOC());
const fmtNum = (x, d) => x.toLocaleString(LOC(), { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = (x) => (LANG === 'tr' ? '%' + fmtNum(x * 100, 1) : fmtNum(x * 100, 1) + '%');
const fmtDate = (iso) => (iso ? (LANG === 'tr' ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`) : '');
const fmtDateTime = (d) => `${d.toLocaleDateString(LOC())} ${d.toLocaleTimeString(LOC(), { hour: '2-digit', minute: '2-digit' })}`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lgName = (code) => LEAGUE_NAMES[LANG][code] || code;
const localIso = (d) => d.toLocaleDateString('sv-SE');
const drawLabel = (r) => (r === '0' ? t('drawShort') : r);
function parseNum(s) {
  const v = String(s ?? '').trim().replace(',', '.');
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

let toastTimer;
function toast(msg, isErr = false, ms = 5000) {
  const el = $('toast');
  el.textContent = msg; el.className = 'toast' + (isErr ? ' err' : ''); el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

async function api(path, opts) {
  const res = await fetch(path, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status));
  return body;
}

// ---------- Preferences (convenience for this browser only) ----------
function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem('bwin-prefs') || '{}');
    if (p.mode) S.mode = p.mode;
    if (Number.isFinite(p.tol)) S.tol = p.tol;
    if (p.range) S.range = p.range;
    if (Array.isArray(p.lgSel)) S.lgSel = new Set(p.lgSel);
  } catch { /* ignore */ }
}
function savePrefs() {
  try { localStorage.setItem('bwin-prefs', JSON.stringify({ mode: S.mode, tol: S.tol, range: S.range, lgSel: [...S.lgSel] })); } catch { /* ignore */ }
}

// =====================================================================
// Loading data
// =====================================================================
async function decodeEmbedded() {
  if (typeof DecompressionStream === 'undefined') throw new Error(t('browserTooOld'));
  const bin = atob(window.EMBEDDED_DATA);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const r = JSON.parse(await new Response(stream).text());
  r.meta.today = localIso(new Date()); // the file may be opened days later: take "today" from the device
  return r;
}

async function loadData() {
  const r = EMBED ? await decodeEmbedded() : await api('/api/data');
  S.matches = r.matches; S.fixtures = r.fixtures || []; S.meta = r.meta;
  const counts = new Map();
  for (const m of S.matches) counts.set(m[C.lg], (counts.get(m[C.lg]) || 0) + 1);
  S.lgCounts = [...counts.entries()];
  for (const l of [...S.lgSel]) if (!counts.has(l)) S.lgSel.delete(l);
  renderStatus(); renderBulletin(); renderLeagues(); analyze();
}

function renderStatus() {
  const m = S.meta; if (!m) return;
  const parts = [];
  if (m.lastUpdate) parts.push(`${EMBED ? t('dataDate') : t('updatedAt')}: <b>${fmtDateTime(new Date(m.lastUpdate))}</b>`);
  else parts.push(`<span class="warn">${t('noData', { hint: t('hint_' + MODE) })}</span>`);
  if (m.total) parts.push(t('matchesRange', { n: fmtInt(m.total), from: fmtDate(m.from), to: fmtDate(m.to) }));
  $('status').innerHTML = parts.join(' · ');
}

// =====================================================================
// Upcoming fixtures (football-data fixtures.csv)
// =====================================================================
function upcomingFixtures() {
  const today = S.meta?.today || localIso(new Date());
  return S.fixtures.filter((f) => f.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
const fixtureId = (f) => `${f.lg}|${f.date}|${f.home}|${f.away}`;

function renderBulletin() {
  const up = upcomingFixtures();
  const sel = $('bulletin'); const cur = sel.value;
  const today = S.meta?.today || localIso(new Date());
  const tomorrow = localIso(new Date(Date.now() + 864e5));
  const byDate = new Map();
  for (const f of up) { if (!byDate.has(f.date)) byDate.set(f.date, []); byDate.get(f.date).push(f); }
  let html = `<option value="">${up.length ? t('bulletinManual', { n: up.length }) : t('bulletinEmpty')}</option>`;
  for (const [d, list] of byDate) {
    const name = d === today ? t('today') + ' · ' : d === tomorrow ? t('tomorrow') + ' · ' : '';
    html += `<optgroup label="${name}${fmtDate(d)}">`;
    for (const f of list) html += `<option value="${esc(fixtureId(f))}">${esc(f.time)} · ${esc(lgName(f.lg))} · ${esc(f.home)} – ${esc(f.away)}</option>`;
    html += '</optgroup>';
  }
  sel.innerHTML = html;
  if (cur && up.some((f) => fixtureId(f) === cur)) sel.value = cur;
  renderFixtureNote();
}

// football-data collects odds on Tuesdays by 13:00 (midweek) and Fridays by 17:00 (weekend), UK time.
// UK summer time (BST): last Sunday of March – last Sunday of October.
function lastSundayUtc(year, month) { const d = new Date(Date.UTC(year, month + 1, 0, 1)); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d; }
function ukOffset(ts) { const y = new Date(ts).getUTCFullYear(); return ts >= lastSundayUtc(y, 2) && ts < lastSundayUtc(y, 9) ? 1 : 0; }
function fixtureSlots(now, dir) { // dir=1: next slots, dir=-1: previous slots
  const out = [];
  for (let i = 0; i <= 8 && out.length < 2; i++) {
    const day = new Date(now.getTime() + dir * i * 864e5);
    const wd = day.getUTCDay();
    if (wd !== 2 && wd !== 5) continue;
    const ukHour = wd === 2 ? 13 : 17;
    const base = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12);
    const ts = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), ukHour - ukOffset(base)));
    if ((dir > 0 && ts > now) || (dir < 0 && ts <= now)) out.push({ t: ts, midweek: wd === 2 });
  }
  return out;
}
const fmtSlot = (d) => d.toLocaleDateString(LOC(), { weekday: 'long', day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString(LOC(), { hour: '2-digit', minute: '2-digit' });

function renderFixtureNote() {
  const m = S.meta || {};
  const now = new Date();
  const parts = [];
  if (m.fixturesPublished) parts.push(t('fxPublished', { when: fmtSlot(new Date(m.fixturesPublished)), n: fmtInt(upcomingFixtures().length) }));
  else if (m.fixturesFetched) parts.push(t('fxFetched', { when: fmtSlot(new Date(m.fixturesFetched)) }));
  const next = fixtureSlots(now, 1);
  if (next.length) parts.push(t('fxNext', { slots: next.map((s) => `<b>${fmtSlot(s.t)}</b> ${s.midweek ? t('fxMidweek') : t('fxWeekend')}`).join(' · ') }));
  const prev = fixtureSlots(now, -1)[0];
  if (prev && m.fixturesFetched && new Date(m.fixturesFetched) < prev.t) parts.push(`<span class="warn">${t('fxStale', { hint: t('hint_' + MODE) })}</span>`);
  $('fxNote').innerHTML = parts.join('<br>');
}

function showPicked(f) {
  const box = $('picked');
  if (!f) { box.hidden = true; return; }
  box.innerHTML = `<b>${esc(f.home)} – ${esc(f.away)}</b>${fmtDate(f.date)} ${esc(f.time)} · ${esc(lgName(f.lg))}<br><small>${t('pickedNote')}</small>`;
  box.hidden = false;
}

function pickFixture(id) {
  const f = S.fixtures.find((x) => fixtureId(x) === id);
  S.picked = f || null;
  showPicked(f);
  if (!f) return;
  $('ms1').value = fmtOdd(f.o1); $('ms0').value = fmtOdd(f.o0); $('ms2').value = fmtOdd(f.o2);
  analyze();
}

// =====================================================================
// League filter
// =====================================================================
function renderLeagues() {
  const q = $('lgSearch').value.trim().toLocaleLowerCase(LOC());
  const list = S.lgCounts.slice().sort((a, b) => lgName(a[0]).localeCompare(lgName(b[0]), LOC()));
  $('lgList').innerHTML = list
    .filter(([l]) => !q || lgName(l).toLocaleLowerCase(LOC()).includes(q) || l.toLowerCase().includes(q))
    .map(([l, n]) => `<label><input type="checkbox" value="${esc(l)}" ${S.lgSel.has(l) ? 'checked' : ''}><span>${esc(lgName(l))}</span><small>${fmtInt(n)}</small></label>`)
    .join('') || `<div class="muted" style="padding:6px">${t('noLeagues')}</div>`;
  const n = S.lgSel.size;
  $('lgBtn').textContent = n === 0 ? t('allLeagues') : n <= 2 ? [...S.lgSel].map(lgName).join(', ') : t('leaguesSelected', { n });
}

// =====================================================================
// Analysis
// =====================================================================
function readInputs() {
  const v = {}; let bad = false;
  for (const k of ODD_INPUTS) {
    const el = $(k); const n = parseNum(el.value);
    const isBad = Number.isNaN(n) || (n !== null && n <= 1);
    el.classList.toggle('bad', isBad);
    if (isBad) bad = true;
    v[k] = isBad ? null : n;
  }
  return { v, bad };
}

function findMatches(target) {
  const exact = S.mode === 'exact'; const tol = S.tol + 1e-9;
  let from = null;
  if (S.range !== 'all') { const d = new Date(); d.setMonth(d.getMonth() - Number(S.range)); from = localIso(d); }
  const lg = S.lgSel.size ? S.lgSel : null;
  const out = [];
  if (exact) {
    const a = Math.round(target[0] * 100), b = Math.round(target[1] * 100), c = Math.round(target[2] * 100);
    for (const m of S.matches) {
      if (Math.round(m[C.o1] * 100) !== a || Math.round(m[C.o0] * 100) !== b || Math.round(m[C.o2] * 100) !== c) continue;
      if ((from && m[C.date] < from) || (lg && !lg.has(m[C.lg]))) continue;
      out.push(m);
    }
  } else {
    for (const m of S.matches) {
      if (Math.abs(m[C.o1] - target[0]) > tol || Math.abs(m[C.o0] - target[1]) > tol || Math.abs(m[C.o2] - target[2]) > tol) continue;
      if ((from && m[C.date] < from) || (lg && !lg.has(m[C.lg]))) continue;
      out.push(m);
    }
  }
  return out;
}

let analyzeTimer;
function scheduleAnalyze() { clearTimeout(analyzeTimer); analyzeTimer = setTimeout(analyze, 120); }

function analyze() {
  syncControls();
  const { v, bad } = readInputs();
  if (bad || v.ms1 == null || v.ms0 == null || v.ms2 == null) { showEmpty(bad ? t('badOdds') : null); return; }
  const target = [v.ms1, v.ms0, v.ms2];
  S.last = { set: findMatches(target), t: target };
  S.shown = 150;
  renderResults();
}

function showEmpty(msg) {
  $('out').hidden = true;
  const m = S.meta || { total: 0 };
  $('empty').innerHTML = `
    <h2>${esc(msg || t('emptyTitle'))}</h2>
    <p>${t('emptyP1')}</p>
    <p>${t('emptyP2', { how: t('how_' + MODE) })}</p>
    <div class="stats">
      <div><b>${fmtInt(m.total || 0)}</b><small>${t('stMatches')}</small></div>
      <div><b>${fmtInt(S.lgCounts.length)}</b><small>${t('stLeagues')}</small></div>
      <div><b>${m.from ? fmtDate(m.from) : '—'}</b><small>${t('stOldest')}</small></div>
      <div><b>${m.to ? fmtDate(m.to) : '—'}</b><small>${t('stNewest')}</small></div>
      <div><b>${fmtInt(upcomingFixtures().length)}</b><small>${t('stUpcoming')}</small></div>
    </div>`;
  $('empty').hidden = false;
}

const res = (h, a) => (h > a ? '1' : h < a ? '2' : '0');

function computeStats(set) {
  const st = {
    n: set.length, ms: { 1: 0, 0: 0, 2: 0 }, iy: { 1: 0, 0: 0, 2: 0 }, iyN: 0, htft: {},
    kg: { yes: 0, no: 0 }, iy15: { under: 0, over: 0 },
    o15: { under: 0, over: 0 }, o25: { under: 0, over: 0 }, o35: { under: 0, over: 0 },
    tg: { '0-1': 0, '2-3': 0, '4-6': 0, '7+': 0 }, goals: 0,
  };
  for (const m of set) {
    const h = m[C.fh], a = m[C.fa], total = h + a;
    st.ms[res(h, a)]++;
    st.kg[h > 0 && a > 0 ? 'yes' : 'no']++;
    st.o15[total > 1.5 ? 'over' : 'under']++;
    st.o25[total > 2.5 ? 'over' : 'under']++;
    st.o35[total > 3.5 ? 'over' : 'under']++;
    st.tg[total <= 1 ? '0-1' : total <= 3 ? '2-3' : total <= 6 ? '4-6' : '7+']++;
    st.goals += total;
    if (m[C.hh] != null) {
      const x = m[C.hh], y = m[C.ha], r = res(x, y);
      st.iyN++; st.iy[r]++;
      st.iy15[x + y > 1.5 ? 'over' : 'under']++;
      const key = r + '/' + res(h, a);
      st.htft[key] = (st.htft[key] || 0) + 1;
    }
  }
  return st;
}

// Probability implied by the entered odds, with bwin's margin removed
function implied(target) {
  const inv = target.map((x) => 1 / x); const s = inv.reduce((a, b) => a + b, 0);
  return inv.map((x) => x / s);
}

// Outcomes above this share are framed in red on the page and listed in their own reel scene
const HOT = 0.75;
// Fewer matching matches than this is not a reliable comparison: no red frames, no reels (reelrender.js checks it too)
const MIN_MATCHES = 30;
const isHot = (p, n) => n >= MIN_MATCHES && p > HOT;

function cardRows(rows, n, impl) {
  if (!n) return `<div class="na">${t('noDataCard')}</div>`;
  const max = Math.max(...rows.map((r) => r[1]));
  return rows.map(([label, cnt], i) => {
    const p = cnt / n;
    const hot = isHot(p, n) ? ' hot' : '';
    let im = '';
    if (impl) {
      const d = p - impl[i];
      const cls = d > 0.005 ? 'up' : d < -0.005 ? 'dn' : '';
      const dTxt = (d >= 0 ? '+' : '−') + Math.abs(d * 100).toLocaleString(LOC(), { maximumFractionDigits: 1 });
      im = `<div class="impl">${t('impliedBy', { p: fmtPct(impl[i]) })} · <span class="${cls}">${t('points', { d: dTxt })}</span></div>`;
    }
    return `<div class="row${cnt === max && cnt > 0 ? ' top' : ''}${hot}"><span class="k">${label}</span><span class="bar"><i style="width:${(p * 100).toFixed(1)}%"></i></span><span class="c">${fmtInt(cnt)}</span><span class="p">${fmtPct(p)}</span>${im}</div>`;
  }).join('');
}

function card(title, n, rows, impl) {
  const hot = n && rows.some(([, cnt]) => isHot(cnt / n, n)) ? ' hot' : '';
  return `<div class="card${hot}"><h3>${title}<small>${t('nMatches', { n: fmtInt(n) })}</small></h3>${cardRows(rows, n, impl)}</div>`;
}

// Outcomes above 75 % (red-framed on the page), as { title, pick, p } – for the "above 75%" reel scene
function outcomes(st) {
  const X = t('drawShort'), list = [];
  const add = (title, n, rows) => { for (const [pick, cnt] of rows) if (isHot(cnt / n, n)) list.push({ title, pick: String(pick), p: cnt / n }); };
  add(t('cardFT'), st.n, [['1', st.ms[1]], [X, st.ms[0]], ['2', st.ms[2]]]);
  add(t('cardHT'), st.iyN, [['1', st.iy[1]], [X, st.iy[0]], ['2', st.iy[2]]]);
  add(t('cardBTTS'), st.n, [[t('yes'), st.kg.yes], [t('no'), st.kg.no]]);
  add(t('cardOU25'), st.n, [[t('under'), st.o25.under], [t('over'), st.o25.over]]);
  add(t('cardHTOU15'), st.iyN, [[t('under'), st.iy15.under], [t('over'), st.iy15.over]]);
  add(t('cardOU15'), st.n, [[t('under'), st.o15.under], [t('over'), st.o15.over]]);
  add(t('cardOU35'), st.n, [[t('under'), st.o35.under], [t('over'), st.o35.over]]);
  add(t('cardGoals'), st.n, Object.entries(st.tg));
  add(t('cardHTFT'), st.iyN, Object.entries(st.htft).map(([k, c]) => [k.split('/').map(drawLabel).join('/'), c]));
  return list;
}

function renderResults() {
  const { set, t: target } = S.last;
  const st = computeStats(set);
  $('empty').hidden = true; $('out').hidden = false;
  $('nMatch').textContent = fmtInt(st.n);

  const margin = target.reduce((s, x) => s + 1 / x, 0) - 1;
  const tolTxt = S.mode === 'exact' ? t('exact') : `±${fmtOdd(S.tol)}`;
  let note = '';
  if (st.n && st.iyN < st.n) note += ` · <span class="warn">${t('noHtScores', { n: fmtInt(st.n - st.iyN), m: fmtInt(st.iyN) })}</span>`;
  if (st.n < MIN_MATCHES) note += ` · <span class="warn">${t('smallSample')}</span>`;
  const leaguesTxt = S.lgSel.size ? t('nLeagues', { n: S.lgSel.size }) : t('allLeagues').toLocaleLowerCase(LOC());
  $('crit').innerHTML = `<b>${t('oddsLabel')}</b> ${target.map(fmtOdd).join(' / ')} (${t('margin', { p: fmtPct(margin) })}) · ${tolTxt}<br>` +
    `${t('rangeText_' + S.range)} · ${leaguesTxt}${st.n ? ' · ' + t('avgGoals', { g: fmtNum(st.goals / st.n, 2) }) : ''}${note}`;

  const X = t('drawShort');
  const cards = [];
  cards.push(card(t('cardFT'), st.n, [['1', st.ms[1]], [X, st.ms[0]], ['2', st.ms[2]]], implied(target)));
  cards.push(card(t('cardHT'), st.iyN, [['1', st.iy[1]], [X, st.iy[0]], ['2', st.iy[2]]]));
  cards.push(card(t('cardBTTS'), st.n, [[t('yes'), st.kg.yes], [t('no'), st.kg.no]]));
  cards.push(card(t('cardOU25'), st.n, [[t('under'), st.o25.under], [t('over'), st.o25.over]]));
  cards.push(card(t('cardHTOU15'), st.iyN, [[t('under'), st.iy15.under], [t('over'), st.iy15.over]]));
  cards.push(card(t('cardOU15'), st.n, [[t('under'), st.o15.under], [t('over'), st.o15.over]]));
  cards.push(card(t('cardOU35'), st.n, [[t('under'), st.o35.under], [t('over'), st.o35.over]]));
  cards.push(card(t('cardGoals'), st.n, Object.entries(st.tg)));
  let htft = `<div class="na">${t('noDataCard')}</div>`, htftHot = '';
  if (st.iyN) {
    const max = Math.max(...Object.values(st.htft));
    htft = `<table class="htft"><tr><th>${t('htftCorner')}</th><th>1</th><th>${X}</th><th>2</th></tr>`;
    for (const a of ['1', '0', '2']) {
      htft += `<tr><th>${drawLabel(a)}</th>`;
      for (const b of ['1', '0', '2']) {
        const n = st.htft[a + '/' + b] || 0; const p = n / st.iyN;
        const hot = isHot(p, st.iyN);
        if (hot) htftHot = ' hot';
        htft += `<td class="${n === max ? 'top' : ''}${hot ? ' hot' : ''}" style="background:color-mix(in srgb, var(--accent) ${Math.round(p * 70)}%, transparent)"><b>${drawLabel(a)}/${drawLabel(b)}</b><small>${fmtInt(n)} · ${fmtPct(p)}</small></td>`;
      }
      htft += '</tr>';
    }
    htft += '</table>';
  }
  cards.push(`<div class="card wide${htftHot}"><h3>${t('cardHTFT')}<small>${t('nMatches', { n: fmtInt(st.iyN) })}</small></h3>${htft}</div>`);
  $('cards').innerHTML = cards.join('');
  renderList();
}

function renderList() {
  const { set, t: target } = S.last;
  const list = set.slice();
  if (S.sortBy === 'near') {
    const dist = (m) => Math.abs(m[C.o1] - target[0]) + Math.abs(m[C.o0] - target[1]) + Math.abs(m[C.o2] - target[2]);
    list.sort((a, b) => dist(a) - dist(b) || b[C.date].localeCompare(a[C.date]));
  } else {
    list.sort((a, b) => b[C.date].localeCompare(a[C.date]));
  }
  $('tbody').innerHTML = list.slice(0, S.shown).map((m) => {
    const r = res(m[C.fh], m[C.fa]);
    const td = (k, hit) => `<td class="${hit ? 'hit' : ''}">${fmtOdd(m[k])}</td>`;
    return `<tr><td>${fmtDate(m[C.date])}</td><td class="lg l">${esc(lgName(m[C.lg]))}</td>` +
      `<td class="l">${esc(m[C.home])}<span class="vs">–</span>${esc(m[C.away])}</td>` +
      td(C.o1, r === '1') + td(C.o0, r === '0') + td(C.o2, r === '2') +
      `<td>${m[C.hh] != null ? m[C.hh] + '-' + m[C.ha] : '–'}</td><td class="sc">${m[C.fh]}-${m[C.fa]}</td></tr>`;
  }).join('') || `<tr><td colspan="8" class="muted" style="padding:18px">${t('noMatches')}</td></tr>`;
  const rest = list.length - S.shown;
  $('btnMore').hidden = rest <= 0;
  $('btnMore').textContent = t('showMore', { n: fmtInt(rest) });
}

// ---------- Control states ----------
function syncControls() {
  for (const b of document.querySelectorAll('#segMode button')) b.classList.toggle('on', b.dataset.v === S.mode);
  for (const b of document.querySelectorAll('#segRange button')) b.classList.toggle('on', b.dataset.v === S.range);
  $('tolRow').style.opacity = S.mode === 'exact' ? '.45' : '1';
  $('tol').disabled = S.mode === 'exact';
}

function setTol(x) {
  S.tol = Math.max(0, Math.min(2, Math.round(x * 100) / 100));
  $('tol').value = fmtOdd(S.tol);
  savePrefs(); analyze();
}

// =====================================================================
// Update (server mode only)
// =====================================================================
function setBusy(on, label) {
  const btn = $('btnUpdate');
  btn.disabled = on; btn.classList.toggle('busy', on);
  btn.querySelector('.lbl').textContent = label || t('update');
}

async function pollUpdate() {
  const bar = $('progress');
  bar.hidden = false;
  for (;;) {
    const j = await api('/api/update');
    const pct = j.total ? Math.round((j.done / j.total) * 100) : 0;
    bar.firstElementChild.style.width = pct + '%';
    setBusy(true, j.total > 30 ? t('downloading', { p: pct }) : t('updating'));
    if (!j.running) {
      bar.hidden = true; setBusy(true, t('reloading')); // stay busy until the data has been reloaded
      if (j.error) throw new Error(j.error);
      return j.summary;
    }
    await new Promise((r) => setTimeout(r, 700));
  }
}

async function runUpdate() {
  setBusy(true, t('updating'));
  try {
    await api('/api/update', { method: 'POST' });
    const s = await pollUpdate();
    toast(t('updatedToast', { added: fmtInt(s.added), updated: fmtInt(s.updated), fixtures: fmtInt(s.fixtures), total: fmtInt(s.total) }) +
      (s.failedCount ? t('failedFilesNote', { n: s.failedCount }) : ''));
    await loadData();
  } catch (e) {
    toast(t('updateFailed', { e: e.message }), true, 9000);
  } finally {
    setBusy(false); $('progress').hidden = true;
  }
}

function showLastLog() {
  const s = S.meta?.summary; const body = $('logBody');
  if (!s) body.innerHTML = `<p class="muted">${t('noUpdateYet')}</p>`;
  else {
    const seasons = (s.seasons || []).map((x) => x.slice(0, 2) + '/' + x.slice(2));
    body.innerHTML = `<dl>
      <dt>${t('logTime')}</dt><dd>${fmtDateTime(new Date(S.meta.lastUpdate))}</dd>
      <dt>${t('logSeasons')}</dt><dd>${seasons.length > 4 ? t('logSeasonsRange', { a: seasons[0], b: seasons[seasons.length - 1], n: seasons.length }) : seasons.join(', ')}</dd>
      <dt>${t('logFiles')}</dt><dd>${fmtInt(s.files)}</dd>
      <dt>${t('logAdded')}</dt><dd>${fmtInt(s.added)}</dd>
      <dt>${t('logUpdated')}</dt><dd>${fmtInt(s.updated)}</dd>
      <dt>${t('logFixtures')}</dt><dd>${fmtInt(s.fixtures)}</dd>
      <dt>${t('logTotal')}</dt><dd>${fmtInt(s.total)}</dd></dl>
      ${s.failedCount ? `<p class="muted">${t('logFailed', { n: s.failedCount })}</p><pre>${esc(s.failed.join('\n'))}</pre>` : ''}`;
  }
  $('dlgLog').showModal();
}

// ---------- Import from backup ----------
let impText = null;
async function onImpFile(file) {
  impText = null; $('impGo').disabled = true;
  if (!file) { $('impInfo').textContent = ''; return; }
  impText = await file.text();
  $('impInfo').innerHTML = t('fileChosen', { name: esc(file.name), mb: fmtNum(file.size / 1048576, 1) });
  $('impGo').disabled = false;
}
async function doImport() {
  if (!impText) return;
  $('impGo').disabled = true; $('impGo').textContent = t('importing');
  try {
    const r = await api('/api/import', { method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: impText });
    const s = r.summary;
    toast(t('importedToast', {
      added: fmtInt(s.added), updated: fmtInt(s.updated), unchanged: fmtInt(s.unchanged), total: fmtInt(s.total),
      invalid: s.invalid ? t('invalidRows', { n: fmtInt(s.invalid) }) : '',
    }), false, 8000);
    $('dlgImport').close();
    await loadData();
  } catch (e) {
    $('impInfo').innerHTML = `<span class="err">${esc(e.message)}</span>`;
  } finally {
    $('impGo').disabled = false; $('impGo').textContent = t('import');
  }
}

// =====================================================================
// Instagram Reels (server mode only)
// =====================================================================
function openReelDialog() {
  const f = S.picked;
  if (f) {
    $('reelHome').value = f.home; $('reelAway').value = f.away; $('reelLeague').value = lgName(f.lg);
    $('reelDate').value = f.date; $('reelTime').value = /^\d{2}:\d{2}$/.test(f.time) ? f.time : '';
  } else if (!$('reelDate').value) {
    $('reelDate').value = localIso(new Date());
  }
  $('reelStatus').hidden = true; $('reelResult').hidden = true;
  const n = S.last?.set.length || 0;
  $('reelPhase').textContent = n < MIN_MATCHES ? t('reelSmall', { n, m: MIN_MATCHES }) : '';
  $('reelStatus').hidden = n >= MIN_MATCHES;
  $('reelStatus').querySelector('.reel-bar').hidden = true;
  $('reelGo').disabled = n < MIN_MATCHES;
  $('dlgReel').showModal();
}

// The reel is made in every language of REEL_LANGS (one Instagram account each), whatever the page language is.
const REEL_LANGS = ['en', 'tr'];

// League typed in the dialog → the same league in another language (free text is kept as typed)
function reelLeagueIn(lang) {
  const v = $('reelLeague').value.trim();
  for (const names of Object.values(LEAGUE_NAMES)) {
    const code = Object.keys(names).find((c) => names[c] === v);
    if (code) return LEAGUE_NAMES[lang][code];
  }
  return v;
}

function buildReelProps(lang) {
  const saved = LANG;
  LANG = lang; // t(), fmtOdd() and fmtDate() follow LANG
  try { return reelPropsNow(); } finally { LANG = saved; }
}

function reelPropsNow() {
  const { set, t: target } = S.last;
  const st = computeStats(set);
  const n = st.n, iy = st.iyN;
  const dateIso = $('reelDate').value;
  const htft = Object.entries(st.htft).map(([k, c]) => ({ k, p: c / iy })).sort((a, b) => b.p - a.p).slice(0, 3);
  const leaguesTxt = S.lgSel.size ? t('nLeagues', { n: S.lgSel.size }) : t('allLeagues').toLocaleLowerCase(LOC());
  return {
    lang: LANG,
    match: { home: $('reelHome').value.trim(), away: $('reelAway').value.trim(), league: reelLeagueIn(LANG), date: fmtDate(dateIso), dateIso, time: $('reelTime').value },
    odds: target, n, exact: S.mode === 'exact', tolText: `±${fmtOdd(S.tol)}`,
    filterText: `${t('rangeText_' + S.range)} · ${leaguesTxt}`,
    ft: [st.ms[1] / n, st.ms[0] / n, st.ms[2] / n], implied: implied(target),
    ht: iy ? [st.iy[1] / iy, st.iy[0] / iy, st.iy[2] / iy] : [0, 0, 0], htN: iy,
    btts: st.kg.yes / n, ou15: st.o15.over / n, ou25: st.o25.over / n, ou35: st.o35.over / n,
    avgGoals: st.goals / n, htft,
    hot: outcomes(st).sort((a, b) => b.p - a.p).slice(0, 4),
  };
}

async function createReel() {
  if ((S.last?.set.length || 0) < MIN_MATCHES) return;
  if (!$('reelHome').value.trim() || !$('reelAway').value.trim()) { $('reelStatus').hidden = false; $('reelPhase').textContent = t('reelNeedTeams'); return; }
  const go = $('reelGo'); const bar = $('reelStatus').querySelector('.reel-bar');
  go.disabled = true; go.textContent = t('reelCreating');
  $('reelResult').hidden = true; $('reelStatus').hidden = false; bar.hidden = false; bar.firstElementChild.style.width = '0%';
  try {
    await api('/api/reel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(REEL_LANGS.map(buildReelProps)) });
    for (;;) {
      const j = await api('/api/reel');
      const frac = j.total ? j.done / j.total : 0;
      // rendering = first 85 %, encoding = the rest
      bar.firstElementChild.style.width = Math.round((j.phase === 'encoding' ? 0.85 + 0.15 * frac : 0.85 * frac) * 100) + '%';
      const phase = (j.phase === 'rendering' || j.phase === 'encoding') && !j.total ? 'preparing' : j.phase; // bundling: no frame counts yet
      const step = j.steps > 1 ? t('reelStep', { lang: t('reelLang_' + j.lang), s: j.step, n: j.steps }) + ' · ' : '';
      $('reelPhase').textContent = step + t('reelPhase_' + (phase in { preparing: 1, installing: 1, rendering: 1, encoding: 1 } ? phase : 'preparing'), { d: j.done, t: j.total });
      if (!j.running) {
        if (j.error) throw new Error(j.error);
        if (j.files && j.files.length) {
          bar.firstElementChild.style.width = '100%';
          $('reelPhase').textContent = '';
          $('reelVideos').innerHTML = j.files.map((f) => {
            const lang = (/_([a-z]{2})\.mp4$/.exec(f) || [])[1];
            return `<figure><figcaption>${esc(lang ? t('reelLang_' + lang) : '')}</figcaption><video controls playsinline preload="metadata" src="/api/reel/file?name=${encodeURIComponent(f)}&v=${Date.now()}"></video></figure>`;
          }).join('');
          $('reelSaved').innerHTML = t('reelSaved', { names: j.files.map(esc).join(', ') });
          $('reelResult').hidden = false;
        }
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch (e) {
    $('reelPhase').textContent = t('reelFailed', { e: e.message });
  } finally {
    go.disabled = false; go.textContent = t('reelCreate');
  }
}

// Web mode: open a pre-filled GitHub issue; the "Make reel" workflow renders the video and replies with a link.
function createReelOnGitHub() {
  if ((S.last?.set.length || 0) < MIN_MATCHES) return;
  if (!$('reelHome').value.trim() || !$('reelAway').value.trim()) { $('reelStatus').hidden = false; $('reelPhase').textContent = t('reelNeedTeams'); return; }
  const all = REEL_LANGS.map(buildReelProps);
  const p = all[0], m = p.match;
  const odds = p.odds.map((o) => o.toFixed(2)).join(' / ');
  const body = [
    'Reel request from Odds Memory – submit this issue to create the videos (English and Turkish).',
    '',
    '| | |', '|---|---|',
    `| Match | ${m.home} – ${m.away} |`,
    `| League / date | ${[m.league, m.date, m.time].filter(Boolean).join(' · ')} |`,
    `| bwin odds (1 / X / 2) | ${odds} |`,
    `| Matching | ${p.n} matches · ${p.exact ? 'exact odds' : p.tolText} · ${p.filterText} |`,
    '',
    'The video links will be posted here in 4–6 minutes.',
    '',
    '<!-- Data for the video – please do not edit. -->',
    '```json', JSON.stringify(all), '```',
  ].join('\n');
  const url = `https://github.com/${REEL_REPO}/issues/new?title=${encodeURIComponent(`Reel: ${m.home} – ${m.away}`)}&body=${encodeURIComponent(body)}`;
  window.open(url, '_blank', 'noopener');
  $('reelStatus').hidden = false; $('reelStatus').querySelector('.reel-bar').hidden = true;
  $('reelPhase').textContent = t('reelOpened');
}

// =====================================================================
// Events
// =====================================================================
function bind() {
  for (const k of ODD_INPUTS) {
    $(k).addEventListener('input', scheduleAnalyze);
    $(k).addEventListener('blur', () => { const n = parseNum($(k).value); if (n && n > 1) $(k).value = fmtOdd(n); });
  }
  $('segLang').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && b.dataset.v !== LANG) setLang(b.dataset.v); });
  $('bulletin').addEventListener('change', (e) => pickFixture(e.target.value));
  $('btnClear').addEventListener('click', () => {
    for (const k of ODD_INPUTS) { $(k).value = ''; $(k).classList.remove('bad'); }
    $('bulletin').value = ''; $('picked').hidden = true; S.picked = null;
    analyze(); $('ms1').focus();
  });
  $('segMode').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; S.mode = b.dataset.v; savePrefs(); analyze(); });
  $('segRange').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; S.range = b.dataset.v; savePrefs(); analyze(); });
  for (const b of document.querySelectorAll('.tol-row .step')) b.addEventListener('click', () => setTol(S.tol + Number(b.dataset.d)));
  $('tol').addEventListener('change', () => { const n = parseNum($('tol').value); setTol(Number.isFinite(n) ? n : 0.05); });
  $('sortBy').addEventListener('change', (e) => { S.sortBy = e.target.value; S.shown = 150; if (S.last) renderList(); });
  $('btnMore').addEventListener('click', () => { S.shown += 300; renderList(); });

  const pop = $('lgPop');
  $('lgBtn').addEventListener('click', () => { pop.hidden = !pop.hidden; $('lgBtn').setAttribute('aria-expanded', String(!pop.hidden)); if (!pop.hidden) $('lgSearch').focus(); });
  $('lgSearch').addEventListener('input', renderLeagues);
  $('lgList').addEventListener('change', (e) => {
    const l = e.target.value; if (e.target.checked) S.lgSel.add(l); else S.lgSel.delete(l);
    savePrefs(); renderLeagues(); scheduleAnalyze();
  });
  $('lgNone').addEventListener('click', () => { S.lgSel.clear(); savePrefs(); renderLeagues(); analyze(); });

  const menu = $('dataMenu');
  $('btnData').addEventListener('click', () => { menu.hidden = !menu.hidden; $('btnData').setAttribute('aria-expanded', String(!menu.hidden)); });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu-wrap')) menu.hidden = true;
    if (!e.target.closest('.ms-wrap')) pop.hidden = true;
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a,button')) menu.hidden = true; });
  $('btnUpdate').addEventListener('click', runUpdate);
  $('btnLastLog').addEventListener('click', showLastLog);
  $('btnImport').addEventListener('click', () => { $('impFile').value = ''; $('impInfo').textContent = ''; $('impGo').disabled = true; $('dlgImport').showModal(); });
  $('impFile').addEventListener('change', (e) => onImpFile(e.target.files[0]));
  $('impGo').addEventListener('click', doImport);
  $('btnReel').addEventListener('click', openReelDialog);
  $('reelGo').addEventListener('click', () => (MODE === 'web' ? createReelOnGitHub() : createReel()));
}

// =====================================================================
// Start
// =====================================================================
LANG = detectLang();
loadPrefs();
applyStaticTexts();
bind();
$('tol').value = fmtOdd(S.tol);
syncControls();
if (EMBED) { // update, export and video rendering need the local server
  document.querySelector('.actions').hidden = true;
  $('btnReel').hidden = !REEL_REPO; // web: via GitHub; downloaded file: not available
}
$('status').textContent = t('loadingData');
loadData()
  .then(async () => {
    if (EMBED) return;
    // If an update is already running (e.g. the one started by start.bat), show its progress
    const j = await api('/api/update');
    if (j.running) {
      try { await pollUpdate(); await loadData(); } finally { setBusy(false); }
    }
  })
  .catch((e) => {
    if (EMBED) {
      $('status').textContent = t('loadFailed', { e: e.message });
      showEmpty(t('loadFailed', { e: e.message }));
      return;
    }
    $('status').textContent = t('serverDownStatus', { e: e.message });
    showEmpty(t('serverDown'));
  });
