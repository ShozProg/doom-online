const fs = require('fs');
const path = require('path');

const sourceListPath = path.join(__dirname, 'website/js/libSourceFiles.json');
const originalFiles = JSON.parse(fs.readFileSync(sourceListPath, 'utf8'));

console.log('Building DOOM bundle from', originalFiles.length, 'files...');

const contents = [];
for (const rel of originalFiles) {
    const fullPath = path.join(__dirname, 'website', rel.replace(/^\//, ''));
    if (!fs.existsSync(fullPath)) {
        throw new Error('Missing file: ' + fullPath);
    }
    const code = fs.readFileSync(fullPath, 'utf8');
    contents.push('// === ' + rel + ' ===\n' + code);
}

const bundleCode = contents.join('\n;\n');
fs.writeFileSync(path.join(__dirname, 'website/js/doom.bundle.js'), bundleCode, 'utf8');
console.log('Created website/js/doom.bundle.js (size: ' + (bundleCode.length / 1024).toFixed(1) + ' KB)');

// Now update libBootstrap.json
const bootstrapPath = path.join(__dirname, 'website/js/libBootstrap.json');
const manifest = JSON.parse(fs.readFileSync(bootstrapPath, 'utf8'));

// Only one JS bundle!
manifest.files.js = ['/js/doom.bundle.js'];

// Increment version with timestamp for perfect cache busting
const timestamp = Date.now().toString(36);
manifest.version = 'v2.0.' + timestamp;
fs.writeFileSync(bootstrapPath, JSON.stringify(manifest, null, 4), 'utf8');
console.log('Updated libBootstrap.json (version: ' + manifest.version + ')');
