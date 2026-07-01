# Flashr — notarization (the "sign later" step)

Right now Flashr ships **unsigned**: the download works, but the first launch
needs a one-time right-click → Open. To get a clean, no-warning download, the
app has to be signed with a **Developer ID Application** certificate and
notarized by Apple.

There are **3 things only you can do** (they need your Apple ID + 2FA). Once
they're done, ping me and I'll run the rest (`./sign-notarize.sh`) and publish
the notarized build — the landing page won't need any change.

Your Apple Team ID is **2J74JJ7QT8** (from your existing cert).

---

## Step 1 — Confirm a paid Apple Developer Program membership ($99/yr)

Your current cert is an "Apple Development" cert, which free accounts also get;
it **cannot** notarize. Notarization needs the **paid** program.

- Go to https://developer.apple.com/account
- If it shows your membership as active, you're set.
- If not, enroll: https://developer.apple.com/programs/enroll/ ($99/yr).

## Step 2 — Create a "Developer ID Application" certificate

You only have Command Line Tools (not full Xcode), so use the portal route:

1. Open **Keychain Access** → menu **Keychain Access › Certificate Assistant ›
   Request a Certificate From a Certificate Authority**.
   - Email: your Apple ID email · Common Name: `Shawn Jerry`
   - Choose **Saved to disk** → save the `.certSigningRequest` file.
2. Go to https://developer.apple.com/account/resources/certificates/list
   → **+** → choose **Developer ID Application** → Continue.
3. Upload the `.certSigningRequest` from step 1 → Continue → **Download** the cert.
4. **Double-click** the downloaded `.cer` to install it into your login keychain.

Verify it landed:
```
security find-identity -v | grep "Developer ID Application"
```
You should see `Developer ID Application: Shawn Jerry (2J74JJ7QT8)`.

## Step 3 — Create a notarization credential (app-specific password)

1. Go to https://account.apple.com → **Sign-In and Security › App-Specific
   Passwords** → **+** → label it `flashr-notary` → copy the generated password.
2. Store it for `notarytool` (run in Terminal, paste the password when asked):
```
xcrun notarytool store-credentials "flashr" \
  --apple-id "YOUR_APPLE_ID_EMAIL" \
  --team-id "2J74JJ7QT8" \
  --password "THE_APP_SPECIFIC_PASSWORD"
```

---

## Then: I run the pipeline

Once Steps 1–3 are done, the rest is one script:

```
cd ~/flashr-mac
./sign-notarize.sh          # signs, builds dmg, notarizes, staples, verifies
gh release create v0.1.1 --repo aertix/flashr dist/Flashr.dmg \
  --title "Flashr 0.1.1" --notes "Notarized build."
```

Because the new release asset is still named `Flashr.dmg`, the landing page's
download URL (`releases/latest/download/Flashr.dmg`) auto-points to it. The
first-launch "right-click → Open" line on the landing page can then be removed.

### Optional later: Intel support
The current build is Apple-Silicon-only. For a universal (Intel + Apple Silicon)
build, change `package.json`'s build script `--arch=arm64` to `--arch=universal`,
rebuild, then re-run `sign-notarize.sh`. (Roughly doubles the download size.)
