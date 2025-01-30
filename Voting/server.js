const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

/* --- Kategorien für das Voting-Tool --- */
const categories = [
  'operationalCosts',
  'demolitionCosts',
  'greenAreaCityCooling',
  'co2Footprint',
  'reuseOfMaterial'
];

let participantData = {}; // Speicherung der Votes

// Kontrollzentrum-Variablen
let preferencesActive = false;
let variantsActive = false;
let showBarCharts = true;
let showPieCharts = false;
let discussionTimer = 600;
let timerInterval = null;

/* --- API für die öffentliche URL von Render --- */
app.get('/api/ip', (req, res) => {
  res.json({ ip: req.headers.host });
});

/* --- Routen richtig setzen --- */

// **1️⃣ Haupt-Index-Seite (mit ShapeDiver & Voting-Tool)**
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html')); 
});

// **2️⃣ Voting-Ordner (enthält das Voting-Tool)**
app.use('/voting', express.static(path.join(__dirname, 'Voting/public')));

// **3️⃣ Teilnehmer-Seite**
app.get('/participant', (req, res) => {
  res.sendFile(path.join(__dirname, 'Voting/public', 'participant.html'));
});

/* --- WebSocket Events (Steuerung durch das Kontrollzentrum) --- */
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.emit('updatePreferences', preferencesActive);
  socket.emit('updateVariants', variantsActive);
  socket.emit('updateBarCharts', showBarCharts);
  socket.emit('updatePieCharts', showPieCharts);
  socket.emit('updateTimer', discussionTimer);

  // Kontrollzentrum-Befehle
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

  // Teilnehmer-Registrierung
  socket.on('registerParticipant', (data) => {
    participantData[socket.id] = {
      name: data.name || 'Unknown',
      profession: data.profession || 'Unknown',
      votes: {},
      roofChoice: 1,
      facadeChoice: 1,
      coreChoice: 1
    };

    categories.forEach(cat => {
      participantData[socket.id].votes[cat] = 0;
    });

    io.emit('results', participantData);
  });

  // Votes speichern
  socket.on('vote', (voteData) => {
    const { category, value } = voteData;
    if (participantData[socket.id]) {
      participantData[socket.id].votes[category] = value;
      io.emit('results', participantData);
    }
  });

  // Variantenwahl
  socket.on('variantChoice', (choiceData) => {
    if (participantData[socket.id]) {
      participantData[socket.id].roofChoice = choiceData.roofChoice;
      participantData[socket.id].facadeChoice = choiceData.facadeChoice;
      participantData[socket.id].coreChoice = choiceData.coreChoice;
      io.emit('results', participantData);
    }
  });

  // Teilnehmer verlässt die Sitzung
  socket.on('disconnect', () => {
    console.log('Participant disconnected:', socket.id);
    delete participantData[socket.id];
    io.emit('results', participantData);
  });
});

/* --- Server starten --- */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server läuft unter: https://mediation-tool.onrender.com`);
});