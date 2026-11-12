# Data storage and backup

## Desktop

The Electron desktop app stores its main state in:

`<Electron userData directory>/tasks_store.json`

The directory is selected by Electron's `app.getPath('userData')` and
varies by operating system and application identity. The JSON store contains
task data, recurring task data, completed history, tags, and settings. The
desktop settings include the sync port and pairing token.

The application creates a default store when one does not exist and performs
day-rollover processing when the store is initialized.

## Mobile

The mobile WebView uses browser localStorage keys including:

- `tasks_mobile_data` — tasks, recurring tasks, history, tags, and settings;
- `tasks_sync_config` — desktop address, port, reconnect token, and peer
  information; and
- `tasks_offline_queue` — pending changes to send when reconnected.

These values are local to the app's WebView storage context.

## Synchronization

The desktop host sends full state snapshots to connected clients. Mobile
changes made while offline are stored in an offline queue and sent after
reconnection. Queue compaction removes some redundant changes, but the
current system is not a full conflict-free replicated database.

## Backup recommendations

Task Thing does not currently provide an integrated cloud backup service or
a guaranteed backup/restore workflow.

- Close the app before copying the desktop JSON store.
- Keep backups in a private, access-controlled location.
- Do not share raw store files; they may contain personal task details and
  sync credentials.
- Keep more than one backup if the data is important.
- Test that a backup can be restored before relying on it.

## Deletion

Removing local application data is destructive. Identify the correct
application data directory before deleting anything. Operating-system
uninstallers and mobile backup/restore settings may affect whether data
remains after uninstall.

## Data format changes

The JSON structure may change between releases. Keep a copy of the original
store before upgrading if it contains important information.
