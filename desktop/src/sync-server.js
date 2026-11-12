const { WebSocketServer } = require('ws');
const http = require('http');
const crypto = require('crypto');

// Constant-time string compare so a wrong code cannot be timing-probed.
function safeEqual(a, b) {
  const left = Buffer.from(String(a ?? ''));
  const right = Buffer.from(String(b ?? ''));
  if (left.length !== right.length || left.length === 0) return false;
  return crypto.timingSafeEqual(left, right);
}

/**
 * Task Thing SyncServer
 * Ultra-lightweight local-first WebSocket sync server.
 * Handles instant bi-directional updates, offline event reconciliation,
 * token-based security, and multi-interface LAN/hotspot connectivity.
 *
 * Pairing uses a short-lived 6-digit code shown on the PC. A phone that presents
 * the current code is handed the long-lived pairing token, and the code is
 * rotated immediately, so a code can never be replayed or shared between
 * devices. Wrong guesses are rate limited per client address.
 */
class SyncServer {
  constructor(options = {}) {
    this.port = options.port || 48721;
    this.token = options.token || '';
    this.pairingCodeTtlMs = 5 * 60 * 1000;
    this.pairingCodeExpiresAt = Date.now() + this.pairingCodeTtlMs;
    this.pairingCode = options.pairingCode || SyncServer.createPairingCode();
    this.onPairingCodeChange = options.onPairingCodeChange || (() => {});
    this.failedAttempts = new Map();
    this.server = null;
    this.wss = null;
    this.clients = new Set();
    this.deviceName = options.deviceName || 'Task Thing PC';
    this.onMutation = options.onMutation || (() => {});
    this.onClientCountChange = options.onClientCountChange || (() => {});
    this.onClientsChange = options.onClientsChange || (() => {});
    this.onRequestSnapshot = options.onRequestSnapshot || (() => ({}));
  }

  static createPairingCode() {
    // 100000-999999: always six digits, never a leading zero.
    return String(crypto.randomInt(100000, 1000000));
  }

  getPairingCode() {
    return this.pairingCode;
  }

  rotatePairingCode() {
    const previous = this.pairingCode;
    do {
      this.pairingCode = SyncServer.createPairingCode();
    } while (this.pairingCode === previous);
    this.pairingCodeExpiresAt = Date.now() + this.pairingCodeTtlMs;
    try {
      this.onPairingCodeChange(this.pairingCode);
    } catch (e) {
      console.warn('[tasks.core] Pairing code listener failed:', e.message);
    }
    return this.pairingCode;
  }

  isRateLimited(address) {
    const entry = this.failedAttempts.get(address);
    if (!entry) return false;
    if (Date.now() > entry.resetAt) {
      this.failedAttempts.delete(address);
      return false;
    }
    return entry.count >= 5;
  }

  noteFailedAttempt(address) {
    const now = Date.now();
    const entry = this.failedAttempts.get(address);
    if (!entry || now > entry.resetAt) {
      this.failedAttempts.set(address, { count: 1, resetAt: now + 60000 });
    } else {
      entry.count += 1;
    }
  }

  start(port, token) {
    if (port) this.port = port;
    if (token) this.token = token;
    if (!/^[a-f0-9]{64}$/i.test(this.token)) throw new Error('A 256-bit cryptographic sync token is required.');

    if (this.server) {
      this.stop();
    }

    try {
      // HTTP server for health-checks, status, WebRTC signaling & WebSocket upgrades
      this.server = http.createServer((req, res) => {
        const origin = req.headers.origin || '';
        const allowedOrigins = new Set(['capacitor://localhost', 'http://localhost', 'https://localhost']);
        if (allowedOrigins.has(origin)) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Vary', 'Origin');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }
        if (req.method === 'OPTIONS') {
          if (!allowedOrigins.has(origin)) {
            res.writeHead(403);
            res.end();
            return;
          }
          res.writeHead(204);
          res.end();
          return;
        }

        const parsedUrl = new URL(req.url, 'http://localhost');
        if (parsedUrl.pathname === '/ping') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'ok',
            app: 'Task Thing',
            version: '1.0.0',
            port: this.port,
            device: this.deviceName,
            clients: this.clients.size,
            timestamp: Date.now()
          }));
          return;
        }

        // The unauthenticated HTTP signaling relay has been removed.
        if (parsedUrl.pathname === '/webrtc-signal') {
          res.writeHead(404);
          res.end();
          return;
        }

        // Snapshot REST endpoint for quick fetch
        if (parsedUrl.pathname === '/snapshot') {
          const clientToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
          if (!safeEqual(clientToken, this.token)) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
          }
          const snapshot = this.onRequestSnapshot();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(snapshot));
          return;
        }

        res.writeHead(404);
        res.end();
      });

      this.wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024, handleProtocols: (protocols) => protocols.has('taskthing') ? 'taskthing' : false });

      // Handle Upgrade with pairing-code / token authentication
      this.server.on('upgrade', (request, socket, head) => {
        const address = request.socket.remoteAddress || 'unknown';
        const protocols = String(request.headers['sec-websocket-protocol'] || '').split(',').map(v => v.trim()).filter(Boolean);
        const clientToken = protocols.find(v => v.startsWith('taskthing-token-'))?.slice(16) || '';
        const clientCode = protocols.find(v => v.startsWith('taskthing-code-'))?.slice(15) || '';
        const tokenOk = safeEqual(clientToken, this.token);
        const codeOk = Date.now() <= this.pairingCodeExpiresAt && safeEqual(clientCode, this.pairingCode);

        if (!tokenOk && !codeOk) {
          if (this.isRateLimited(address)) {
            socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
            socket.destroy();
            return;
          }
          this.noteFailedAttempt(address);
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        this.failedAttempts.delete(address);
        request.pairedWithCode = codeOk && !tokenOk;

        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      });

      this.wss.on('connection', (ws, request) => {
        this.clients.add(ws);
        ws.meta = { name: 'Unknown device', platform: 'unknown', connectedAt: Date.now() };
        this.onClientCountChange(this.clients.size);
        this.notifyClients();

        // Tell the phone which PC it is talking to, so it can show it.
        this.sendTo(ws, 'WELCOME', {
          name: this.deviceName,
          platform: process.platform,
          port: this.port
        });

        // A code was used: hand over the long-lived token, then burn the code.
        if (request.pairedWithCode) {
          try {
            ws.send(JSON.stringify({
              type: 'PAIR_ACCEPTED',
              payload: { token: this.token },
              timestamp: Date.now()
            }));
          } catch (e) {
            console.warn('[tasks.core] Could not send pairing token:', e.message);
          }
          this.rotatePairingCode();
        }

        ws.isAlive = true;
        ws.on('pong', () => {
          ws.isAlive = true;
        });

        // Immediately push current snapshot to newly connected client
        const snapshot = this.onRequestSnapshot();
        ws.send(JSON.stringify({
          type: 'STATE_SNAPSHOT',
          payload: snapshot,
          timestamp: Date.now()
        }));

        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message.toString());
            this.handleClientMessage(ws, data);
          } catch (err) {
            console.error('[tasks.core] Invalid WS message from client:', err);
          }
        });

        ws.on('close', () => {
          this.clients.delete(ws);
          this.onClientCountChange(this.clients.size);
          this.notifyClients();
        });

        ws.on('error', (err) => {
          console.warn('[tasks.core] WebSocket client error:', err.message);
          this.clients.delete(ws);
          this.onClientCountChange(this.clients.size);
          this.notifyClients();
        });
      });

      // Heartbeat monitor every 15 seconds
      this.heartbeatTimer = setInterval(() => {
        if (!this.wss) return;
        this.wss.clients.forEach((ws) => {
          if (!ws.isAlive) return ws.terminate();
          ws.isAlive = false;
          ws.ping();
        });
      }, 15000);

      this.server.listen(this.port, '0.0.0.0', () => {
        console.log(`[tasks.core Sync Server] Running on 0.0.0.0:${this.port}`);
      });

      this.server.on('error', (err) => {
        console.error('[tasks.core Sync Server Error]', err);
      });

      return true;
    } catch (err) {
      console.error('[tasks.core Sync Server Failed to Start]', err);
      return false;
    }
  }

  handleClientMessage(clientWs, message) {
    if (!message || typeof message !== 'object' || Array.isArray(message)) return;
    const { type, payload } = message;

    // 0. A phone introducing itself, so the PC can show which device is linked
    if (type === 'HELLO') {
      clientWs.meta = {
        name: (payload && payload.name) || 'Unknown device',
        platform: (payload && payload.platform) || 'unknown',
        connectedAt: clientWs.meta?.connectedAt || Date.now()
      };
      this.sendTo(clientWs, 'WELCOME', {
        name: this.deviceName,
        platform: process.platform,
        port: this.port
      });
      this.notifyClients();
      return;
    }

    // 1. Snapshot request
    if (type === 'SYNC_INIT_REQUEST') {
      const snapshot = this.onRequestSnapshot();
      if (clientWs.readyState === 1) {
        clientWs.send(JSON.stringify({
          type: 'STATE_SNAPSHOT',
          payload: snapshot,
          timestamp: Date.now()
        }));
      }
      return;
    }

    // 2. Offline queue batch reconciliation
    if (type === 'OFFLINE_QUEUE_SYNC') {
      if (Array.isArray(payload) && payload.length <= 100) {
        payload.forEach(item => {
          this.onMutation(item);
        });
      }
      // Broadcast updated snapshot to ensure consistency
      const snapshot = this.onRequestSnapshot();
      this.broadcast('STATE_SNAPSHOT', snapshot);
      return;
    }

    // 3. WebRTC signaling pass-through
    if (type === 'WEBRTC_SIGNAL') return;

    // 4. Regular mutation
    // Always answer with the full authoritative snapshot instead of forwarding
    // the raw event: the phone then shows exactly what the PC has, even if a
    // mutation was applied differently or two changes landed at once.
    if (type) {
      this.onMutation(message);
      this.broadcastSnapshot();
    }
  }

  sendTo(ws, type, payload) {
    if (!ws || ws.readyState !== 1) return false;
    try {
      ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
      return true;
    } catch (e) {
      console.warn('[tasks.core] Could not send to client:', e.message);
      return false;
    }
  }

  broadcastSnapshot() {
    const snapshot = this.onRequestSnapshot();
    this.broadcast('STATE_SNAPSHOT', snapshot);
  }

  getClients() {
    return [...this.clients]
      .filter((ws) => ws.readyState === 1)
      .map((ws) => ({
        name: ws.meta?.name || 'Unknown device',
        platform: ws.meta?.platform || 'unknown',
        connectedAt: ws.meta?.connectedAt || null
      }));
  }

  notifyClients() {
    try {
      this.onClientsChange(this.getClients());
    } catch (e) {
      console.warn('[tasks.core] Client list listener failed:', e.message);
    }
  }

  broadcast(type, payload, excludeClient = null) {
    const msg = JSON.stringify({
      type,
      payload,
      timestamp: Date.now()
    });

    this.clients.forEach((client) => {
      if (client !== excludeClient && client.readyState === 1) { // 1 = OPEN
        try {
          client.send(msg);
        } catch (e) {
          console.warn('Failed to broadcast to client:', e.message);
        }
      }
    });
  }

  getClientCount() {
    return this.clients.size;
  }

  stop() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.failedAttempts.clear();
    this.clients.clear();
    this.onClientCountChange(0);
    this.notifyClients();
  }
}

module.exports = SyncServer;
