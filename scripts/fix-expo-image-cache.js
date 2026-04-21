/**
 * Workaround for EAS Build permission issue.
 *
 * EAS creates a root-owned .expo/ directory before npm install runs.
 * @expo/image-utils hardcodes its cache path to {projectRoot}/.expo/web/
 * which fails with EACCES because .expo/ is not writable by the build user.
 *
 * This script patches the cache path to use /tmp/.expo-image-cache instead.
 */
const fs = require('fs');
const path = require('path');

const cachePath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@expo',
  'image-utils',
  'build',
  'Cache.js'
);

try {
  let content = fs.readFileSync(cachePath, 'utf8');
  if (content.includes("'.expo'")) {
    content = content.replace(/['"]\.expo['"]/g, "'/tmp/.expo-image-cache'");
    fs.writeFileSync(cachePath, content);
    console.log('Patched @expo/image-utils cache path to /tmp/.expo-image-cache');
  }
} catch (e) {
  // Silently skip if the file doesn't exist (e.g., different expo version)
}
