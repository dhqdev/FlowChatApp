// dhqdev/flowchatapp/chat-backend/server.js (Atualizado)

const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const port = 8080;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Novo cliente conectado!');

  ws.on('message', (messageAsString) => {
    // Agora esperamos uma string JSON, então vamos convertê-la de volta para um objeto
    const message = JSON.parse(messageAsString);
    console.log('Mensagem recebida:', message);

    // Reenviar a mensagem (o objeto completo) para todos os outros clientes
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        // Enviamos a string JSON para os outros clientes
        client.send(JSON.stringify(message));
      }
    });
  });

  ws.on('close', () => {
    console.log('Cliente desconectado.');
  });

  ws.on('error', (error) => {
    console.error('Erro no WebSocket:', error);
  });
});

server.listen(port, () => {
  console.log(`Servidor de Chat rodando na porta ${port}`);
});