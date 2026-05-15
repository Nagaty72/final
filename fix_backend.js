const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Look for duplicate `import ...` block at the start
      const firstLines = content.split('\n').filter(l => l.trim().startsWith('import '));
      if (firstLines.length > 0) {
        const marker = firstLines[0];
        const firstIdx = content.indexOf(marker);
        if (firstIdx !== -1) {
          const secondIdx = content.indexOf(marker, firstIdx + marker.length);
          if (secondIdx !== -1 && secondIdx > content.length * 0.4) {
             const part1 = content.substring(0, secondIdx);
             const part2 = content.substring(secondIdx);
             
             // Very rough check: if part1 has a similar size
             if (Math.abs(part1.length - part2.length) < part1.length * 0.3 || part1.trim() === part2.trim()) {
               fs.writeFileSync(fullPath, part1.trim() + '\n');
               console.log(`Fixed duplication in: ${fullPath}`);
             }
          }
        }
      }
    }
  }
}

processDir(path.join(__dirname, 'backend/src'));
