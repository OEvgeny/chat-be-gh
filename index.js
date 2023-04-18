const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuid4 } = require('uuid');

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
      addMessage(sessionId, 'Welcome to the chat!', Senders.computer);
    }

    socket.emit(BackendEvents.sessionInfo, {
      session_id: sessionId,
      is_new_session: isNewSession,
      messages: sessionStorage[sessionId],
    });

    socket.onAny((event, ...args) => {
      console.log('event:', event, args);
    });

    socket.on(ClientEvents.sendMessage, msg => {
      console.log('msg:', msg);
      addMessage(sessionId, msg, Senders.me);

      setTimeout(() => {
        const serverMessage = `
We have experience in creating chatbots for various purposes. Here are some projects we've worked on:
- Office Bot: A Slack-integrated AI bot for tracking, scheduling, and reporting tasks completed by employees. It also handles FAQs, vacations, and sick leave notifications. Technologies used: Node.js, Express.js, MongoDB, and Slack API. [url: https://akvelon.com/case-study-office-bot/]
- Social Chat Bot: A chatbot that connects employees across the globe and encourages them to engage in the company's social media activities. It uses natural language processing and AI to suggest relevant news or posts. Technologies used: Microsoft Bot Framework, Azure Bot Service, LUIS, Text Analytics, and Python. [url: https://akvelon.com/case-study-social-chat-bot/]
- Uber Bot: A chatbot for requesting Uber rides without using the Uber app. It can be integrated with various messaging platforms like Telegram, Facebook Messenger, Slack, MS Teams, and more. Technologies used: Python, Node.js, TypeScript, MongoDB, Microsoft Bot Framework, and Azure. [url: https://akvelon.com/case-study-uber-bot/]  

These projects showcase our expertise in chatbot development and integration with various platforms. We can help you create a custom chatbot tailored to your website's needs. 😊
\`\`\`js
let x = 1;
x = 10;
\`\`\`

You just sent:
> ${msg}
        `.trim();
        // const serverMessage = `You just sent:\n${msg}`;
        const formattedText = formatMarkdownLinks(serverMessage);
        sendMessagePartByPart(socket, formattedText);
        addMessage(sessionId, formattedText, Senders.computer);
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

const sendMessagePartByPart = (socket, message) => {
  const id = uuid4();
  const messageParts = tokenizeWithSeparators(message, [' ', '-', ',', '.']);

  const sendPart = () => {
    const part = messageParts.shift();
    socket.emit(BackendEvents.sendMessage, {
      text: part,
      message_id: id,
      timestamp: Date.now().toString(),
      is_full_response: messageParts.length === 0,
    });

    if (messageParts.length) {
      setTimeout(sendPart, 100);
    }
  };
  sendPart();
};

function tokenizeWithSeparators(input, separators) {
  const sepRegex = new RegExp(`(${separators.map(sep => '\\' + sep).join('|')})`, 'g');
  return input.split(sepRegex).filter(token => token.length > 0);
}

function formatMarkdownLinks(input) {
  const urlRegex = /\[url: (https?:\/\/[^\]\s]+)\]/g;
  return input.replace(urlRegex, (match, url) => `[URL](${url})`);
}
