# Task Thing — Minimal Desktop Widget & Mobile Companion

**Version:** 1.0.4

A lightning-fast Electron desktop widget and Capacitor mobile companion that keep your daily tasks and recurring habits synchronized seamlessly over local Wi-Fi — no cloud, no third-party servers. Your data stays on your devices.

## Download

| Platform | Package | Direct download |
|----------|---------|-----------------|
| **Windows 10/11 (x64)** | Installer `.exe` | [Download Task-Thing-win-x64.exe](https://github.com/Javanvibecodes/TaskThing/releases/latest/download/Task-Thing-win-x64.exe) |
| **Android 7.0+** | APK | [Download Task-Thing-android.apk](https://github.com/Javanvibecodes/TaskThing/releases/latest/download/Task-Thing-android.apk) |

### Direct links

- Windows: `https://github.com/Javanvibecodes/TaskThing/releases/latest/download/Task-Thing-win-x64.exe`
- Android: `https://github.com/Javanvibecodes/TaskThing/releases/latest/download/Task-Thing-android.apk`

The desktop installer is not code-signed, so Windows SmartScreen may warn on first launch. Choose **More info → Run anyway**.

### Install notes

- **Windows:** run `Task-Thing-win-x64.exe`. The installer does not require administrator rights.
- **Android:** open `Task-Thing-android.apk` on the device and allow installing from this source when prompted.

## How PC & Phone Sync Works

Task Thing runs a local WebSocket sync server on your computer (default port **48721**). No cloud accounts, no third-party servers — your tasks and habits stay on your local network.

### On Your PC (Desktop Widget)

1. Launch Task Thing on Windows.
2. Click the **Preferences (tune)** icon in the sidebar.
3. A **6-digit pairing code** appears next to your PC's IP address and port **48721**.
4. Type that code into the phone (or use **Copy pairing link** for a one-paste setup).

### On Your Phone (Android)

1. Open Task Thing from your app drawer.
2. Tap the **Sync** tab at the bottom.
3. Enter your PC's local IP (for example `192.168.1.50`) — no camera or QR scanning needed.
4. Type the **6-digit pairing code** shown on the PC and tap **Connect**.
5. The header pill turns blue when the live connection is active; **Disconnect** ends it, and **Reconnect** resumes without retyping the code.

The code is single-use: the PC rotates it after every successful pairing, and it never leaves your devices. Reconnects use a long-lived token the PC hands over during pairing, so you only enter a code once per device.

### Real-Time Two-Way Synchronization

Once paired, any task added, checked off, edited, or habit checked on either your PC desktop widget or your mobile phone syncs instantly over Wi-Fi. The connection is bidirectional — changes on either device propagate to the other in under a second.

Changes made while the phone is offline are queued and sent automatically on the next connection. The queue records only real pending differences, so an item that was added and then deleted again does not appear as an unsynced change.

## Features

- **Daily Tasks** — add, edit, prioritize, and check off tasks; syncs to phone instantly
- **Recurring Habits** — set it-and-forget-it habits (daily, weekly) that auto-appear each morning
- **Real-Time Sync** — every change on either device propagates to the other over Wi-Fi in under a second
- **Instant Branded Launch** — the Blob logo appears immediately when the app is opened (held for about 3 seconds on mobile) while the app loads, then the task dashboard appears
- **No Offline Dependencies** — Tailwind styles, fonts and icons are bundled inside the app, so startup never waits on a network request
- **Clear Navigation State** — the active tab is highlighted in the selected theme colour, and the Today badge is only shown when tasks are actually pending
- **No Placeholder Tasks** — the app goes straight to the task dashboard without loading skeletons or empty states
- **Privacy-First** — all sync is local; no cloud accounts, no third-party servers

## Build from Source

Requirements: Node.js 20+, pnpm 12+, and the platform SDK for the target you are building.

```bash
pnpm install
```

### Desktop (Electron)

```bash
pnpm desktop:start          # run from source
pnpm desktop:dist:win       # Windows installer
```

### Mobile (Capacitor)

```bash
cd mobile
pnpm install
pnpm build                  # compiles Tailwind CSS and the web bundle
npx cap sync
npx cap open android        # or: cd android && ./gradlew assembleDebug
```

See [CHANGELOG.md](CHANGELOG.md) for release notes.

## License

This project is open source under the **MIT License**. See the [GitHub Repository](https://github.com/Javanvibecodes/TaskThing) for details.

## Quick Start

1. **Download** the app for your operating system from the table above.
2. **Launch** the desktop widget and open **Preferences** to read the 6-digit pairing code.
3. **Open** Task Thing on your Android phone, tap **Sync**, enter the PC IP and that code, then tap **Connect**.
4. **Start adding tasks** on either device — they sync instantly.
