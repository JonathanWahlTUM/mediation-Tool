// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os'); // Für lokale IP-Erkennung (optional)

const app = express();
const server = http.createServer(app);
const io = new Server(server);

/* --- Kategorien für die Bar Charts --- */
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

/* --- IP-Erkennung für lokales Debugging (nicht zwingend nötig) --- */
function getLocalIPAddress() {
  const ifaces = os.networkInterfaces();
  for (const ifaceName in ifaces) {
    for (const iface of ifaces[ifaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address; // z.B. 192.168.0.XX
      }
    }
  }
  return '127.0.0.1'; // Fallback
}
const localIP = getLocalIPAddress();
console.log('Local IP detected:', localIP);

/* --- Statische Dateien aus dem "public"-Ordner bereitstellen. 
       (Dieser liegt neben server.js, also z.B. Voting/public/...) --- */
app.use(express.static(path.join(__dirname, 'public')));

/* 
   NEUE Route: Liefere die Container-Seite aus, 
   die sich ZWEI Ebenen höher befindet:
   mediation-Tool/index.html
*/
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'index.html'));
});

/* --- Kleines API-Endpoint: /api/ip ---
       (zeigt lokal die IP, auf Render meist 127.0.0.1) */
app.get('/api/ip', (req, res) => {
  res.json({ ip: localIP });
});

/* --- Socket.io-Setup --- */
io.on('connection', (socket) => {
  console.log('New participant connected:', socket.id);

  // Registrieren (Name + Beruf)
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

  // Slidereingaben (Vote) pro Kategorie
  socket.on('vote', (voteData) => {
    const { category, value } = voteData;
    if (participantData[socket.id]) {
      participantData[socket.id].votes[category] = value;
      io.emit('results', participantData);
    }
  });

  // Variantenwahl (Dach, Fassade, Kern)
  socket.on('variantChoice', (choiceData) => {
    if (participantData[socket.id]) {
      participantData[socket.id].roofChoice = choiceData.roofChoice;
      participantData[socket.id].facadeChoice = choiceData.facadeChoice;
      participantData[socket.id].coreChoice = choiceData.coreChoice;
      io.emit('results', participantData);
    }
  });

  // Teilnehmer entfernt sich
  socket.on('disconnect', () => {
    console.log('Participant disconnected:', socket.id);
    delete participantData[socket.id];
    io.emit('results', participantData);
  });
});

/* --- Port für Render (oder 3000 lokal) --- */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});