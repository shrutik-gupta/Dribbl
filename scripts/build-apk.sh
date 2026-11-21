#!/bin/sh
# Builds the Android app and leaves it at dist/Dribbl.apk.
# Needs Java 21 and the Android SDK (see "Android app" in README.md).
set -e
cd "$(dirname "$0")/.."

# Find Java 21: an already-set JAVA_HOME wins, then Homebrew's openjdk@21.
if [ -z "$JAVA_HOME" ] && command -v brew >/dev/null 2>&1; then
  JDK="$(brew --prefix openjdk@21 2>/dev/null)/libexec/openjdk.jdk/Contents/Home"
  [ -x "$JDK/bin/java" ] && export JAVA_HOME="$JDK"
fi
[ -n "$JAVA_HOME" ] || { echo "Java 21 not found. Install it (brew install openjdk@21) or set JAVA_HOME."; exit 1; }

# Find the Android SDK: ANDROID_HOME wins, then the usual install locations.
if [ -z "$ANDROID_HOME" ]; then
  for d in "$HOME/Library/Android/sdk" "$(brew --prefix 2>/dev/null)/share/android-commandlinetools"; do
    [ -d "$d/platforms" ] && { export ANDROID_HOME="$d"; break; }
  done
fi
[ -n "$ANDROID_HOME" ] || { echo "Android SDK not found. Set ANDROID_HOME."; exit 1; }

npx cap sync android              # copy public/ into the Android project
rm -rf android/app/src/main/assets/public/download   # keep the previous APK out of the new one
(cd android && ./gradlew assembleDebug)

mkdir -p dist public/download
cp android/app/build/outputs/apk/debug/app-debug.apk dist/Dribbl.apk
# The home page's "Download APK" link serves this copy once the website is deployed.
cp dist/Dribbl.apk public/download/Dribbl.apk
echo "Built dist/Dribbl.apk (deploy the website to publish it at /download/Dribbl.apk)"
