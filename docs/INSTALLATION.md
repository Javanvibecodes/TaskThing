# Installation

## Official downloads

Download only from the official
[Task Thing GitHub Releases](https://github.com/Javanvibecodes/TaskThing/releases)
page. The assets currently linked from the project README are:

- Windows 10/11, x64: `Task-Thing-win-x64.exe`
- Android: `Task-Thing-android.apk`

Release asset names can change; use the asset names shown on the release
itself if a link is unavailable. Do not install binaries from unofficial
mirrors.

## Windows

1. Download the Windows installer from the latest release.
2. Run the installer. The current installer is configured as an NSIS
   installer and is not configured for code signing.
3. Windows SmartScreen may display an unknown-publisher warning. Only
   continue if you downloaded the installer from the official release page
   and are comfortable proceeding.
4. Launch Task Thing from the installed app or Start menu.

The current installer is intended for 64-bit Windows 10/11.

## Android

1. Download the APK from the official release.
2. Open the downloaded APK on your Android device.
3. If Android asks, allow installation from the browser or file manager used
   to open the APK.
4. Review the requested permissions and install.
5. Open Task Thing from the app drawer.

Sideloading an APK means you are installing outside the Google Play Store.
Only install a build obtained from the official release page.

## macOS and Linux

The desktop package contains electron-builder configurations for macOS and
Linux, but this document does not promise that installers for those
platforms are published or tested. Check Releases first. If you build
yourself, follow [BUILD.md](BUILD.md) and use the platform's required SDKs.

## First launch

- Desktop: open Preferences to view the PC's local network address and
  current six-digit pairing code.
- Mobile: open the Sync tab and enter the PC address and pairing code.
- You can use the app without pairing; synchronization requires both devices
  to be on a network that allows them to communicate.

## Uninstalling

Use the operating system's normal uninstall process. Local app data and
backups may be retained depending on the operating system. See
[DATA_STORAGE.md](DATA_STORAGE.md) before removing data you may need.
