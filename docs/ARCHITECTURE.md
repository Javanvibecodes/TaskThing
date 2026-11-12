# Architecture

## Overview

Task Thing is a two-part local-first application:

- **Desktop:** Electron application with a renderer UI, a preload bridge, a
  main process, local JSON persistence, and a local HTTP/WebSocket server.
- **Mobile:** Capacitor application whose UI is a bundled web application
  running inside a native WebView, with localStorage persistence and a
  WebSocket client.

The desktop application is the sync host. The mobile app connects to it
directly over the local network. There is no Task Thing-operated cloud
database in the current implementation.

## Desktop process boundaries

- `desktop/src/main.js` creates the BrowserWindow, system tray, IPC
  handlers, and SyncServer instance.
- `desktop/src/preload.js` exposes a limited `tasksAPI` bridge through
  Electron's contextBridge.
- `desktop/src/index.html` and `desktop/src/renderer.js` provide the UI.
- `desktop/src/store.js` persists the task state as JSON in Electron's
  user-data directory.
- `desktop/src/sync-server.js` hosts HTTP endpoints and WebSocket
  connections.
- `desktop/src/port-utils.js` chooses an available local port.

The BrowserWindow currently sets `contextIsolation: true`,
`nodeIntegration: false`, and `sandbox: true`.

## Mobile process

- `mobile/index.html` is the mobile UI shell.
- `mobile/public/mobile-app.js` owns app state, persistence, task UI, and
  sync-client behavior.
- Capacitor provides the native Android/iOS bridge and packaging.
- Mobile task data, sync configuration, and the offline queue are persisted
  in Web Storage.

## Data flow

1. A user changes task state in the desktop renderer or mobile UI.
2. The local store is updated on that device.
3. When paired, the mobile client sends a mutation or offline batch to the
   desktop host.
4. The desktop applies supported mutations and broadcasts an authoritative
   state snapshot.
5. The mobile client replaces/reconciles its view with the received state.

The desktop is the authoritative sync host during a live session. The current
implementation is not a general multi-master distributed database.

## Runtime and packaging

- Root package scripts delegate to desktop and mobile packages.
- Electron Builder packages the desktop application.
- Vite and Tailwind build the mobile web bundle.
- Capacitor syncs the web bundle into native platform projects.

See BUILD.md for commands and prerequisites.

## Known architectural constraints

- Sync uses plain HTTP/WebSocket and is intended for a trusted local
  network.
- Mobile localStorage and the desktop JSON store are not encrypted vaults.
- Snapshot-based reconciliation may not preserve every concurrent offline
  edit in the way a conflict-aware database would.
- The desktop server currently binds to `0.0.0.0`; network firewall
  configuration matters.
- Update checks rely on GitHub or a Git remote and are separate from core
  local task management.
