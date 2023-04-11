const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');

const BackendEvents = {
  sessionInfo: 'session_info',
  sendMessage: 'send_message',
  errorOccurred: 'error_occurred',
};

const ClientEvents = {
  initiateSession: 'initiate_session',
  sendMessage: 'send_message',
};

const Senders = {
  me: 'me',
  computer: 'computer',
};

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const sessionStorage = {};

const addMessage = (sessionId, message, from) => {
  sessionStorage[sessionId] = Array.isArray(sessionStorage[sessionId]) ? sessionStorage[sessionId] : [];
  sessionStorage[sessionId].push({ from, text: message });
};

io.on('connection', socket => {
  console.log('a user connected');

  socket.on(ClientEvents.initiateSession, info => {
    const sessionId = info.session_id || socket.id;
    console.log('initiateSession:', sessionId);

    const isNewSession = !Array.isArray(sessionStorage[sessionId]);
    if (isNewSession) {
      addMessage(sessionId, 'Welcome to the chat!', Senders.computer)
    }

    socket.emit(BackendEvents.sessionInfo, {
      session_id: sessionId,
      is_new_session: isNewSession,
      messages: sessionStorage[sessionId],
    });

    socket.on(ClientEvents.sendMessage, msg => {
      console.log('msg:', msg);
      addMessage(sessionId, msg, Senders.me);

      setTimeout(() => {
        const serverMessage = `You just said: ${msg}`;
        socket.emit(BackendEvents.sendMessage, serverMessage);
        addMessage(sessionId, serverMessage, Senders.computer);
      }, 1000);
    });
  });
});

io.on('disconnect', () => {
  console.log('user disconnected');
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
