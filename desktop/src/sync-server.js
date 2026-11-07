const { WebSocketServer } = require('ws');
const http = require('http');
const url = require('url');

/**
 * tasks.core SyncServer
 * Ultra-lightweight local-first WebSocket sync server.
 * Handles instant bi-directional updates, offline event reconciliation,
 * token-based security, and multi-interface LAN/hotspot connectivity.
 */
class SyncServer {
  constructor(options = {}) {
    this.port = options.port || 48721;
    this.token = options.token || 'TC-LOCAL';
    this.server = null;
    this.wss = null;
    this.clients = new Set();
    this.onMutation = options.onMutation || (() => {});
    this.onClientCountChange = options.onClientCountChange || (() => {});
    this.onRequestSnapshot = options.onRequestSnapshot || (() => ({}));
  }

  start(port, token) {
    if (port) this.port = port;
    if (token) this.token = token;

    if (this.server) {
      this.stop();
    }

    try {
      // HTTP server for health-checks, status, WebRTC signaling & WebSocket upgrades
      this.server = http.createServer((req, res) => {
        // Universal CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const parsedUrl = new URL(req.url, 'http://localhost');
        if (parsedUrl.pathname === '/ping') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'ok',
            app: 'tasks.core',
            version: '1.0.0',
            clients: this.clients.size,
            timestamp: Date.now()
          }));
          return;
        }

        // WebRTC Signaling Relay endpoint for remote cellular fallback
        if (parsedUrl.pathname === '/webrtc-signal' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            try {
              const signal = JSON.parse(body);
              this.broadcast('WEBRTC_SIGNAL', signal);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // Snapshot REST endpoint for quick fetch
        if (parsedUrl.pathname === '/snapshot') {
          const clientToken = parsedUrl.searchParams.get('token');
          if (this.token && clientToken !== this.token) {
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

      this.wss = new WebSocketServer({ noServer: true });

      // Handle Upgrade with Token Authentication
      this.server.on('upgrade', (request, socket, head) => {
        const parsedUrl = new URL(request.url, 'http://localhost');
        const clientToken = parsedUrl.searchParams.get('token');

        if (this.token && clientToken !== this.token) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      });

      this.wss.on('connection', (ws, request) => {
        this.clients.add(ws);
        this.onClientCountChange(this.clients.size);

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
        });

        ws.on('error', (err) => {
          console.warn('[tasks.core] WebSocket client error:', err.message);
          this.clients.delete(ws);
          this.onClientCountChange(this.clients.size);
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
    const { type, payload, timestamp } = message;

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
      if (Array.isArray(payload)) {
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
    if (type === 'WEBRTC_SIGNAL') {
      this.broadcast('WEBRTC_SIGNAL', payload, clientWs);
      return;
    }

    // 4. Regular mutation
    if (type) {
      this.onMutation(message);
      // Broadcast mutation to all other connected clients
      this.broadcast(type, payload, clientWs);
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
    this.clients.clear();
    this.onClientCountChange(0);
  }
}

module.exports = SyncServer;
