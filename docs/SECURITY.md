# Security model and hardening notes

## Current status

Task Thing continues to use direct local-network HTTP and WebSockets. This hardening pass improves authentication and protocol limits, but **does not encrypt LAN traffic**. Do not use sync on an untrusted network, port-forward the sync port, or expose it to the public internet.

## Implemented in this hardening pass

- The desktop generates a 256-bit reconnect token with Node's cryptographic random generator. The predictable TC-LOCAL fallback is removed.
- WebSocket credentials move from URL query parameters into WebSocket subprotocols to reduce accidental leakage through URL logs.
- Pairing codes expire after five minutes and refresh when rotated.
- WebSocket payloads are capped at 1 MiB.
- The unauthenticated HTTP WebRTC signaling relay is disabled.
- The HTTP snapshot endpoint requires a Bearer token.
- CORS is restricted to Capacitor localhost origins.
- Offline mutation batches are capped at 100 items.
- Task IDs are escaped before interpolation into HTML attributes.
- Android app-data backup is disabled.

## Remaining security work

- **Encryption is not implemented yet.** A safe WSS migration requires certificate provisioning, trust, pinning, and rotation that work in Android and iOS WebViews.
- The server still listens on all interfaces to support LAN and hotspot sync. Keep the network private and firewall the port.
- Reconnect tokens remain in desktop app data and mobile localStorage; platform secure storage is not yet integrated.
- Android cleartext remains enabled because the current LAN protocol is HTTP/WS. Removing it before HTTPS/WSS migration would break sync.
- Desktop HTML still loads remote Tailwind and Google Fonts and contains inline code; a restrictive CSP requires bundling and refactoring these resources.
- IPC sender validation, complete IPC input schemas, mutation schema validation, replay/idempotency protection, device revocation, and full integration tests remain outstanding.
- Dependency audits must be run against both lockfiles before each release. This patch does not certify all transitive dependencies as vulnerability-free.

## User precautions

1. Pair only devices you own or trust.
2. Use a private Wi-Fi network or a trusted hotspot.
3. Never expose the sync port to the public internet.
4. Do not share pairing codes, tokens, or task data.
5. Keep device login protected and install updates from official releases.

This document describes implemented controls and known limitations; it is not a security certification or guarantee.
