const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// maxHttpBufferSize configurato a 100MB per evitare blocchi o caricamenti infiniti con i video grandi
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    maxHttpBufferSize: 1e8 
});

// Serve tutti i file statici (Risolve il problema del favicon mancante online)
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Mappa globale per memorizzare gli utenti connessi
const activeUsersMap = {};

io.on('connection', (socket) => {
    // Genera un nome temporaneo iniziale solo per il primo ingresso
    const initialUsername = `Utente_${Math.floor(1000 + Math.random() * 9000)}`;
    
    activeUsersMap[socket.id] = {
        name: initialUsername,
        avatar: null
    };

    // Comunica al client il suo nome provvisorio iniziale
    socket.emit('init', { username: initialUsername });
    io.emit('update-users', activeUsersMap);

    // Gestione quando l'utente sceglie o aggiorna il profilo (Nome e Avatar reali)
    socket.on('update-profile', (data) => {
        const oldName = activeUsersMap[socket.id]?.name || initialUsername;
        
        if (activeUsersMap[socket.id]) {
            activeUsersMap[socket.id].name = data.name || activeUsersMap[socket.id].name;
            activeUsersMap[socket.id].avatar = data.avatar || activeUsersMap[socket.id].avatar;
        }

        // Se l'utente ha inserito il suo nome reale per la prima volta, invia l'ingresso col nome SCELTO
        if (oldName.startsWith('Utente_') && data.name && !data.name.startsWith('Utente_')) {
            io.emit('system-message', `${data.name} è entrato nella chat.`);
        } else if (oldName !== data.name) {
            io.emit('system-message', `${oldName} ha cambiato nome in ${data.name}.`);
        }

        // Sincronizza istantaneamente la lista utenti per tutti
        io.emit('update-users', activeUsersMap);
    });

    // Gestione unificata e pulita dei messaggi (Testo, Immagine, Audio, Video)
    socket.on('chat-message', (msgData) => {
        const user = activeUsersMap[socket.id] || { name: 'Anonimo', avatar: null };
        
        const payload = {
            id: msgData.id || 'msg_' + Date.now(),
            username: user.name, // Invia Sempre il nome reale aggiornato memorizzato sul server
            avatar: user.avatar,
            text: msgData.text || '',
            image: msgData.image || null,
            audio: msgData.audio || null,
            video: msgData.video || null, // Nuovo supporto video
            file: msgData.file || null,
            fileName: msgData.fileName || null,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        io.emit('chat-message', payload);
    });

    // Disconnessione immediata senza ritardi su Render
    socket.on('disconnect', () => {
        const user = activeUsersMap[socket.id];
        if (user) {
            // Mostra il nome SCELTO dall'utente nei messaggi di sistema, non quello provvisorio
            io.emit('system-message', `${user.name} ha abbandonato la chat.`);
            delete activeUsersMap[socket.id];
        }
        io.emit('update-users', activeUsersMap);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 LiveRoom attiva su http://localhost:${PORT}`);
});
