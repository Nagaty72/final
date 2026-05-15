const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const mid = Math.floor(content.length / 2);
      const half1 = content.slice(0, mid);
      const half2 = content.slice(mid);
      
      // Often files are exactly doubled, perhaps with a newline
      if (half1 === half2 || half1.trim() === half2.trim()) {
        console.log(`Fixing exact duplicate: ${fullPath}`);
        fs.writeFileSync(fullPath, half1.trim() + '\n');
        continue;
      }

      // Sometimes they are appended like: content + '\n' + content
      // Let's check for the exact string repeating.
      // We know there's a problem if we find multiple "export default function" with the SAME name.
      const match = content.match(/export default function (\w+)/);
      if (match) {
        const funcName = match[1];
        const occurrences = [...content.matchAll(new RegExp(`export default function ${funcName}`, 'g'))];
        if (occurrences.length === 2) {
          const secondIdx = occurrences[1].index;
          const part1 = content.substring(0, secondIdx);
          const part2 = content.substring(secondIdx);
          if (part1.trim() === part2.trim()) {
            console.log(`Fixing duplicate export: ${fullPath}`);
            fs.writeFileSync(fullPath, part1.trim() + '\n');
            continue;
          }
        }
      }
      
      // What about components that start with "import"?
      const firstLineMatch = content.match(/^.*$/m);
      if (firstLineMatch) {
        const firstLine = firstLineMatch[0];
        if (firstLine.trim().length > 0) {
          const secondIdx = content.indexOf(firstLine, firstLine.length);
          if (secondIdx > 0) {
             const p1 = content.substring(0, secondIdx);
             const p2 = content.substring(secondIdx);
             if (p1.trim() === p2.trim()) {
               console.log(`Fixing duplicate based on first line: ${fullPath}`);
               fs.writeFileSync(fullPath, p1.trim() + '\n');
             }
          }
        }
      }
    }
  }
}

processDir(path.join(__dirname, 'frontend/src'));
console.log('Cleanup complete');
