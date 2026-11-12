# Security policy

## Supported versions

Security fixes are prioritized for the latest published Task Thing release.
Older releases may not receive fixes. Update from the official repository
release page when a newer release is available.

## Reporting a vulnerability

Please do not publish an exploitable vulnerability in a public issue before
the maintainer has had a reasonable opportunity to investigate.

Use GitHub's **Report a vulnerability** / private vulnerability reporting
feature for this repository if it is enabled. If it is unavailable, contact
the repository owner through the GitHub profile associated with
Javanvibecodes and request a private disclosure channel. Do not include
secrets, personal task data, or live pairing tokens in a report.

Please include:
- affected release, operating system, and device type;
- clear reproduction steps and expected versus actual behavior;
- impact and realistic attack conditions; and
- logs or screenshots with personal data and credentials removed.

We will acknowledge reports when reasonably possible, investigate, and
coordinate a fix or mitigation. No response-time or bounty guarantee is
made.

## Current security notes

- Desktop renderer configuration sets context isolation and sandboxing on,
  and disables Node integration.
- Renderer-to-main access is exposed through a preload bridge with named
  IPC methods.
- The local sync server binds to all network interfaces and uses plain
  HTTP/WebSocket transport.
- Pairing uses a six-digit one-time code; failed authentication is rate
  limited per remote address (five failed attempts per 60-second window).
- The desktop persists a reconnect token; the mobile app stores sync
  credentials in localStorage.
- The local server includes unauthenticated health and WebRTC signaling
  routes; the snapshot route checks the token.
- Android currently allows cleartext traffic for local connectivity.

These controls are not a guarantee of security. In particular, plain
WebSocket traffic is not encrypted, and a persistent token should be treated
like a password. Do not use sync on an untrusted network. See
docs/SECURITY.md for the threat model and hardening notes.
