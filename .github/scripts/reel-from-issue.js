'use strict';
// Reads a "Reel:" issue (opened from the site's "Create reel" button), extracts the ```json block,
// validates it and writes reel-props.json. Step outputs: file (mp4 name) and title.
// The issue body is read from the event file – never interpolated into shell commands.

const fs = require('fs');
const path = require('path');
const { validateProps, fileNameFor } = require(path.join(__dirname, '..', '..', 'reelrender.js'));

const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const body = (event.issue && event.issue.body) || '';
const m = /```json\s*([\s\S]*?)```/.exec(body);
if (!m) {
  console.error('No ```json block found in the issue body.');
  process.exit(1);
}

let props;
try {
  props = validateProps(JSON.parse(m[1]));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

fs.writeFileSync('reel-props.json', JSON.stringify(props));
const file = fileNameFor(props);
const title = `${props.match.home} – ${props.match.away}`.replace(/[\r\n]/g, ' ');
fs.appendFileSync(process.env.GITHUB_OUTPUT, `file=${file}\ntitle=${title}\n`);
console.log(`Reel request OK: ${title} → ${file}`);
