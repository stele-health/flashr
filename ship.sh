#!/usr/bin/env bash
#
# ship.sh — make the build you're running the build customers download.
#
# After this finishes:
#   - /Applications/Flashr.app          = the freshly built app (your local copy)
#   - flashr.bar download (Flashr.dmg)  = the SAME build
# They are guaranteed identical because both come from this one dist/ build.
#
# Usage:  ./ship.sh
#
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"
APP="$HERE/dist/Flashr-darwin-arm64/Flashr.app"
DMG="$HERE/dist/Flashr.dmg"
REPO="stele-health/flashr"
REL="v0.1.0"            # the "Latest" release the landing page downloads from

echo "==> 1/5  Build"
npm run build

echo "==> 2/5  Ad-hoc deep sign (so the downloaded app is not reported as 'damaged')"
codesign --force --deep --sign - "$APP"
codesign --verify --deep --strict "$APP"

echo "==> 3/5  Package Flashr.dmg"
./build-dmg.sh

echo "==> 4/5  Install to /Applications (your local copy)"
osascript -e 'tell application "Flashr" to quit' >/dev/null 2>&1 || true
osascript -e 'delay 1' >/dev/null 2>&1 || true
pkill -f "Flashr.app/Contents/MacOS/Flashr" >/dev/null 2>&1 || true
rm -rf /Applications/Flashr.app
cp -R "$APP" /Applications/Flashr.app

echo "==> 5/5  Publish the SAME build as the customer download ($REPO $REL)"
gh release upload "$REL" "$DMG" --clobber -R "$REPO"

echo
echo "DONE. /Applications/Flashr.app and https://flashr.bar download are now the identical build."
