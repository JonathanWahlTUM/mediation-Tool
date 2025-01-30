// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os'); // Für lokale IP-Erkennung (optional)

const app = express();
const server = http.createServer(app);
const io = new Server(server);

/* --- Voting Phases Status --- */
let votingPhases = {
  preferences: true, // Initial auf aktiviert gesetzt
  variants: true
};

/* --- Define categories for the bar charts --- */
const categories = [
  'operationalCosts',
  'demolitionCosts',
  'greenAreaCityCooling',
  'co2Footprint',
  'reuseOfMaterial'
];

/* 
  participantData[socket.id] = {
    name, 
    profession, 
    votes: { category: value, ... }, 
    roofChoice, 
    facadeChoice, 
    coreChoice
  }
*/
let participantData = {};

/* --- OPTIONAL: IP-Erkennung (lokal nützlich, auf Render meist 127.0.0.1) --- */
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

/* 
   1) Route für "/" definieren, BEVOR du die statischen Dateien bedienst.
      Dadurch wird garantiert, dass "/" immer deine Container-Seite ausliefert,
      anstatt "public/index.html".
*/
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html')); // Korrigiert: Sende das Hauptindex.html
});

/* 
   2) Dann: Statische Dateien aus "Voting/public" 
      (bspw. /participant.html, /index.html [Voting], /qr.js, ...).
*/
app.use('/Voting/public', express.static(path.join(__dirname, 'Voting/public'))); // Korrigiert: Mount statisches Verzeichnis

/* --- API-Endpoint für lokale IP (ggf. unnötig auf Render) --- */
app.get('/api/ip', (req, res) => {
  res.json({ ip: localIP });
});

/* --- Socket.io-Setup --- */
io.on('connection', (socket) => {
  console.log('New participant connected:', socket.id);

  // Sende den aktuellen Phasenstatus an den neu verbundenen Client
  socket.emit('phaseState', votingPhases);

  // Registrieren
  socket.on('registerParticipant', (data) => {
    participantData[socket.id] = {
      name: data.name || 'Unknown',
      profession: data.profession || 'Unknown',
      votes: {},
      roofChoice: 1,
      facadeChoice: 1,
      coreChoice: 1
    };

    // Kategorien initialisieren
    categories.forEach(cat => {
      participantData[socket.id].votes[cat] = 0;
    });

    io.emit('results', participantData);
  });

  // Slider/Vote-Eingaben
  socket.on('vote', (voteData) => {
    const { category, value } = voteData;
    if (participantData[socket.id] && votingPhases.preferences) { // Nur wenn Preferences aktiviert
      participantData[socket.id].votes[category] = value;
      io.emit('results', participantData);
    }
  });

  // Variantenwahl
  socket.on('variantChoice', (choiceData) => {
    if (participantData[socket.id] && votingPhases.variants) { // Nur wenn Variants aktiviert
      participantData[socket.id].roofChoice = choiceData.roofChoice;
      participantData[socket.id].facadeChoice = choiceData.facadeChoice;
      participantData[socket.id].coreChoice = choiceData.coreChoice;
      io.emit('results', participantData);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Participant disconnected:', socket.id);
    delete participantData[socket.id];
    io.emit('results', participantData);
  });

  /* --- Handling Control Panel Events --- */
  socket.on('togglePhase', (phase, state) => {
    if (phase in votingPhases) {
      votingPhases[phase] = state;
      console.log(`Phase "${phase}" toggled to ${state}`);
      io.emit('phaseState', votingPhases); // Broadcast to all clients
    }
  });
});

/* --- Port für Render oder local --- */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});