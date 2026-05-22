const fs = require('fs');
const path = require('path');

const arPath = path.join(__dirname, 'frontend', 'src', 'locales', 'ar', 'translation.json');

// Read the file and strip BOM if it exists
let rawdata = fs.readFileSync(arPath, 'utf8');
if (rawdata.charCodeAt(0) === 0xFEFF) {
  rawdata = rawdata.slice(1);
}

const data = JSON.parse(rawdata);

// Make the required translation changes
if (data.sidebar && data.sidebar.hospitals) {
  data.sidebar.hospitals = "المرافق القريبة";
}

if (data.hospitals) {
  if (data.hospitals.title) {
    data.hospitals.title = "المرافق القريبة";
  }
  if (data.hospitals.subtitle) {
    data.hospitals.subtitle = "شبكة GIS تفاعلية للمرافق القريبة والعيادات";
  }
}

// Write back as plain UTF-8 without BOM
// Node's fs.writeFileSync('...', 'utf8') writes without BOM.
fs.writeFileSync(arPath, JSON.stringify(data, null, 2) + '\n', 'utf8');

console.log('Successfully updated ar/translation.json without BOM.');
