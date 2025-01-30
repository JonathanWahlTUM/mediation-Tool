const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Statusvariablen für Kontrollzentrum
let preferencesActive = false;
let variantsActive = false;
let showBarCharts = true;
let showPieCharts = false;
let discussionTimer = 600;
let timerInterval = null;

// Statische Dateien bereitstellen
app.use(express.static(path.join(__dirname, 'public')));
app.use('/voting', express.static(path.join(__dirname, 'voting/public')));

// Steuerung durch Kontrollzentrum
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Status-Updates beim neuen Client senden
  socket.emit('updatePreferences', preferencesActive);
  socket.emit('updateVariants', variantsActive);
  socket.emit('updateBarCharts', showBarCharts);
  socket.emit('updatePieCharts', showPieCharts);
  socket.emit('updateTimer', discussionTimer);

  socket.on('togglePreferences', () => {
    preferencesActive = !preferencesActive;
    io.emit('updatePreferences', preferencesActive);
});

socket.on('toggleVariants', () => {
    variantsActive = !variantsActive;
    io.emit('updateVariants', variantsActive); // <-- Korrektur
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