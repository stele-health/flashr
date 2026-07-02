#!/usr/bin/env node
/*
 * sign-app.js - deep-sign Flashr.app for Developer ID notarization.
 *
 * Uses the @electron/osx-sign v2 JavaScript API (the installed version). The old
 * v1 CLI flags (--entitlements=, --hardened-runtime, --no-gatekeeper-assess) are
 * NOT parsed the same way by v2, so we call sign() directly to guarantee the
 * hardened runtime + entitlements are actually applied. Without hardened runtime,
 * Apple's notary service rejects the build.
 *
 * It also signs the bundled Vision OCR helper (Contents/Resources/app/bin/ocr) via
 * the `binaries` option: it is a loose Mach-O that osx-sign does not otherwise
 * descend into, so it would be left unsigned and fail notarization.
 *
 * Usage:  IDENTITY="Developer ID Application: Name (TEAMID)" node sign-app.js [app]
 */
const path = require('path');
const fs = require('fs');
const { sign } = require('@electron/osx-sign');

const identity = process.env.IDENTITY || process.argv[2];
const app = path.resolve(process.argv[3] || 'dist/Flashr-darwin-arm64/Flashr.app');
const entitlements = path.resolve(__dirname, 'entitlements.mac.plist');
const ocr = path.join(app, 'Contents/Resources/app/bin/ocr');

if (!identity || identity.startsWith('Developer ID Application:') === false) {
  console.error('ERROR: set IDENTITY to your full "Developer ID Application: Name (TEAMID)" string.');
  process.exit(1);
}
if (!fs.existsSync(app)) { console.error(`ERROR: app not found: ${app} (run "npm run build" first)`); process.exit(1); }
if (!fs.existsSync(ocr)) { console.error(`ERROR: OCR helper not found: ${ocr} (build must be asar-off)`); process.exit(1); }

sign({
  app,
  identity,
  platform: 'darwin',          // non-MAS (Squirrel.framework present) => Developer ID
  type: 'distribution',
  binaries: [ocr],             // explicitly sign the loose Vision helper
  optionsForFile: () => ({
    hardenedRuntime: true,     // mandatory for notarization
    entitlements,              // Electron JIT / unsigned-memory / library-validation set
  }),
}).then(() => {
  console.log(`Signed ${app}\n  identity: ${identity}`);
}).catch((err) => {
  console.error('Signing failed:', err && err.message ? err.message : err);
  process.exit(1);
});
