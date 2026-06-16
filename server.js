const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let onlineUsersCount = 0;

io.on('connection', (socket) => {
    onlineUsersCount++;
    const username = `Utente_${Math.floor(1000 + Math.random() * 9000)}`;
    
    socket.emit('init', { username });
    io.emit('update-users', onlineUsersCount);
    socket.broadcast.emit('system-message', `${username} è entrato nella chat.`);

    socket.on('chat-message', (messageText) => {
        io.emit('chat-message', {
            username: username,
            text: messageText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    });

    socket.on('disconnect', () => {
        onlineUsersCount--;
        io.emit('update-users', onlineUsersCount);
        socket.broadcast.emit('system-message', `${username} ha abbandonato la chat.`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 Chat attiva a schermo intero!`);
    console.log(`👉 Apri nel browser: http://localhost:${PORT}`);
    console.log(`==================================================`);
});