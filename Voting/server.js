// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os'); // Für automatische IP-Erkennung

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- Define categories for the bar charts ---
const categories = [
  'operationalCosts',
  'demolitionCosts',
  'greenAreaCityCooling',
  'co2Footprint',
  'reuseOfMaterial'
];

// We store participant data in an object, keyed by socket.id
// participantData[socketId] = {
//   name: string,
//   profession: string,
//   votes: { ... },
//   roofChoice: number, // 1,2,3
//   facadeChoice: number,
//   coreChoice: number
// }
let participantData = {};

// --- Function to get local IP automatically ---
function getLocalIPAddress() {
  const ifaces = os.networkInterfaces();
  for (const ifaceName in ifaces) {
    for (const iface of ifaces[ifaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address; // e.g. 192.168.0.213
      }
    }
  }
  return '127.0.0.1'; // Fallback
}
const localIP = getLocalIPAddress();
console.log('Local IP detected:', localIP);

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Small API endpoint so that "index.html" can fetch the IP
app.get('/api/ip', (req, res) => {
  res.json({ ip: localIP });
});

io.on('connection', (socket) => {
  console.log('New participant connected:', socket.id);

  // When a participant registers (name + profession)
  socket.on('registerParticipant', (data) => {
    participantData[socket.id] = {
      name: data.name || 'Unknown',
      profession: data.profession || 'Unknown',
      votes: {},
      roofChoice: 1,    
      facadeChoice: 1,
      coreChoice: 1
    };

    // Initialize all bar chart categories to 0
    categories.forEach(cat => {
      participantData[socket.id].votes[cat] = 0;
    });

    io.emit('results', participantData);
  });

  // When a participant moves a slider (for the bar-chart categories)
  socket.on('vote', (voteData) => {
    // voteData = { category, value }
    const { category, value } = voteData;
    if (participantData[socket.id]) {
      participantData[socket.id].votes[category] = value;
      io.emit('results', participantData);
    }
  });

  // When a participant chooses ROOF/FACADE/CORE variant
  socket.on('variantChoice', (choiceData) => {
    // choiceData = { roofChoice, facadeChoice, coreChoice }
    if (participantData[socket.id]) {
      participantData[socket.id].roofChoice = choiceData.roofChoice;
      participantData[socket.id].facadeChoice = choiceData.facadeChoice;
      participantData[socket.id].coreChoice = choiceData.coreChoice;
      io.emit('results', participantData);
    }
  });

  // On disconnect, remove the participant
  socket.on('disconnect', () => {
    console.log('Participant disconnected:', socket.id);
    delete participantData[socket.id];
    io.emit('results', participantData);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://${localIP}:${PORT}`);
});
