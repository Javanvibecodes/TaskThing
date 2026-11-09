# Task Thing — Minimal Desktop Widget & Mobile Companion

**Version:** 1.0.0

A lightning-fast Electron desktop widget and Capacitor mobile companion that keep your daily tasks and recurring habits synchronized seamlessly over local Wi‑Fi — no cloud, no third‑party servers. Your data stays on your devices.

## Platforms

| Platform | Status | Download |
|----------|--------|----------|
| **Windows** | ✅ Stable | [Download Windows .exe](https://github.com/your-org/task-thing/releases/latest/download/Task-Thing-Setup.exe) |
| **macOS** | ✅ Stable | [Download macOS .dmg](https://github.com/your-org/task-thing/releases/latest/download/Task-Thing.dmg) |
| **Android** | ✅ Stable (tested) | [Download Android APK](https://github.com/your-org/task-thing/releases/latest/download/app-debug.apk) |
| **iOS** | 📦 Targeted (Capacitor) | Build via `npx cap open ios` or `npx cap build ios` |

> **iOS notes:** This project uses Capacitor for cross‑platform mobile support. To build for iOS, run `npx cap open ios` in the `mobile` directory, open the Xcode project, and build for your device or simulator. The app is signed for development with your Apple ID. Push notifications and App Store submission require an Apple Developer account.

## How PC & Phone Sync Works

Task Thing runs a local WebSocket sync server on your computer (default port **44751**). No cloud accounts, no third‑party servers — your tasks and habits stay on your local network.

### On Your PC (Desktop Widget)

1. Launch Task Thing on Windows or macOS.
2. Click the **Sync** tab in the navigation bar.
3. A QR code appears containing your PC's IP address, port **44751**, and a secure sync token.
4. Click **Copy IP** to paste the connection details manually, or proceed to the phone step.

### On Your Phone (Android)

1. Open Task Thing from your app drawer.
2. Tap the **Sync** tab at the bottom.
3. Grant camera permission when the system dialog appears.
4. Point your camera at the PC screen QR code — the scanner auto‑detects the pairing payload with **no extra framing** required.
5. **Alternative:** Tap **Manual IP** and enter your PC's local IP (e.g. `192.168.1.50`) plus port **44751**.
6. The header pill turns **green** when the live connection is active.

### Real‑Time Two‑Way Synchronization

Once paired, any task added, checked off, edited, or habit checked on either your PC desktop widget or your mobile phone syncs instantly over Wi‑Fi. The connection is bidirectional — changes on either device propagate to the other in under a second.

## Direct App Downloads

| Platform | File | Size |
|----------|------|------|
| Windows | `Task-Thing-Setup.exe` | ~15 MB |
| macOS | `Task-Thing.dmg` | ~25 MB |
| Android | `app-debug.apk` | ~35 MB |
| iOS | Build from Xcode | — |

## Features

- **Daily Tasks** — add, edit, prioritize, and check off tasks; syncs to phone instantly
- **Recurring Habits** — set it-and-forget-it habits (daily, weekly) that auto‑appear each morning
- **Real‑Time Sync** — every change on either device propagates to the other over Wi‑Fi in under a second
- **Static Launch Splash** — instant white screen with centered Blob logo on mobile; fades after 2 s
- **No Placeholder Tasks** — the app goes straight to the task dashboard without loading skeletons or empty states
- **Privacy‑First** — all sync is local; no cloud accounts, no third‑party servers

## License

This project is open source under the **MIT License**. See the [GitHub Repository](https://github.com/your-org/task-thing) for details.

## Quick Start

1. **Download** the app for your operating system from the table above.
2. **Launch** the desktop widget and click **Sync** → **Copy IP**.
3. **Open** Task Thing on your Android phone, tap **Sync**, and scan the QR code — or enter the IP manually.
4. **Start adding tasks** on either device — they sync instantly.

---

*Generated with ❤️ by the Task Thing team. Open Source under MIT License.*