# tasks.core — Desktop Floating Widget & Mobile App

A local-first, minimal productivity widget ecosystem built for **Windows**, **macOS**, **Android**, and **iOS**. All data remains 100% on your local devices with zero third-party cloud database dependencies.

---

## ⚡ Established Dual-Mode Hybrid Sync Architecture

The sync engine operates with zero configuration:
1. **Permanent 1-Click Pairing**: Scan the desktop widget's QR code on your phone once. All pairing tokens and host information are saved permanently in local device storage.
2. **Local Wi-Fi & Mobile Hotspot Ready**:
   - Works on home/office Wi-Fi.
   - **Works when phone is on cellular and PC is tethered to phone hotspot**: The mobile client automatically probes standard hotspot gateway subnets (`172.20.10.x` on iPhone, `192.168.43.x` on Android) to auto-reconnect without needing to re-pair.
3. **Background Auto-Reconnect**:
   - If the app is closed, phone is locked, or Wi-Fi drops, the mobile app automatically reconnects in the background upon return.
4. **Offline Buffer & Reconciliation**:
   - Any tasks added, checked off, or edited while away or offline are queued in local storage (`localStorage`).
   - The instant a connection is re-established, all buffered changes synchronize to the desktop widget and merge using Last-Write-Wins timestamps.
5. **Real-Time Bi-Directional Reactivity**:
   - Sub-5ms updates between desktop and phone.

---

## 🖥️ 1. Desktop Widget (`/desktop`)
Cross-platform desktop floating widget built with **Electron** and modern web standards.

### Features
- **Frameless & Transparent**: Native desktop floating window with subtle glassmorphism and custom draggable header.
- **Always-on-Top & Pin Mode**: Pin above your code editor, IDE, or browser with one click (`push_pin`).
- **Compact Floating Bar Mode**: Toggle from full widget to an ultra-compact 340×56px pill that floats on screen edge showing your current active task.
- **Active Tasks**:
  - Live task creation with priority cyclist (`Urgent`, `Medium`, `Low`), scheduled due times, and category tags (`Design`, `Dev`, `Ops`, etc.).
  - Smooth task completion moving directly into Completed History.
  - Dropdown context menu with inline editing and deletion.
  - Quick-add keyboard shortcut (`⌘K` / `Ctrl+K`).
- **Completed History**:
  - Log grouped by *Completed Today*, *Yesterday*, and *Earlier this week*.
  - Real-time search/filter with `ESC` to clear.
  - Live dynamic velocity sparkline pill (`↑92%`).
  - One-click *Undo / Reopen* to send tasks back to Active.
  - One-click *Export as Markdown* checklist directly to system clipboard.
  - Clear history with confirmation.
- **Theme & Appearance Engine**:
  - 6 Material 3 color presets: *Indigo Twilight*, *Emerald Botanical*, *Sunset Amber*, *Rose Berry*, *Obsidian Slate*, *Arctic Cyan*.
  - Corner radius adjuster (*Sharp*, *Rounded*, *Pill*).
  - Window glass opacity slider (65% to 100%).
- **System Tray & Global Hotkeys**:
  - Tray icon with quick toggle, pin, compact mode, and quit.
  - Global hotkey `Ctrl+Shift+T` / `Cmd+Shift+T` to summon widget from anywhere.
- **Embedded Sync Host**:
  - Embedded token-authenticated WebSocket server on port `48721`.
  - Dynamic QR code generation with multi-network interface discovery.

---

## 📱 2. Mobile App (`/mobile`)
Cross-platform mobile application for **Android** and **iOS** configured for standalone web / PWA and **Capacitor** native builds.

### Features
- Native mobile layout with iOS Notch / Dynamic Island and Android navigation bar safe-area support.
- Touch-optimized task creation, swipeable buttons, and priority tag cyclists.
- Built-in **Camera QR Code Scanner** for point-and-scan pairing with the desktop widget.
- Hotspot gateway auto-detection and manual LAN IP fallback.
- Offline buffer: allows full task management while disconnected, auto-syncs on reconnect.
- Ready for native compilation to `.apk` (Android) and `.ipa` (iOS).

---

## 🚀 How to Run

### 1. Launch the Desktop Widget
```bash
# In project root
pnpm desktop
# Or inside /desktop
cd desktop
pnpm start
```

### 2. Launch the Mobile App
```bash
# In project root
pnpm mobile
```
Open `http://<your-desktop-ip>:3000` on your mobile browser (or run it via Capacitor / simulator).

### 3. Pair in 2 Seconds
1. In the desktop widget, click the **Settings / Tune** (`tune`) icon in the sidebar to open the Mobile Device Pairing view.
2. In the mobile app, tap the **Sync** tab and tap **Start QR Scanner**.
3. Point your phone at the desktop screen.
4. **Done!** Both devices are now paired permanently with real-time bi-directional sync.
