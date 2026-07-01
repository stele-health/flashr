#!/usr/bin/env bash
#
# build-dmg.sh — package the built Flashr.app into a distributable Flashr.dmg.
#
# No external dependencies: uses only hdiutil (ships with macOS).
# The .dmg presents Flashr.app next to an /Applications shortcut so the user
# can drag-to-install in the standard way.
#
# Usage:  ./build-dmg.sh
# Output: dist/Flashr.dmg
#
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$HERE/dist/Flashr-darwin-arm64/Flashr.app"
OUT="$HERE/dist/Flashr.dmg"
VOLNAME="Flashr"

if [[ ! -d "$APP" ]]; then
  echo "ERROR: $APP not found. Run 'npm run build' first." >&2
  exit 1
fi

STAGING="$HERE/dist/.dmg-staging"
rm -rf "$STAGING"
mkdir -p "$STAGING"

echo "Staging app..."
cp -R "$APP" "$STAGING/Flashr.app"
# Clean Finder/quarantine metadata so the image is tidy (does NOT prevent the
# browser-applied quarantine on download — that needs notarization).
xattr -cr "$STAGING/Flashr.app" || true
ln -s /Applications "$STAGING/Applications"

# Guard: never ship a bundle with a broken/missing signature — that is what
# makes macOS report a downloaded app as "damaged." electron-packager only
# linker-signs the main binary (no sealed resources), so the app MUST be signed
# first (ad-hoc: `codesign --force --deep --sign - <app>`, or via sign-notarize.sh).
echo "Verifying code signature..."
if ! codesign --verify --deep --strict "$STAGING/Flashr.app" 2>/dev/null; then
  echo "ERROR: invalid code signature on $APP." >&2
  echo "  Fix (ad-hoc):  codesign --force --deep --sign - \"$APP\"" >&2
  echo "  Or run:        ./sign-notarize.sh   (Developer ID + notarize)" >&2
  rm -rf "$STAGING"
  exit 1
fi

echo "Creating compressed disk image..."
rm -f "$OUT"
hdiutil create \
  -volname "$VOLNAME" \
  -srcfolder "$STAGING" \
  -fs HFS+ \
  -format UDZO \
  -imagekey zlib-level=9 \
  -ov \
  "$OUT" >/dev/null

rm -rf "$STAGING"

echo "Done: $OUT"
ls -lh "$OUT"
