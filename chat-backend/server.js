// dhqdev/flowchatapp/chat-backend/server.js (Atualizado)

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./database');

const port = 8080;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Rotas de autenticação
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username e password são obrigatórios' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return res.status(400).json({ error: 'Username já existe' });
        }
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      res.status(201).json({ message: 'Usuário registrado com sucesso' });
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username e password são obrigatórios' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    res.json({ message: 'Login bem-sucedido' });
  });
});

app.get('/messages', (req, res) => {
  const { conversation, user } = req.query;
  
  console.log('Parâmetros recebidos:', { conversation, user });
  
  let query = 'SELECT sender, recipient, text FROM messages WHERE ';
  let params = [];
  
  if (conversation) {
    // Conversa privada: mensagens entre o usuário logado e o destinatário
    query += '(sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?)';
    params = [user, conversation, conversation, user];
  } else {
    // Chat global: mensagens sem destinatário
    query += 'recipient IS NULL';
  }
  
  query += ' ORDER BY timestamp ASC';
  
  console.log('Query:', query, 'Params:', params);
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Erro na query:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    console.log('Resultados da query:', rows);
    res.json(rows || []); // Garantir que sempre retorna um array
  });
});

app.get('/users/search', (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.json([]);
  }

  db.all('SELECT username FROM users WHERE username LIKE ? LIMIT 10', [`%${q}%`], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    res.json(rows);
  });
});

wss.on('connection', (ws) => {
  console.log('Novo cliente conectado!');

  ws.on('message', (messageAsString) => {
    // Agora esperamos uma string JSON, então vamos convertê-la de volta para um objeto
    const message = JSON.parse(messageAsString);
    console.log('Mensagem recebida:', message);

    if (message.type === 'auth') {
      // Autenticação do usuário
      ws.username = message.username;
      console.log(`Usuário ${message.username} autenticado`);
      return;
    }

    if (message.type === 'message') {
      console.log('Salvando mensagem:', { sender: ws.username, recipient: message.recipient, text: message.text });
      
      // Salvar mensagem no banco
      db.run('INSERT INTO messages (sender, recipient, text) VALUES (?, ?, ?)', 
        [ws.username, message.recipient || null, message.text], function(err) {
        if (err) {
          console.error('Erro ao salvar mensagem:', err);
          return;
        }
        console.log('Mensagem salva com sucesso, ID:', this.lastID);
      });

      // Preparar mensagem com sender e recipient para reenviar
      const messageWithMeta = {
        type: 'message',
        text: message.text,
        sender: ws.username,
        recipient: message.recipient,
      };

      console.log('Enviando mensagem para:', message.recipient ? 'conversa privada' : 'chat global');

      // Se é conversa privada, enviar apenas para o destinatário
      if (message.recipient) {
        wss.clients.forEach((client) => {
          if (client.username === message.recipient || client.username === ws.username) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(messageWithMeta));
            }
          }
        });
      } else {
        // Chat global: enviar para todos, incluindo o próprio usuário
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(messageWithMeta));
          }
        });
      }
    }
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