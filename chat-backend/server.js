// dhqdev/flowchatapp/chat-backend/server.js

const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const port = 8080;

// 1. Criar o servidor HTTP com Express
const app = express();
const server = http.createServer(app);

// 2. Criar o servidor WebSocket e anexá-lo ao servidor HTTP
const wss = new WebSocket.Server({ server });

// 3. Lógica do WebSocket
wss.on('connection', (ws) => {
  console.log('Novo cliente conectado!');

  // Evento disparado quando uma mensagem é recebida de um cliente
  ws.on('message', (message) => {
    console.log(`Mensagem recebida: ${message}`);

    // Reenviar a mensagem para TODOS os clientes conectados
    wss.clients.forEach((client) => {
      // Verificar se o cliente ainda está conectado
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(String(message)); // Convertemos para String para garantir
      }
    });
  });

  // Evento disparado quando um cliente se desconecta
  ws.on('close', () => {
    console.log('Cliente desconectado.');
  });

  // Evento para lidar com erros
  ws.on('error', (error) => {
    console.error('Erro no WebSocket:', error);
  });
});

// 4. Iniciar o servidor
server.listen(port, () => {
  console.log(`Servidor de Chat rodando na porta ${port}`);
});