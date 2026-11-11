const net = require('net');

// The PC never assumes a fixed port: another copy of the app (or an unrelated
// program) may already own it. We probe upwards from the preferred port and
// hand back the first one that is actually free, so the sync server always has
// a port to listen on and the phone can discover it.
function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => tester.close(() => resolve(true)));
    tester.listen(port, '0.0.0.0');
  });
}

function getEphemeralPort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '0.0.0.0', () => {
      const address = srv.address();
      const port = address && typeof address === 'object' ? address.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

async function findFreePort(preferred, attempts = 25) {
  // No hardcoded default port: if a preferred port is given (> 0), scan from it
  // upwards so the phone can always discover the port the PC is using.
  // If no preferred port is given, fall back to getting an ephemeral port from the OS.
  const start = Number(preferred) > 0 ? Number(preferred) : null;
  if (start) {
    for (let offset = 0; offset < attempts; offset += 1) {
      const port = start + offset;
      if (port > 65535) break;
      // Sequential on purpose: the first free port wins, so the phone finds it fast.
      // eslint-disable-next-line no-await-in-loop
      if (await isPortFree(port)) return port;
    }
  }
  // No suitable port found in the range; get a true ephemeral port from the OS.
  return await getEphemeralPort();
}

module.exports = { findFreePort, isPortFree, getEphemeralPort };
