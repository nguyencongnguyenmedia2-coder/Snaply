const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 [Build] Starting Expo Web export...');
execSync('npx expo export -p web', { stdio: 'inherit' });

const distDir = path.resolve(__dirname, '..', 'dist');
const landingDir = path.resolve(__dirname, '..', 'landing');
const distLandingDir = path.join(distDir, 'landing');

if (fs.existsSync(landingDir)) {
  console.log('📂 [Build] Copying landing page into dist/landing...');
  fs.cpSync(landingDir, distLandingDir, { recursive: true });
}

console.log('✨ [Build] Production web build completed in dist/!');
