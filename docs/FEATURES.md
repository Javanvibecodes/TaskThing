# Features

This document describes functionality visible in the current Task Thing
repository. Feature availability can vary by platform and release.

## Tasks

- Create tasks for today or schedule them for tomorrow.
- Set a priority, time, and tag.
- Edit, complete, reopen, and delete tasks.
- Carry unfinished tasks forward as rollover items.
- Review completed-task history.

## Recurring tasks / habits

- Create recurring task entries.
- Enable or disable recurring entries.
- Configure the available recurrence options and task details in the app.
- The app instantiates enabled recurring tasks during its daily rollover
  process.

## Desktop widget

- Electron desktop application.
- Compact, resizable widget window.
- System tray controls, including show/hide and quick-add.
- Always-on-top preference.
- Theme selection.
- Local JSON persistence.

## Mobile companion

- Capacitor-based mobile application with Android project configuration.
- Touch-oriented task and habit interface.
- Local persistence using Web Storage.
- Sync connection status, reconnect, and disconnect controls.
- Offline change queue that is compacted before synchronization.
- Update check and GitHub issue-reporting entry points.

## Local sync

- Desktop-hosted HTTP/WebSocket server.
- Manual PC address and six-digit pairing-code workflow.
- Persistent reconnect token after pairing.
- Two-way state synchronization and snapshot reconciliation.
- Local offline queue for mobile changes.

## Platform availability

The repository configures Electron packaging targets for Windows, macOS, and
Linux, and includes a Capacitor Android project. Check the
[Releases page](https://github.com/Javanvibecodes/TaskThing/releases) for
platforms with an actual published installer. A configured build target is
not the same as a tested or published release.
