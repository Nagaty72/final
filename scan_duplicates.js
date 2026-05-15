const fs = require('fs');
const path = require('path');

function checkFileForDuplication(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Check for repeated "export default"
  const exportDefaultMatches = content.match(/export default/g);
  if (exportDefaultMatches && exportDefaultMatches.length > 1) {
    return { type: 'duplicated_export_default', count: exportDefaultMatches.length };
  }

  // Check for repeated function declarations with same name
  const funcMatches = content.match(/function\s+(\w+)/g);
  if (funcMatches) {
    const names = funcMatches.map(m => m.split(/\s+/)[1]);
    const counts = {};
    for (const name of names) {
      counts[name] = (counts[name] || 0) + 1;
      if (counts[name] > 1) {
        // Double check if it's truly a duplication or just overloaded (unlikely in JS/JSX)
        // Also check if the content after the name is identical for a few characters
        return { type: 'duplicated_function', name: name };
      }
    }
  }

  // Check for repeated const exports
  const constMatches = content.match(/export const\s+(\w+)/g);
  if (constMatches) {
    const names = constMatches.map(m => m.split(/\s+/)[2]);
    const counts = {};
    for (const name of names) {
      counts[name] = (counts[name] || 0) + 1;
      if (counts[name] > 1) {
        return { type: 'duplicated_const_export', name: name };
      }
    }
  }

  return null;
}

function scanDir(dir) {
  const results = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'venv' && file !== '__pycache__') {
        results.push(...scanDir(fullPath));
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      const issue = checkFileForDuplication(fullPath);
      if (issue) {
        results.push({ path: fullPath, issue });
      }
    }
  }
  return results;
}

const frontendIssues = scanDir('frontend/src');
const backendIssues = scanDir('backend/src');

console.log(JSON.stringify({ frontendIssues, backendIssues }, null, 2));
