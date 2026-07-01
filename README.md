# Flashr for Mac

RSVP speed reader, summoned from anywhere. A menu-bar app with a global hotkey
(⌘⇧R) that flashes your current selection one word at a time in a floating
window over any app.

## Download

**[⬇︎ Download Flashr (macOS, Apple Silicon)](https://github.com/aertix/flashr/releases/latest/download/Flashr.dmg)**

Requires macOS 12 (Monterey) or later on Apple Silicon (M1 or newer).

### First launch

Flashr isn't notarized by Apple yet, so on the very first open macOS will block
it. To open it the first time:

1. Open the `.dmg` and drag **Flashr** into **Applications**.
2. Double-click **Flashr** once (macOS will refuse — that's expected).
3. Open **System Settings → Privacy & Security**, scroll down, and click
   **Open Anyway** next to the Flashr message. Confirm with **Open**.

You only need to do this once. After that it opens normally.

If you'd rather do it in one step, run this in Terminal after copying Flashr to
Applications:

```
xattr -dr com.apple.quarantine /Applications/Flashr.app
```

---

This repository hosts the macOS download for Flashr. Source is maintained
privately.
