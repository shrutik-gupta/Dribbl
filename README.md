# Dribbl

Weekly turf football organiser: open sign-up, player cards, fair teams, no-show penalties, live score, peer ratings, UPI payments, stats and graphs.

## Run it

```
npm run dev        # serves public/ at http://localhost:5173
npm run check      # syntax-checks every module
npm run deploy     # uploads Firestore rules and the site to Firebase
npm run apk        # builds the Android app into dist/Dribbl.apk
```

There is no build step. The app is plain HTML, CSS and JavaScript modules, so what is in `public/` is exactly what gets deployed. It must be served over http (not opened as a file), because browsers only load modules from a server.

Note: `npm run dev` talks to the real Firestore database named in `public/js/config/firebase.config.js`.

## How people join

1. Share the website link.
2. A new player taps **Sign up** and picks a username and password.
3. They fill in their player card: nickname, primary / secondary / extra position and fitness status.

The first person to sign up on an empty database becomes the admin. Admins can edit any player (starting score, captain tag, reset password), suspend or delete accounts, control any match and change club settings from **Me > Admin**.

## Suspending and deleting accounts

From **Me > Admin** (or any player's profile) an admin can:

- **Suspend** an account: the player is logged out and can't log in until an admin restores it. Their stats and history stay. Stored as `active: false` on the player.
- **Delete** an account: removes the player, their UPI details and their replies to matches that haven't finished. Finished matches keep their scores and ratings and show the player as "Removed player". This can't be undone.

Admins can't suspend or delete themselves. This is separate from the penalty suspension (3 active penalties), which only stops a player joining matches.

## Android app

The Android app is the same `public/` folder wrapped in a native shell with [Capacitor](https://capacitorjs.com). There is no second codebase: `npm run apk` copies `public/` into the `android/` project and builds `dist/Dribbl.apk`, which you can send to anyone to install.

- **One-time setup:** Java 21 and the Android SDK (`brew install openjdk@21` and `brew install --cask android-commandlinetools`, then `sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"`).
- **The web files are inside the APK.** Deploying the website does not update installed apps; build and share a new APK after changes. Raise `versionCode` in `android/app/build.gradle` for each APK you share.
- **Signing:** `npm run apk` makes a debug build signed with this computer's debug key (`~/.android/debug.keystore`). An update must be built with the same key, or phones will refuse it until the old app is uninstalled.
- **Native bits:** `android/app/src/main/java/com/dribbl/app/MainActivity.java` handles the back button; icons and splash images live under `android/app/src/main/res/`. `capacitor.config.json` holds the app id (`com.dribbl.app`) and name.

## Team names

When hosting a match the host can name both teams. A team with no name is called after its captain, for example **Shrutik's**. Before captains are picked it shows as Team A / Team B.

## Repo layout

```
public/                    everything that is deployed
  index.html               page shell: loads fonts, CSS, Chart.js, Firebase and js/main.js
  assets/                  logo and app icons (icon.png is the source artwork)
  manifest.webmanifest     name and icons for "Add to Home Screen"
  css/
    tokens.css             colours, radii, fonts (light and dark)
    base.css               reset, typography, layout utilities
    layout.css             header, nav dock, auth and status screens
    components.css         buttons, cards, pills, badges, forms, modal, toast, tables
    views.css              match list, scoreboard, pitch, ratings, payments, players
  js/
    main.js                entry point: registers features and boots
    app.js                 root view: picks the screen for the current state and route
    config/                constants and Firebase settings
    lib/                   pure helpers: formatting, storage, hashing, image resize
    core/                  state, render loop, router, event delegation, Firestore
    domain/                rules with no UI: scores, ratings, penalties, squads, team balancing
    ui/                    shared UI: icons, components, modal, toast, app shell
    features/
      auth/                log in, sign up, player card
      matches/             list, match centre, tabs/, forms, actions
      players/             squad list, profile, profile forms
      stats/  graphs/  admin/
firestore.rules            database access rules
firebase.json              hosting and rules config
capacitor.config.json      Android app id and name
android/                   native Android shell (Capacitor)
scripts/build-apk.sh       builds dist/Dribbl.apk
```

### How the code fits together

- **State** (`core/state.js`): `S` mirrors Firestore through live subscriptions, `UI` holds view state.
- **Views** are functions that return HTML strings. `app.js` repaints only when the HTML changed.
- **Behaviour** is wired by attributes: `data-act` (click), `data-change`, and `<form data-form>`. Each feature exports `actions`, `changes` and `forms`; `main.js` registers them with `core/events.js`.
- **Derived data** (`domain/derive.js`) is recomputed only when a snapshot arrives. Penalties, ratings and stats are never stored.

To add a feature: create a folder under `features/`, export a view and its handlers, add the route in `app.js` and register the handlers in `main.js`.

## Design

Two greens (`#01935c`, `#61df6e`) and green-tinted greys, defined once in `css/tokens.css`. Red and amber appear only for errors, penalties and warnings. Fonts: Bricolage Grotesque (headings) and Figtree (text).

## Database collections

| Collection | One document per |
|---|---|
| `players` | player (login, nickname, positions, fitness, starting score, `onboarded` flag) |
| `matches` | match (date, venue, cost, teams, `nameA` / `nameB`, captains, goals, no-shows, status) |
| `rsvps` | player per match ("I'm in" / "I'm out", late drop-out time) |
| `ratings` | rater per match |
| `payments` | player per match |
| `payinfo` | host (UPI ID and QR image) |
| `config` | club settings (name, usual turf) |

Players and matches created by the old single-file version keep working: missing fields get defaults when loaded.

## First-time Firebase setup

1. Create a project at https://console.firebase.google.com and add a Firestore database (production mode).
2. Register a web app and copy its config into `public/js/config/firebase.config.js`.
3. `npm install -g firebase-tools`, `firebase login`, `firebase use --add`, then `npm run deploy`.

## Good to know

- **Security:** logins are the app's own (salted SHA-256 hashes stored in Firestore), and the Firestore rules let anyone with the link read and write the app's collections. With open sign-up, anyone who finds the link can join, and a technical user could read or change data directly. That is fine for a friends' group; for anything more, move to Firebase Authentication and per-user rules.
- **Cost:** each app open reads all club data. The free Firebase plan (50,000 reads a day) covers a group of 10 to 15 comfortably.
