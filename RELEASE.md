# Releasing Dribbl

Follow this every time a new feature or fix is ready. There are two things to ship:

- **The website** (`https://dribbl.web.app`): updates for everyone the moment you deploy.
- **The Android app** (`dist/Dribbl.apk`): the web files are packed inside it, so it only updates when friends install a new APK.

Always ship both. The APK is published as a GitHub release, not on Firebase: Firebase's free (Spark) plan refuses to host `.apk` files. The **Download APK** button at the bottom of the home page points to `https://github.com/shrutik-gupta/Dribbl/releases/latest/download/Dribbl.apk`, which always serves the newest release. The repository must be public for friends to download it.

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

## 3. Build the Android app

1. Open `android/app/build.gradle` and raise the version:

   ```
   versionCode 2          // add 1 every release; phones refuse an APK with a lower number
   versionName "1.1"      // the version people see; any text you like
   ```

2. Build:

   ```
   npm run apk
   ```

   The APK is written to `dist/Dribbl.apk` (not tracked in git).

3. Commit the version bump:

   ```
   git commit -am "Android 1.1"
   ```

## 4. Deploy the website

```
firebase use staging
npm run deploy:site
```

- `firebase use staging` is only needed once per computer (it selects the `fotstrike` Firebase project).
- If you changed `firestore.rules`, run `npm run deploy` instead. It uploads the rules as well as the site.
- Open https://dribbl.web.app and refresh to confirm the change is live.

## 5. Publish the APK on GitHub

1. Push your commits: `git push`.
2. Open https://github.com/shrutik-gupta/Dribbl/releases/new.
3. Create a new tag named after the version, for example `android-1.1`. Use the same text as the release title.
4. Drag `dist/Dribbl.apk` into the attachments box. The file must be named exactly `Dribbl.apk`, or the home page link will not find it.
5. Leave **Set as the latest release** ticked and click **Publish release**.
6. Tap **Download APK** on https://dribbl.web.app to confirm it gives the new file.

## 6. Share the APK

1. Install `dist/Dribbl.apk` on your own phone first and check the new feature works.
2. Tell the group to tap **Download APK** at the bottom of the home page (or send them the file).
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
| Deploy fails with "Executable files are forbidden on the Spark billing plan" | An `.apk` is inside `public/`. Delete it; APKs go on GitHub releases (step 5). |
| **Download APK** gives a 404 | No release has a file named exactly `Dribbl.apk`, the newest release is a draft or pre-release, or the repository is private. |
| Website shows the old version | Hard refresh. If it persists, check the deploy output for errors. |
| App shows the old version after installing | You shared an APK built before the change. Run `npm run apk` again and resend. |

## Quick version

```
npm run check
git add -A && git commit -m "Feature name"
# raise versionCode and versionName in android/app/build.gradle
npm run apk
git commit -am "Android x.y"
npm run deploy:site
git push
# new GitHub release with tag android-x.y and dist/Dribbl.apk attached
# test the APK on your phone, then tell the group to update
```
