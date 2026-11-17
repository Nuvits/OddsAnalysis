'use strict';
// Reads a "Reel:" issue (opened from the site's "Create reel" button), extracts the ```json block
// (one reel or a list of reels, one per language), validates it and writes reel-props.json.
// Step output: title. The issue body is read from the event file – never interpolated into shell commands.

const fs = require('fs');
const path = require('path');
const { validateRequest } = require(path.join(__dirname, '..', '..', 'reelrender.js'));

const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const body = (event.issue && event.issue.body) || '';
const m = /```json\s*([\s\S]*?)```/.exec(body);
if (!m) {
  console.error('No ```json block found in the issue body.');
  process.exit(1);
}

let list;
try {
  list = validateRequest(JSON.parse(m[1]));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

fs.writeFileSync('reel-props.json', JSON.stringify(list));
const title = `${list[0].match.home} – ${list[0].match.away}`.replace(/[\r\n]/g, ' ');
fs.appendFileSync(process.env.GITHUB_OUTPUT, `title=${title}\n`);
console.log(`Reel request OK: ${title} (${list.map((p) => p.lang).join(', ')})`);
