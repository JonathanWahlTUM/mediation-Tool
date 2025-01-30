const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let preferencesActive = false;
let variantsActive = false;
let showBarCharts = true;
let showPieCharts = false;
let discussionTimer = 600;
let timerInterval = null;

// Lokale IP-Adresse abrufen (für QR-Code)
function getLocalIPAddress() {
  const ifaces = os.networkInterfaces();
  for (const ifaceName in ifaces) {
    for (const iface of ifaces[ifaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}
const localIP = getLocalIPAddress();
console.log('Local IP detected:', localIP);

// Statische Dateien bereitstellen
app.use(express.static(path.join(__dirname, 'public')));
app.use('/voting', express.static(path.join(__dirname, 'voting/public')));

// API-Endpoint für IP
app.get('/api/ip', (req, res) => {
  res.json({ ip: localIP });
});

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Status-Updates an neuen Client senden
  socket.emit('updatePreferences', preferencesActive);
  socket.emit('updateVariants', variantsActive);
  socket.emit('updateBarCharts', showBarCharts);
  socket.emit('updatePieCharts', showPieCharts);
  socket.emit('updateTimer', discussionTimer);

  // Steuerbefehle empfangen
  socket.on('togglePreferences', () => {
    preferencesActive = !preferencesActive;
    io.emit('updatePreferences', preferencesActive);
  });

  socket.on('toggleVariants', () => {
    variantsActive = !variantsActive;
    io.emit('updateVariants', variantsActive);
  });

  socket.on('toggleBarCharts', () => {
    showBarCharts = !showBarCharts;
    io.emit('updateBarCharts', showBarCharts);
  });

  socket.on('togglePieCharts', () => {
    showPieCharts = !showPieCharts;
    io.emit('updatePieCharts', showPieCharts);
  });

  socket.on('startTimer', () => {
    if (timerInterval) clearInterval(timerInterval);
    discussionTimer = 600;
    io.emit('updateTimer', discussionTimer);

    timerInterval = setInterval(() => {
      discussionTimer--;
      io.emit('updateTimer', discussionTimer);
      if (discussionTimer <= 0) {
        clearInterval(timerInterval);
      }
    }, 1000);
  });

  socket.on('disconnect', () => {
    console.log('Participant disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});