# Privacy notice

**Last updated:** 12 November 2026

This notice describes the current Task Thing desktop and mobile implementation
in this repository. It is not a promise that future versions will have
identical behavior; material changes should be reflected here.

## 1. Product design

Task Thing is designed as a local-first task and habit application. The
current implementation does not require a Task Thing account, hosted Task
Thing database, or Task Thing cloud service to create and manage tasks.

## 2. Information stored on your devices

Depending on how you use the app, Task Thing stores:

- task titles, priorities, times, dates, tags, completion history, and
  recurring-task settings;
- app preferences, including theme and window settings;
- local sync configuration, including the desktop address, port, and
  reconnect credential;
- pending offline changes waiting to be synchronized; and
- connected-device labels and connection metadata while a sync session is
  active.

On desktop, application data is stored in Electron's user-data directory in a
file named tasks_store.json. On mobile, app state and sync information are
stored in browser Web Storage (localStorage) inside the app's WebView.

These stores are not presented as encrypted vaults. Anyone with sufficient
access to your unlocked device or app data may be able to inspect them.

## 3. Local-network synchronization

When you connect a phone to a desktop, the desktop starts a local HTTP and
WebSocket server and listens on the computer's network interfaces. The
devices exchange task-state snapshots and changes directly over the local
network. The server uses a one-time six-digit pairing code and a persistent
reconnection token.

The current transport uses ordinary HTTP and WebSocket (not HTTPS/WSS). Your
network traffic is therefore not encrypted by Task Thing at the transport
layer. Use a trusted private network; do not pair devices over a public or
untrusted network. See SECURITY.md.

## 4. Connections to external services

The current code includes these internet-connected actions:

- **Mobile update check:** requests the latest release information from the
  GitHub API when you use the update-check feature.
- **Desktop update check:** attempts to fetch Git tags from the configured
  Git remote when you use the desktop update-check feature and a Git
  installation/remote is available.
- **Issue reporting:** opens GitHub's issue form in your browser. Information
  included in the prefilled report may include the note you typed, app
  version, device/screen information, and sync status. You choose whether to
  submit the issue to GitHub.

GitHub processes requests under its own privacy policy and terms. Task Thing
does not control GitHub's handling of information you submit there.

## 5. Analytics and advertising

The current application source does not intentionally implement a Task Thing
analytics, advertising, or behavioral-tracking service. This statement does
not cover telemetry that may be collected by the operating system, app store,
GitHub, or other third-party services outside Task Thing's control.

## 6. Sharing and disclosure

Task Thing does not upload your task list to a Task Thing-operated cloud
service in the current architecture. Information is shared with a paired
desktop or phone when you enable local sync. Information you independently
include in a GitHub issue is submitted to GitHub and may be publicly visible
depending on the issue and repository settings.

## 7. Retention and deletion

Your local data remains on your devices until you delete it, uninstall or
reset the app, or otherwise remove the relevant application data. Uninstall
behavior varies by operating system; do not assume uninstalling always
removes every backup or exported copy. You are responsible for backups and
for securely deleting files when needed.

To clear mobile local data, use the operating system's app storage controls
or clear the app's data. To remove desktop data, close Task Thing and remove
its application data directory only if you understand that this permanently
deletes the local task store. Keep a backup first if you may need the data.

## 8. Children's privacy

Task Thing is a general productivity tool and is not designed to collect
personal information from children. If you believe a child has submitted
personal information through a support issue, contact the repository owner.

## 9. Changes and contact

This notice may be updated as the application changes. For privacy questions,
contact the repository owner through the GitHub profile associated with
Javanvibecodes.
