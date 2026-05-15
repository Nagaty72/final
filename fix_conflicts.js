const fs = require('fs');
const path = require('path');

const filesToFix = [
  'frontend/src/app/(protected)/dashboard/page.jsx',
  'frontend/src/app/(protected)/hospitals/page.jsx',
  'frontend/src/app/(protected)/settings/page.jsx',
  'frontend/src/app/login/page.jsx',
  'frontend/src/components/AppShell.jsx',
  'frontend/src/components/Sidebar.jsx',
  'backend/src/server.js'
];

for (const relPath of filesToFix) {
  const fullPath = path.join(__dirname, relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${fullPath}`);
    continue;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  if (relPath.includes('backend/src/server.js')) {
    // Find the second "import express from 'express';"
    const marker = "import express from 'express';";
    const firstIdx = content.indexOf(marker);
    if (firstIdx !== -1) {
      const secondIdx = content.indexOf(marker, firstIdx + marker.length);
      if (secondIdx !== -1) {
        content = content.substring(0, secondIdx);
        fs.writeFileSync(fullPath, content.trim() + '\n');
        console.log(`Fixed: ${relPath}`);
      }
    }
  } else {
    // Frontend files: Find the second "'use client';" or "import React"
    const marker1 = "'use client';";
    const firstIdx1 = content.indexOf(marker1);
    if (firstIdx1 !== -1) {
      const secondIdx1 = content.indexOf(marker1, firstIdx1 + marker1.length);
      if (secondIdx1 !== -1) {
        content = content.substring(0, secondIdx1);
        fs.writeFileSync(fullPath, content.trim() + '\n');
        console.log(`Fixed: ${relPath}`);
        continue;
      }
    }
    
    // Fallback if no use client
    const marker2 = "import React";
    const firstIdx2 = content.indexOf(marker2);
    if (firstIdx2 !== -1) {
      const secondIdx2 = content.indexOf(marker2, firstIdx2 + marker2.length);
      if (secondIdx2 !== -1) {
        // Also check if this is genuinely a restart of the file and not just a valid import inside a component (rare)
        content = content.substring(0, secondIdx2);
        fs.writeFileSync(fullPath, content.trim() + '\n');
        console.log(`Fixed fallback: ${relPath}`);
      }
    }
  }
}
