#!/usr/bin/env bash
#
# build-dmg.sh - package the built Flashr.app into a styled, distributable
# Flashr.dmg: branded background, positioned icons, no Finder chrome.
#
# No external dependencies: hdiutil + osascript (both ship with macOS).
# The window shows Flashr.app on the left, an /Applications shortcut inside
# the dashed target ring on the right, over build/dmg-background.png
# (regenerate with: python3 build/make_dmg_background.py).
#
# Usage:  ./build-dmg.sh
# Output: dist/Flashr.dmg
#
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$HERE/dist/Flashr-darwin-arm64/Flashr.app"
OUT="$HERE/dist/Flashr.dmg"
BACKGROUND="$HERE/build/dmg-background.png"
VOLNAME="Flashr"

# Window geometry. Keep in sync with build/make_dmg_background.py:
# background is 660x420 pt, icon slots centered at (165,225) and (495,225).
WIN_X=200; WIN_Y=120; WIN_W=660; WIN_H=420
ICON_SIZE=128
APP_POS="165, 225"
APPS_POS="495, 225"

if [[ ! -d "$APP" ]]; then
  echo "ERROR: $APP not found. Run 'npm run build' first." >&2
  exit 1
fi
if [[ ! -f "$BACKGROUND" ]]; then
  echo "ERROR: $BACKGROUND not found. Run 'python3 build/make_dmg_background.py'." >&2
  exit 1
fi

STAGING="$HERE/dist/.dmg-staging"
RW_DMG="$HERE/dist/.Flashr-rw.dmg"
rm -rf "$STAGING" "$RW_DMG"
mkdir -p "$STAGING"

echo "Staging app..."
cp -R "$APP" "$STAGING/Flashr.app"
# Clean Finder/quarantine metadata so the image is tidy (does NOT prevent the
# browser-applied quarantine on download - that needs notarization).
xattr -cr "$STAGING/Flashr.app" || true
ln -s /Applications "$STAGING/Applications"
mkdir "$STAGING/.background"
cp "$BACKGROUND" "$STAGING/.background/background.png"

# Guard: never ship a bundle with a broken/missing signature - that is what
# makes macOS report a downloaded app as "damaged."
echo "Verifying code signature..."
if ! codesign --verify --deep --strict "$STAGING/Flashr.app" 2>/dev/null; then
  echo "ERROR: invalid code signature on $APP." >&2
  echo "  Fix (ad-hoc):  codesign --force --deep --sign - \"$APP\"" >&2
  echo "  Or run:        ./sign-notarize.sh   (Developer ID + notarize)" >&2
  rm -rf "$STAGING"
  exit 1
fi

echo "Creating writable image..."
hdiutil create \
  -volname "$VOLNAME" \
  -srcfolder "$STAGING" \
  -fs HFS+ \
  -format UDRW \
  -ov \
  "$RW_DMG" >/dev/null

echo "Mounting to style the window..."
MOUNT_DIR="/Volumes/$VOLNAME"
# Detach a stale mount from a previous failed run, if any.
if [[ -d "$MOUNT_DIR" ]]; then hdiutil detach "$MOUNT_DIR" -force >/dev/null 2>&1 || true; fi
hdiutil attach "$RW_DMG" -noautoopen >/dev/null

echo "Applying Finder layout..."
osascript <<EOF
tell application "Finder"
  tell disk "$VOLNAME"
    open
    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    set the bounds of container window to {$WIN_X, $WIN_Y, $((WIN_X + WIN_W)), $((WIN_Y + WIN_H))}
    set theViewOptions to the icon view options of container window
    set arrangement of theViewOptions to not arranged
    set icon size of theViewOptions to $ICON_SIZE
    set text size of theViewOptions to 12
    set background picture of theViewOptions to file ".background:background.png"
    set position of item "Flashr.app" of container window to {$APP_POS}
    set position of item "Applications" of container window to {$APPS_POS}
    close
    open
    update without registering applications
    delay 1
    close
  end tell
end tell
EOF

# Let Finder finish writing the .DS_Store before we detach.
sync
sleep 2
hdiutil detach "$MOUNT_DIR" >/dev/null

echo "Converting to compressed image..."
rm -f "$OUT"
hdiutil convert "$RW_DMG" \
  -format UDZO \
  -imagekey zlib-level=9 \
  -o "$OUT" >/dev/null

rm -rf "$STAGING" "$RW_DMG"

echo "Done: $OUT"
ls -lh "$OUT"
