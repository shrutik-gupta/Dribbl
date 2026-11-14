# Releasing Dribbl

Follow this every time a new feature or fix is ready. There are two things to ship:

- **The website** (`https://dribbl.web.app`): updates for everyone the moment you deploy.
- **The Android app** (`dist/Dribbl.apk`): the web files are packed inside it, so it only updates when friends install a new APK.

Always ship both, website first. Both talk to the same database, so an old app and a new website should not be left out of step for long.

Run every command from the project folder.

## 1. Check the change

```
npm run check
npm run dev
```

- `npm run check` must finish with no errors.
- `npm run dev` serves the app at http://localhost:5173. It uses the **real** database, so anything you create while testing is visible to your friends. Test with a throwaway account and clean up after.

## 2. Save it in git

```
git add -A
git commit -m "Short description of the feature"
```

## 3. Deploy the website

```
firebase use staging
npm run deploy:site
```

- `firebase use staging` is only needed once per computer (it selects the `fotstrike` Firebase project).
- If you changed `firestore.rules`, run `npm run deploy` instead. It uploads the rules as well as the site.
- Open https://dribbl.web.app and refresh to confirm the change is live.

## 4. Build the Android app

1. Open `android/app/build.gradle` and raise the version:

   ```
   versionCode 2          // add 1 every release; phones refuse an APK with a lower number
   versionName "1.1"      // the version people see; any text you like
   ```

2. Build:

   ```
   npm run apk
   ```

   The APK is written to `dist/Dribbl.apk`.

3. Commit the version bump:

   ```
   git commit -am "Android 1.1"
   ```

## 5. Share the APK

1. Install `dist/Dribbl.apk` on your own phone first and check the new feature works.
2. Send the file to the group (WhatsApp, Drive).
3. Friends open the file and tap **Update**. Their login and data are kept.

## Rules that keep updates working

- **Build every APK on this computer.** The app is signed with this computer's debug key (`~/.android/debug.keystore`). An APK built with a different key is refused until the old app is uninstalled. Keep a backup copy of that file.
- **Never lower `versionCode`.**
- **Do not change the app id** (`com.dribbl.app` in `capacitor.config.json` and `android/app/build.gradle`). A different id installs as a second, separate app.

## When something goes wrong

| Problem | Fix |
|---|---|
| `firebase: command not found` | `npm install -g firebase-tools`, then `firebase login` |
| Deploy says no project is active | `firebase use staging` |
| `Java 21 not found` | `brew install openjdk@21` |
| `Android SDK not found` | `brew install --cask android-commandlinetools`, then `sdkmanager --licenses` and `sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"` |
| Phone says "App not installed" | The APK was signed with a different key or has a lower `versionCode`. Rebuild on this computer with a higher number, or uninstall the old app first. |
| Website shows the old version | Hard refresh. If it persists, check the deploy output for errors. |
| App shows the old version after installing | You shared an APK built before the change. Run `npm run apk` again and resend. |

## Quick version

```
npm run check
git add -A && git commit -m "Feature name"
npm run deploy:site
# raise versionCode and versionName in android/app/build.gradle
npm run apk
git commit -am "Android x.y"
# test dist/Dribbl.apk on your phone, then share it
```
