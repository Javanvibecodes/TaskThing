# Security model and hardening notes

## Intended environment

Task Thing's current sync feature is intended for a private, trusted local
network between a user's own desktop and phone. It is not designed to expose
the desktop sync server to the public internet.

## Existing protections

- Electron renderer uses context isolation, sandboxing, and disabled Node
  integration.
- Renderer access to native functions goes through a preload bridge.
- Pairing accepts a six-digit random code or the persistent reconnect token.
- Code comparison uses Node's timing-safe equality function.
- A successful code-based pairing rotates the code.
- Failed authentication is rate limited by remote address.
- WebSocket connections have a heartbeat monitor.

## Important limitations

- HTTP/WebSocket traffic is unencrypted; credentials and task data can be
  observed by an attacker with a suitable network position.
- The server binds to all network interfaces, not only loopback.
- The persistent reconnect token is stored in desktop JSON and mobile
  localStorage; it is not protected by a dedicated secret vault.
- The six-digit code has no explicit time-to-live in the current code.
- `/ping` and `/webrtc-signal` are unauthenticated.
- CORS is permissive. CORS is not an authentication boundary.
- Android allows cleartext traffic for local connectivity.
- Local task stores are not encrypted at rest.
- The protocol does not provide robust multi-device conflict resolution.
- A firewall or router may expose the listening port if misconfigured.

## User precautions

1. Pair only devices you own or trust.
2. Use a private Wi-Fi network or a trusted hotspot.
3. Do not port-forward the sync port or expose it to the public internet.
4. Do not share screenshots containing pairing codes, tokens, or task data.
5. Protect device login and backups.
6. Keep the app updated from official releases.

## Recommended engineering hardening

Before broad public or commercial distribution, prioritize:

- Use WSS/HTTPS with authenticated certificates or a secure local transport.
- Bind to the narrowest required interfaces and provide an explicit
  opt-in for LAN access.
- Authenticate every sensitive HTTP endpoint and remove or secure
  unauthenticated signaling.
- Replace wildcard CORS with an explicit origin policy where applicable.
- Add pairing-code expiry, attempt throttling, and a user-controlled
  revocation/reset workflow.
- Store reconnect credentials in platform secure storage where available.
- Validate message schemas, payload sizes, and mutation permissions.
- Add protocol version negotiation and replay/idempotency protections.
- Add automated security tests and dependency vulnerability checks.
- Review Android cleartext and backup settings before production release.

This document describes known behavior and recommendations; it is not a
security certification or guarantee.
