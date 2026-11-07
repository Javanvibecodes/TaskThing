# Task Thing — Get your *things* together

A local-first, minimal productivity widget ecosystem built for **Windows**, **macOS**, **Android**, and **iOS**. All data remains 100% on your local devices with zero cloud database dependency.

---

## ⚡ Real-Time Peer-to-Peer Sync Engine

- **Peer-to-Peer Local Network**: Connects directly over your local Wi-Fi router or phone personal mobile hotspot. No external internet connection or cloud accounts needed.
- **Scan Once & Permanent Pairing**: Scan the desktop widget QR code on your phone once. All pairing tokens and credentials are saved permanently on your device.
- **Background Auto-Reconnect**: Reconnects in the background upon returning to the network.
- **Offline Buffer & Reconciliation**: Any tasks created or checked off while away or offline are queued in device storage and automatically merge with Last-Write-Wins timestamps when reconnected.
- **Independent Themes**: Theme color presets can be customized differently on PC and mobile.

---

## 🖥️ Desktop Widget (`/desktop`)
Cross-platform desktop floating widget built with **Electron**.

### Key Features
- **No Drop Shadow**: Frameless, crisp, transparent window without artificial drop shadows.
- **Native Window Controls**:
  - **Windows**: Native caption controls on the top right (`─` Minimize, `✕` Close with red highlight, Pin Always-on-top, and Compact mode toggle).
  - **macOS**: Native traffic light controls on the top-left (Red, Yellow, Green).
- **Device-Aware Shortcuts**:
  - Windows: `Ctrl+K` (Quick Add), `Ctrl+Shift+T` (Global summon).
  - macOS: `⌘K` (Quick Add), `⌘+Shift+T` (Global summon).
- **Today's Tasks & Pending Counter Badge**:
  - Dynamic pending task counter on the Active Tasks tab that decrements as you complete tasks throughout the day.
  - Completed History tab has no distracting notification badges.
- **Add Task Dropdown**:
  - Add Task form is hidden by default. Click **Add Task** to open.
  - Dropdown options: **Add for Today** or **Set for Tomorrow**.
  - Clean input placeholder with no "e.g." text.
  - Tag bank cycler + **+ New Tag** button to easily create and save custom tags.
- **Repeated Tasks (Daily Habits)**:
  - Configure recurring daily routines (daily standup, inbox zero, exercise) that automatically populate in Today's tasks at the start of each new day.
- **Overdue Task Rollover**:
  - Tasks left uncompleted from a previous day automatically move to the new day highlighted in red with an **Overdue** badge and a one-click **Move to Today** button.
- **Differentiated Empty States**:
  - Clean state when no tasks have been planned for today yet.
  - Celebratory state when all tasks for today are completed.
  - Skeleton shimmer loader during initial boot.
- **6 Dynamic Color Presets**:
  - Indigo Twilight, Emerald Botanical, Sunset Amber, Rose Berry, Obsidian Slate, and Arctic Cyan.
  - Operates independently on PC.

---

## 📱 Mobile App (`/mobile`)
Cross-platform mobile application for **Android** and **iOS** configured for standalone web / PWA and **Capacitor** native builds.

### Key Features
- Native mobile layout with iOS notch/Dynamic Island and Android navigation bar safe-area support.
- No user avatars or irrelevant desktop keyboard shortcut hints.
- Quick-add form with "Add for Today" vs "Set for Tomorrow" and Tag Bank creator.
- Repeated tasks manager for daily routines.
- Built-in camera QR scanner and real-time connection status pill.
- **Help & Legal section**: In-app pairing guide, 100% local privacy policy, terms of use, and local MIT license.

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
Open `http://<your-desktop-ip>:3000` on your mobile phone or simulator.

### 3. Pair Devices
1. In the PC widget, open **Preferences** (`tune`) to view the pairing QR code.
2. In the mobile app, tap **Sync** -> **Start QR Scanner**.
3. Point your phone at the PC screen. Devices will pair instantly.
