# Flashr - signing + notarization (the "ship it clean" step)

Right now Flashr is only **ad-hoc signed**: it runs locally, but a downloaded copy
needs a one-time right-click -> Open. To get a clean, no-warning download it has to
be signed with a **Developer ID Application** certificate and **notarized** by Apple.

The build itself is already done and validated (packaged app boots, `bin/ocr`
helper is a real signable binary, DMG packaging works). What remains is **3 things
only you can do** (they need your Apple ID + 2FA). Once they're done, the rest is
one script.

Publishing account: **Aryan Pershad**. Signing and notarization run under your paid
Apple team **2PKZ2GXQ6A** (the `Developer ID Application: ARYAN PERSHAD (2PKZ2GXQ6A)`
cert, the same team as your Posthuman builds). Your `Apple Development` cert sits on a
separate free team (`27H95G6Z62`); that one is dev-only and is not used here.

---

## Step 1 - Confirm a paid Apple Developer Program membership ($99/yr)

Your current cert is an "Apple Development" cert, which free accounts also get. It
**cannot** notarize. Notarization requires the **paid** program, and a Developer ID
certificate can only be issued to the paid Account Holder.

- Go to https://developer.apple.com/account
- If membership shows active, you're set.
- If not, enroll: https://developer.apple.com/programs/enroll/ ($99/yr).

## Step 2 - Create a "Developer ID Application" certificate

Full Xcode 26 is installed on this machine, so use the easy route:

1. **Xcode -> Settings -> Accounts**.
2. Select your Apple ID (add it with `+` if it isn't listed), click **Manage Certificates...**
3. Click **+** in the bottom-left, choose **Developer ID Application**. Xcode creates
   the cert and installs the private key into your login keychain.

Verify it landed:
```
security find-identity -v | grep "Developer ID Application"
```
You should see `Developer ID Application: ARYAN PERSHAD (2PKZ2GXQ6A)`.

<details><summary>Fallback: portal + CSR route (if the Xcode button is greyed out)</summary>

1. **Keychain Access -> Certificate Assistant -> Request a Certificate From a
   Certificate Authority.** Email: `aryan.pershad@gmail.com`, Common Name:
   `Aryan Pershad`, choose **Saved to disk**.
2. https://developer.apple.com/account/resources/certificates/list -> **+** ->
   **Developer ID Application** -> upload the `.certSigningRequest` -> **Download**.
3. Double-click the downloaded `.cer` to install it.
</details>

## Step 3 - Create a notarization credential (app-specific password)

1. https://account.apple.com -> **Sign-In and Security -> App-Specific Passwords**
   -> **+** -> label it `flashr-notary` -> copy the generated password.
2. Store it for `notarytool` (paste the password when prompted):
```
xcrun notarytool store-credentials "flashr" \
  --apple-id "aryan.pershad@gmail.com" \
  --team-id "2PKZ2GXQ6A" \
  --password "THE_APP_SPECIFIC_PASSWORD"
```

---

## Then: run the pipeline

Once Steps 1-3 are done:

```
cd ~/flashr
npm run build            # packaged app (asar-off so bin/ocr stays runnable)
./sign-notarize.sh       # signs (via sign-app.js), builds dmg, notarizes, staples, verifies
```

`sign-notarize.sh` auto-detects your `Developer ID Application` identity, deep-signs
the app + the `bin/ocr` Vision helper with the hardened runtime (using the
`@electron/osx-sign` v2 API in `sign-app.js`), then submits `dist/Flashr.dmg` to
Apple, waits, and staples the result.

Publish the notarized image:
```
gh release create v0.1.1 --repo stele-health/flashr dist/Flashr.dmg \
  --title "Flashr 0.1.1" --notes "Notarized build."
```
Because the asset stays named `Flashr.dmg`, the flashr.bar download URL
(`releases/latest/download/Flashr.dmg`) auto-points to it, and the "right-click ->
Open" first-launch note in `README.md` can be removed.

### Notes
- **Bundle ID** is currently `health.posthuman.flashr` (legacy Posthuman domain).
  If you want it under the Stele umbrella, decide before first release; changing it
  after launch orphans update/identity continuity.
- **This is your personal account** as a temporary launch vehicle. For a direct-download
  (non-App-Store) app there is no formal "App Transfer"; migrating to a Stele org
  account later just means re-signing future builds with that account's Developer ID.
- **Apple Silicon only** right now. For a universal build, change `--arch=arm64` to
  `--arch=universal` in `package.json` and rebuild (note: `bin/ocr` would then also
  need to be compiled universal).
