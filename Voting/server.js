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
  Wir speichern participantData[socket.id] = {
    name, 
    profession, 
    votes: { category: value, ... }, 
    roofChoice, 
    facadeChoice, 
    coreChoice
  }
*/
let participantData = {};

/* --- OPTIONAL: automatische IP-Erkennung für lokales Debugging --- */
function getLocalIPAddress() {
  const ifaces = os.networkInterfaces();
  for (const ifaceName in ifaces) {
    for (const iface of ifaces[ifaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address; // z.B. "192.168.0.213"
      }
    }
  }
  return '127.0.0.1'; // Fallback
}
const localIP = getLocalIPAddress();
console.log('Local IP detected:', localIP);

/* --- Serve static files from the "public" folder --- */
app.use(express.static(path.join(__dirname, 'public')));

/* --- Kleines API-Endpoint, um lokal die IP anzuzeigen. 
       Auf Render ist das evtl. weniger aussagekräftig. --- */
app.get('/api/ip', (req, res) => {
  res.json({ ip: localIP });
});

/* --- Socket.io-Setup --- */
io.on('connection', (socket) => {
  console.log('New participant connected:', socket.id);

  // Registrieren (Name + Profession)
  socket.on('registerParticipant', (data) => {
    participantData[socket.id] = {
      name: data.name || 'Unknown',
      profession: data.profession || 'Unknown',
      votes: {},
      roofChoice: 1,
      facadeChoice: 1,
      coreChoice: 1
    };

    // Bar-Chart-Kategorien starten mit 0
    categories.forEach(cat => {
      participantData[socket.id].votes[cat] = 0;
    });

    io.emit('results', participantData);
  });

  // Wenn ein Teilnehmer einen Schieberegler nutzt (Vote)
  socket.on('vote', (voteData) => {
    const { category, value } = voteData;
    if (participantData[socket.id]) {
      participantData[socket.id].votes[category] = value;
      io.emit('results', participantData);
    }
  });

  // Wenn Dach-, Fassade- oder Kern-Variante gewählt wird
  socket.on('variantChoice', (choiceData) => {
    if (participantData[socket.id]) {
      participantData[socket.id].roofChoice = choiceData.roofChoice;
      participantData[socket.id].facadeChoice = choiceData.facadeChoice;
      participantData[socket.id].coreChoice = choiceData.coreChoice;
      io.emit('results', participantData);
    }
  });

  // Beim Verbindungsabbruch entfernen wir den Teilnehmer
  socket.on('disconnect', () => {
    console.log('Participant disconnected:', socket.id);
    delete participantData[socket.id];
    io.emit('results', participantData);
  });
});

/* --- Port für Render: process.env.PORT oder 3000 --- */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});