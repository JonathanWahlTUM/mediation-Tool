// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os'); // Für lokale IP-Erkennung (optional)

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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
  // Eine Ebene nach oben (..), dann "index.html"
  // => Pfad: /mediation-Tool/index.html
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

/* 
   2) Dann: Statische Dateien aus "public" 
      (bspw. /participant.html, /index.html [Voting], /qr.js, ...).
*/
app.use(express.static(path.join(__dirname, 'public')));

/* --- API-Endpoint für lokale IP (ggf. unnötig auf Render) --- */
app.get('/api/ip', (req, res) => {
  res.json({ ip: localIP });
});

/* --- Socket.io-Setup --- */
io.on('connection', (socket) => {
  console.log('New participant connected:', socket.id);

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

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Participant disconnected:', socket.id);
    delete participantData[socket.id];
    io.emit('results', participantData);
  });
});

/* --- Port für Render oder local --- */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});