# FlowChat App �💬

Um aplicativo de chat em tempo real desenvolvido com React Native (Expo) e Node.js, oferecendo mensagens globais e conversas privadas.

## 🚀 Funcionalidades

- **Autenticação**: Registro e login de usuários
- **Chat Global**: Mensagens em tempo real para todos os usuários
- **Conversas Privadas**: Mensagens 1-para-1 entre usuários específicos
- **Busca de Usuários**: Encontre outros usuários para iniciar conversas
- **Interface Moderna**: UI responsiva com animações suaves
- **Perfil de Usuário**: Modal de perfil com configurações

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React Native** com **Expo**
- **WebSocket** para mensagens em tempo real
- **AsyncStorage** para persistência local
- **React Navigation** para navegação

### Backend
- **Node.js** com **Express**
- **SQLite** para banco de dados
- **WebSocket** (ws) para comunicação em tempo real
- **bcryptjs** para hash de senhas
- **CORS** para requisições cross-origin

## 📦 Instalação e Execução

### Pré-requisitos
- Node.js (versão 16 ou superior)
- npm ou yarn
- Expo CLI
- Dispositivo físico ou emulador para testar

### Backend

```bash
cd chat-backend
npm install
npm start
# ou
node server.js
```

O servidor será executado na porta 8080.

### Frontend

```bash
npm install
npx expo start
```

Escaneie o QR code com o app Expo Go no seu dispositivo.

## 🗄️ Estrutura do Banco de Dados

### Tabela `users`
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela `messages`
```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender TEXT NOT NULL,
  recipient TEXT, -- NULL para mensagens globais
  text TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Scripts Disponíveis

### Backend
- `npm start` ou `node server.js` - Inicia o servidor

### Frontend
- `npx expo start` - Inicia o servidor de desenvolvimento Expo
- `npx expo run:android` - Build para Android
- `npx expo run:ios` - Build para iOS

## 🌐 API Endpoints

### Autenticação
- `POST /register` - Registrar novo usuário
- `POST /login` - Fazer login

### Mensagens
- `GET /messages?user=<username>&conversation=<recipient>` - Buscar mensagens
- `GET /users/search?q=<query>` - Buscar usuários

### WebSocket
- Conecta em `ws://localhost:8080`
- Eventos: `auth`, `message`

## 📱 Como Usar

1. **Registro**: Crie uma conta com username e senha
2. **Login**: Faça login na sua conta
3. **Chat Global**: Envie mensagens que todos podem ver
4. **Conversas Privadas**:
   - Clique no ícone 🔍 para buscar usuários
   - Selecione um usuário para iniciar conversa privada
   - Mensagens privadas aparecem apenas para vocês dois
5. **Perfil**: Clique no avatar para acessar configurações

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👨‍💻 Autor

**Seu Nome** - [Seu GitHub](https://github.com/seu-usuario)

---

⭐ Se este projeto foi útil para você, dê uma estrela!
