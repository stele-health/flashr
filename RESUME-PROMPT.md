# Flashr — resume prompt

Paste the block below into a fresh session to pick this work back up.

---

Resume Flashr work.

Flashr is Posthuman's black-and-white RSVP speed reader. Two surfaces: a Chrome extension (~/flashr-extension) and a native Mac app (~/flashr-mac, Electron) which is the active focus. Mac-first. The iPhone app is specced (~/flashr-extension/docs/specs/2026-06-10-flashr-ios-design.md) but not started.

Mac app (~/flashr-mac): run with `cd ~/flashr-mac && npm start` (dev). Packaged app at ~/flashr-mac/dist/Flashr-darwin-arm64/Flashr.app holds OLD code and needs repackaging. Design is "instrument-grade monochrome" (pure black and white, tactile 3D buttons, focus halo behind the word, mono numerals). The reading engine logic lives in ~/flashr-extension/reader-core.js and is mirrored inline inside ~/flashr-mac/renderer/index.html.

Built and working in the Mac app:
- Menu-bar app plus launcher window (paste or type, three themes: Dark default, Night, Light).
- Markdown and rich-text sanitizer (strips headings, bold/italic markers, links, bullets, table pipes, HTML entities) in reader-core.js and the app.
- Settings panel (gear icon) with press-to-record rebindable global hotkeys, persisted to userData/settings.json.
- Floating always-on-top reader (frameless, draggable, Esc closes).
- Four rebindable global hotkeys: selection Ctrl+Alt+Cmd+F, clipboard Ctrl+Alt+Cmd+V, screen region Ctrl+Alt+Cmd+R, continuous region Ctrl+Alt+Cmd+G.
- Stale-read fix: the selection grab writes a clipboard sentinel, fires Cmd+C, prompts for Accessibility if needed, restores the clipboard, and never re-reads the old clipboard.
- File drag-and-drop (.txt and .md) onto the window.
- On-device OCR via a Swift Vision helper at ~/flashr-mac/bin/ocr (compiled from ocr.swift).
- Screen-region read (one-shot) and continuous "read as you scroll": a region-selector overlay returns a rect, the main process loops screencapture -R on it, OCRs, de-dupes lines, and streams only new text into the reader with a LIVE badge.

Permissions the app needs (dev build shows as "Electron" in the lists): Accessibility for the selection grab, Screen Recording for the region and continuous capture.

Notion project page (Posthuman .projects): https://app.notion.com/p/37cc15359bb281fab243c380ef21dd26 (Flashr, In Progress, assigned Shawn). It does NOT yet list the most recent features (region read, continuous read, Vision OCR, stale-read fix, file drop).

NEXT STEPS:
1. Test continuous mode (Ctrl+Alt+Cmd+G) and the fixes, then adjust.
2. Repackage the real Flashr.app with electron-packager. Keep asar OFF so bin/ocr stays executable. The --icon flag was skipped last time, so embed ~/flashr-mac/build/icon.icns into Contents/Resources/electron.icns manually and ad-hoc codesign (`codesign --force --deep --sign - <app>`).
3. Update the Notion project page with the new features.

Key files: main.js, preload.js, renderer/{index.html,bridge.js,mac.css,selector.html}, ocr.swift, bin/ocr, build/icon.icns, make_icon.py.

Rules: never use em dashes; Notion is canonical for documents; never write to /tmp.

Start by running `cd ~/flashr-mac && npm start` to confirm where things stand.

---
