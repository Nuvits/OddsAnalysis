# Odds Memory

**Live site:** [nuvits.github.io/OddsAnalysis](https://nuvits.github.io/OddsAnalysis/) · **Instagram:** [@oddsmemory](https://www.instagram.com/oddsmemory/)

Enter the **bwin** full-time odds (1 / X / 2) of an upcoming football match. The page finds past matches where bwin
offered similar odds and shows how they ended: full-time and half-time result, HT/FT, both teams to score,
over/under 1.5 / 2.5 / 3.5, first-half over/under 1.5 and total goals.

The interface is in **English** by default, with Turkish available via the TR/EN switch in the top bar.

## Data

Source: [football-data.co.uk](https://www.football-data.co.uk/) – free CSV files with results and bookmaker odds.

- 22 European leagues: England (5 tiers), Scotland (4), Germany, Italy, Spain and France (top two each),
  Netherlands, Belgium, Portugal, Turkey and Greece.
- About **167,000 matches** from the 2004/05 season (when bwin odds start) to today.
- Each match has bwin's 1X2 odds (collected before closing), the half-time score and the full-time score.
- Upcoming fixtures with bwin odds come from `fixtures.csv`. football-data publishes it on Tuesdays by 13:00
  (midweek games) and on Fridays by 17:00 (weekend games), UK time.

Only bwin's 1X2 odds are used for matching. All other markets are derived from the scores of the matching matches.

## How the matching works

- **Range ± tolerance** (default 0.05) or **exact** odds.
- Filters: date range (last month … last 5 years, or all) and league.
- The full-time result card shows the probability implied by the entered odds (bwin margin removed) next to the
  historical frequency, together with the difference.

## Running it

### Online (GitHub Pages)

The workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml) downloads the data, builds a single
self-contained page and publishes it on GitHub Pages:

- **Schedule:** daily at 05:00 UTC, Tuesday 13:30 UTC (midweek odds) and Friday 17:30 UTC (weekend odds).
  GitHub may start scheduled runs a few minutes to an hour late.
- **Manual run:** *Actions → Update data and publish → Run workflow*.
- **No data in the repository:** the data is kept in the Actions cache between runs. If the cache is gone, the next
  run downloads everything again, which takes a few seconds.
- **Keep-alive:** GitHub disables scheduled workflows in public repositories after 60 days without commits, so the
  workflow pushes an empty commit every 45 days.

One-time setup: *Settings → Pages → Build and deployment → Source: **GitHub Actions***.

### Locally (Windows)

Requires [Node.js](https://nodejs.org) 18 or newer; there are no npm dependencies.

- `start.bat` starts a local server on http://localhost:3737, updates the data and opens the page.
  The local page also has update, import and export functions.
- `update.bat` runs a one-off update without the page, e.g. from Windows Task Scheduler.
- After every update, `odds-analysis.html` is written next to the scripts. It is the same single-file page with
  all data embedded (about 3 MB) and works offline. On a phone, download it and open it in a browser; the Google
  Drive app does not run it.

On other systems, run `node server.js --open` or `node server.js --update` instead.

| Option / variable | Meaning |
|---|---|
| `--open` | open the browser once the server is ready |
| `--no-update` | do not update automatically on start |
| `--update` | update once and exit |
| `ODDS_DATA_DIR` | data folder (default `./data`) |
| `ODDS_STANDALONE` | path of the single-file page (default `./odds-analysis.html`) |
| `ODDS_EMBED_MODE` | `file` (downloaded file) or `web` (self-updating site) |
| `ODDS_REEL_REPO` | `owner/repo` for the online "Create reel" button (set by the Pages workflow) |
| `ODDS_REELS_ENGINE` | where Remotion is installed (default `~/.odds-analysis/reels-engine`) |

## Instagram Reels videos

A **Create Reels video** button next to the results turns the current analysis into a silent 30-second, 1080×1920 MP4.
You add music in Instagram, where licensed tracks are available. The video has six scenes: hook, odds and number of
matches, full-time result, goals, top HT/FT outcomes, and a closing scene (call to comment, follow reminder, disclaimer).

- **Local page:** the video is rendered on your computer and saved in `reels/out/`.
- **Online page (GitHub Pages), e.g. from a phone:** the button opens a pre-filled GitHub issue titled
  `Reel: Home – Away`. Submit it, and the [`Make reel`](.github/workflows/reel.yml) workflow renders the video on
  GitHub, attaches it to a release and replies on the issue with a download link (2–4 minutes). Only issues opened
  by the repository owner are processed; the request data is validated before rendering
  ([`reelrender.js`](reelrender.js)). You must be signed in to GitHub in the phone's browser.

- The template is a [Remotion](https://www.remotion.dev) project in [`reels/`](reels/) (`src/Reel.jsx`).
- Branding: name and Instagram handle in [`reels/brand.json`](reels/brand.json); the logo is [`reels/src/logo.jpg`](reels/src/logo.jpg)
  (shown top-left in every scene and in the closing scene).
- Remotion is installed automatically the first time a video is made. It goes into
  `%USERPROFILE%\.odds-analysis\reels-engine`, outside the project, because `node_modules` does not work on
  synced drives such as Google Drive. Override the location with `ODDS_REELS_ENGINE`.
- Finished videos are saved in `reels/out/`.
- To preview or tweak the template, run `npx remotion studio src/index.jsx` in the engine folder after copying
  `reels/src` there.
- Remotion is free for individuals and small companies; larger companies need a
  [company license](https://www.remotion.dev/license).

## Files

| File | Purpose |
|---|---|
| `server.js` | Local server, update job, storage, import/export and the single-file page builder |
| `footballdata.js` | Downloads and parses the football-data.co.uk season and fixture files |
| `public/` | The page (`index.html`, `app.js`, `style.css`), including both languages |
| `reels/` | Remotion template for Instagram Reels videos and its branding settings |
| `reelrender.js` | Validates reel data and renders the video (used by the local server and the workflow) |
| `.github/workflows/pages.yml` | Scheduled update and GitHub Pages deployment |
| `.github/workflows/reel.yml` | Renders a reel when the owner opens a `Reel:` issue |

## Disclaimer

This is a statistics tool, not betting advice. Past results with similar odds do not predict future matches, and
bookmaker odds already price in most of what such statistics can show.
