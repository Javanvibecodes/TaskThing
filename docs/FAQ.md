# Frequently asked questions

## Does Task Thing need an account?

No Task Thing account is required by the current implementation.

## Does my task data go to a Task Thing cloud server?

The current app stores task data locally and synchronizes directly between
paired devices over the local network. Update checks and issue reporting may
connect to GitHub; see PRIVACY.md.

## Can I use the desktop app without my phone?

Yes. The desktop app can manage its local tasks without a paired phone.
Likewise, the mobile app stores its own local state.

## Why is my phone not connecting?

- Confirm both devices are on the same trusted Wi-Fi network or a supported
  hotspot.
- Check that the PC's displayed IP address is current.
- Confirm the desktop app is running and its sync server has started.
- Re-enter the current six-digit pairing code.
- Check that the computer firewall allows local connections to the app's
  active port.
- Avoid guest Wi-Fi networks that isolate connected devices.

## Why did the pairing code change?

The code is single-use. It rotates after a successful pairing to prevent
replay of the same code.

## Do I need to enter the pairing code every time?

No. After pairing, the mobile app stores a reconnect credential. If the
credential is cleared or the desktop's pairing configuration changes, pair
again using the current code.

## What happens when my phone is offline?

Mobile changes are stored locally and queued for later synchronization.
Reconnect to the desktop to send pending changes. Keep a backup of important
data; offline queue reconciliation is not a substitute for backup.

## Is sync encrypted?

No. The current local sync transport uses ordinary HTTP/WebSocket rather
than HTTPS/WSS. Use a trusted network and do not expose the sync port to the
public internet.

## Is Task Thing open source?

Yes. Task Thing is released under the MIT License. You may use, fork, modify,
and redistribute the project, including building derivative applications,
subject to the license terms. The Task Thing name and logo are not granted as
trademarks. See [LICENSE](../LICENSE), [COPYRIGHT](../COPYRIGHT.md), and
[CONTRIBUTING](../CONTRIBUTING.md).

## Is there an iOS, macOS, or Linux release?

The repository has Capacitor iOS configuration and Electron packaging
targets, but a configured target does not mean an official binary has been
published or tested. Check the Releases page for actual assets.

## Where do I report a bug?

Open a GitHub issue using the instructions in SUPPORT.md. Do not post
security vulnerabilities or credentials publicly; follow SECURITY.md.
