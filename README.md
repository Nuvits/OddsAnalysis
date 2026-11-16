# Odds Analysis (bwin)

Enter the **bwin** full-time odds (1 / X / 2) of an upcoming football match. The page finds past matches where bwin
offered similar odds and shows how they ended: full-time and half-time result, HT/FT, both teams to score,
over/under 1.5 / 2.5 / 3.5, first-half over/under 1.5 and total goals.

The interface is available in **Turkish and English** (switch in the top bar).

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

## Files

| File | Purpose |
|---|---|
| `server.js` | Local server, update job, storage, import/export and the single-file page builder |
| `footballdata.js` | Downloads and parses the football-data.co.uk season and fixture files |
| `public/` | The page (`index.html`, `app.js`, `style.css`), including both languages |
| `.github/workflows/pages.yml` | Scheduled update and GitHub Pages deployment |

## Disclaimer

This is a statistics tool, not betting advice. Past results with similar odds do not predict future matches, and
bookmaker odds already price in most of what such statistics can show.
