#!/usr/bin/env bash
#
# sign-notarize.sh — sign, notarize, staple, and re-package Flashr for clean
# (no-warning) distribution. Run this ONLY after the Developer ID cert and the
# "flashr" notarytool keychain profile exist (see NOTARIZATION.md).
#
# What it does:
#   1. Code-signs Flashr.app inside-out with your Developer ID Application cert
#      + hardened runtime (via @electron/osx-sign, the correct tool for Electron).
#   2. Rebuilds Flashr.dmg from the signed app (build-dmg.sh).
#   3. Signs the .dmg, submits it to Apple's notary service, waits, and staples.
#   4. Verifies the staple so a downloaded copy opens with no Gatekeeper prompt.
#
# Then publish: gh release create vX.Y.Z --repo aertix/flashr dist/Flashr.dmg
# (same asset name -> the landing page's "latest" URL auto-updates, no page change.)
#
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

APP="dist/Flashr-darwin-arm64/Flashr.app"
DMG="dist/Flashr.dmg"
ENT="entitlements.mac.plist"
NOTARY_PROFILE="flashr"   # created by: xcrun notarytool store-credentials flashr ...

# Your Developer ID Application identity. Find the exact string with:
#   security find-identity -v | grep "Developer ID Application"
IDENTITY="${IDENTITY:-}"
if [[ -z "$IDENTITY" ]]; then
  IDENTITY="$(security find-identity -v 2>/dev/null | grep "Developer ID Application" | head -1 | sed -E 's/.*"(.*)"/\1/')"
fi
[[ -n "$IDENTITY" ]] || { echo "ERROR: no 'Developer ID Application' identity found. See NOTARIZATION.md."; exit 1; }
echo "Signing identity: $IDENTITY"

echo "==> 1/4  Code-signing the app (inside-out, hardened runtime)…"
npx --yes @electron/osx-sign "$APP" \
  --identity="$IDENTITY" \
  --entitlements="$ENT" \
  --entitlements-inherit="$ENT" \
  --hardened-runtime \
  --type=distribution \
  --no-gatekeeper-assess
codesign --verify --deep --strict --verbose=2 "$APP"

echo "==> 2/4  Rebuilding the .dmg from the signed app…"
./build-dmg.sh
codesign --force --timestamp --sign "$IDENTITY" "$DMG"

echo "==> 3/4  Notarizing (uploads to Apple, waits for result)…"
xcrun notarytool submit "$DMG" --keychain-profile "$NOTARY_PROFILE" --wait

echo "==> 4/4  Stapling + verifying…"
xcrun stapler staple "$DMG"
xcrun stapler validate "$DMG"
spctl -a -t open --context context:primary-signature -vvv "$DMG" || true

echo ""
echo "DONE. Notarized image: $DMG"
echo "Publish with:  gh release create v0.1.1 --repo aertix/flashr \"$DMG\" --title \"Flashr 0.1.1\" --notes \"Notarized build.\""
