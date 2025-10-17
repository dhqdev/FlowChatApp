import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'http://192.168.101.251:8080';
const WEBSOCKET_URL = 'ws://192.168.101.251:8080';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sendButtonScale] = useState(new Animated.Value(1));
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null); // null = chat global, string = username da conversa privada

  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);

  const ws = useRef(null);
  const scrollViewRef = useRef();

  // Recarregar mensagens quando a conversa atual muda
  useEffect(() => {
    if (isLoggedIn) {
      loadMessages();
    }
  }, [currentConversation, isLoggedIn, loadMessages]);

  // ============ AUTENTICAÇÃO ============

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Erro', 'Preencha username e password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Sucesso', 'Usuário registrado! Faça login agora.');
      } else {
        Alert.alert('Erro', data.error);
      }
    } catch (_error) {
      Alert.alert('Erro', 'Falha ao conectar com servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Erro', 'Preencha username e password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Carregar histórico de mensagens será feito pelo useEffect
        
        // Conectar ao WebSocket
        connectWebSocket();
        
        setIsLoggedIn(true);
        setPassword(''); // Limpar password por segurança
      } else {
        Alert.alert('Erro', data.error);
      }
    } catch (_error) {
      Alert.alert('Erro', 'Falha ao conectar com servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('user', username);
      if (currentConversation) {
        params.append('conversation', currentConversation);
      }
      
      const response = await fetch(`${API_URL}/messages?${params.toString()}`);
      const messages = await response.json();
      
      console.log('Mensagens carregadas:', messages); // Debug log
      
      // Garantir que messages é um array
      const messagesArray = Array.isArray(messages) ? messages : [];
      
      const formattedMessages = messagesArray.map((msg) => ({
        id: Math.random(),
        text: msg.text,
        user: msg.sender === username ? 'me' : 'other',
        animation: new Animated.Value(1), // Mensagens do histórico já aparecem sem animação
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      setMessages([]); // Garantir que messages é um array vazio em caso de erro
    }
  }, [username, currentConversation]);

  // ============ WEBSOCKET ============

  const connectWebSocket = () => {
    ws.current = new WebSocket(WEBSOCKET_URL);

    ws.current.onopen = () => {
      console.log('WebSocket conectado!');
      // Autenticar no WebSocket
      ws.current.send(JSON.stringify({ type: 'auth', username }));
    };

    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === 'message') {
        // Sempre adicionar mensagens enviadas pelo próprio usuário
        const isMessageFromMe = data.sender === username;
        
        // Para mensagens recebidas, verificar se são relevantes para a conversa atual
        const isGlobalMessage = !data.recipient;
        const isPrivateMessageForCurrentConversation = data.recipient && 
          ((data.sender === currentConversation && data.recipient === username) ||
           (data.sender === username && data.recipient === currentConversation));
        
        if (isMessageFromMe || isGlobalMessage || isPrivateMessageForCurrentConversation) {
          const newMessage = {
            id: Math.random(),
            text: data.text,
            user: data.sender === username ? 'me' : 'other',
            animation: new Animated.Value(0),
          };
          setMessages((prev) => [...prev, newMessage]);

          // Animar entrada da mensagem
          Animated.timing(newMessage.animation, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }
      }
    };

    ws.current.onerror = (error) => {
      console.error('Erro WebSocket:', error);
      Alert.alert('Erro', 'Erro de conexão com o servidor');
    };

    ws.current.onclose = () => {
      console.log('WebSocket desconectado');
    };
  };

  const handleSendMessage = () => {
    if (inputText.trim().length > 0 && ws.current?.readyState === WebSocket.OPEN) {
      // Animação do botão
      Animated.sequence([
        Animated.timing(sendButtonScale, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(sendButtonScale, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Enviar via WebSocket (a mensagem será adicionada quando voltar do servidor)
      ws.current.send(
        JSON.stringify({
          type: 'message',
          text: inputText,
          recipient: currentConversation, // null para chat global, username para conversa privada
        })
      );
      setInputText('');
    }
  };

  const backToGlobalChat = async () => {
    setCurrentConversation(null);
    // loadMessages será chamado automaticamente pelo useEffect
  };

  const handleLogout = () => {
    if (ws.current) ws.current.close();
    setIsLoggedIn(false);
    setUsername('');
    setMessages([]);
    setCurrentConversation(null);
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(query)}`);

      // Checar status e content-type antes de parsear
      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        const text = await response.text().catch(() => '<no body>');
        console.error(`Busca retornou status ${response.status}:`, text);
        setSearchResults([]);
        return;
      }

      if (!contentType.includes('application/json')) {
        const text = await response.text().catch(() => '<no body>');
        // Provavelmente HTML ou erro do Metro/Expo server; log para diagnosticar
        console.error('Resposta da busca não é JSON:', text);
        setSearchResults([]);
        return;
      }

      const results = await response.json();
      // Filtrar o próprio usuário dos resultados
      setSearchResults(results.filter(user => user.username !== username));
    } catch (error) {
      console.error('Erro na busca:', error);
      setSearchResults([]);
    }
  };

  const startConversation = async (targetUser) => {
    setCurrentConversation(targetUser);
    setSearchQuery('');
    setSearchResults([]);
    
    // Recarregar mensagens será feito pelo useEffect
    
    Alert.alert('Conversa iniciada', `Conversando com ${targetUser}`);
  };

  // Componente para mensagem animada
  const AnimatedMessage = ({ message }) => {
    const translateY = message.animation.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 0],
    });

    const opacity = message.animation;
    const scale = message.animation.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.8, 1.05, 1],
    });

    // Efeito especial para mensagens positivas
    const isSpecial = /parabéns|feliz|ótimo|incrível|show/i.test(message.text);
    const glowColor = isSpecial ? '#FFD700' : 'transparent';

    return (
      <Animated.View
        style={[
          styles.bubble,
          message.user === 'me' ? styles.myBubble : styles.otherBubble,
          {
            opacity,
            transform: [{ translateY }, { scale }],
            shadowColor: glowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isSpecial ? 0.8 : 0,
            shadowRadius: 10,
            elevation: isSpecial ? 10 : 0,
          },
        ]}
      >
        <Text style={styles.bubbleText}>{message.text}</Text>
        {isSpecial && (
          <Animated.Text style={[styles.sparkle, { opacity }]}>✨</Animated.Text>
        )}
      </Animated.View>
    );
  };

  // ============ UI: TELA DE LOGIN ============

  if (!isLoggedIn) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar style="light" translucent backgroundColor="transparent" />
          <View style={styles.loginContainer}>
            <Text style={styles.title}>FlowChat</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity 
              style={styles.button} 
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Carregando...' : 'Login'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.registerButton]} 
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Carregando...' : 'Registrar'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // ============ UI: CHAT ============

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        
        <View style={styles.header}>
          <View style={styles.conversationInfo}>
            {currentConversation ? (
              <TouchableOpacity onPress={backToGlobalChat} style={styles.backButton}>
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={styles.conversationTitle}>
              {currentConversation ? `Conversa com ${currentConversation}` : 'Chat Global'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={() => setIsSearchModalVisible(true)}
            >
              <Text style={styles.searchButtonText}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => setIsProfileModalVisible(true)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {username.charAt(0).toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutButtonText}>Sair</Text>
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.chatContainer}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((message) => (
              <AnimatedMessage key={message.id} message={message} />
            ))}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Digite sua ideia..."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
              <Animated.Text 
                style={[
                  styles.sendButtonText,
                  { transform: [{ scale: sendButtonScale }] }
                ]}
              >
                Enviar
              </Animated.Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Modal de Perfil */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isProfileModalVisible}
          onRequestClose={() => setIsProfileModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.profileHeader}>
                <View style={styles.largeAvatar}>
                  <Text style={styles.largeAvatarText}>
                    {username.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.profileUsername}>{username}</Text>
                <Text style={styles.profileSubtitle}>Online</Text>
              </View>

              <View style={styles.profileOptions}>
                <TouchableOpacity style={styles.optionButton}>
                  <Text style={styles.optionText}>Configurações</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.optionButton}>
                  <Text style={styles.optionText}>Tema</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.optionButton}>
                  <Text style={styles.optionText}>Notificações</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.optionButton, styles.logoutOption]}
                  onPress={() => {
                    setIsProfileModalVisible(false);
                    handleLogout();
                  }}
                >
                  <Text style={styles.logoutText}>Sair da conta</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setIsProfileModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal de Busca */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isSearchModalVisible}
          onRequestClose={() => setIsSearchModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.searchModalContent}>
              <Text style={styles.searchModalTitle}>Buscar Usuários</Text>
              
              <TextInput
                style={styles.searchModalInput}
                placeholder="Digite o nome do usuário..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  handleSearch(text);
                }}
                autoFocus={true}
              />
              
              <ScrollView style={styles.searchResultsContainer}>
                {searchResults.map((user) => (
                  <TouchableOpacity
                    key={user.username}
                    style={styles.searchResultItem}
                    onPress={() => {
                      startConversation(user.username);
                      setIsSearchModalVisible(false);
                    }}
                  >
                    <View style={styles.resultAvatar}>
                      <Text style={styles.resultAvatarText}>
                        {user.username.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.resultUsername}>{user.username}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setIsSearchModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E90FF',
    marginBottom: 40,
    textAlign: 'center',
  },
  input: {
    height: 50,
    backgroundColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 15,
    color: 'white',
    marginBottom: 15,
  },
  button: {
    height: 50,
    backgroundColor: '#0d39ffff',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  registerButton: {
    backgroundColor: '#444',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  logoutButtonText: {
    color: '#1E90FF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  resultAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultUsername: {
    color: 'white',
    fontSize: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conversationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 10,
    padding: 5,
  },
  backButtonText: {
    color: '#1E90FF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  conversationTitle: {
    color: '#1E90FF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchButton: {
    marginRight: 10,
    padding: 8,
  },
  searchButtonText: {
    fontSize: 18,
  },
  profileButton: {
    alignItems: 'center',
    marginRight: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chatContainer: {
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  bubble: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
    maxWidth: '70%',
    marginBottom: 10,
  },
  myBubble: {
    backgroundColor: '#1E90FF',
    alignSelf: 'flex-end',
  },
  otherBubble: {
    backgroundColor: '#333333',
    alignSelf: 'flex-start',
  },
  bubbleText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  sparkle: {
    position: 'absolute',
    top: -5,
    right: -5,
    fontSize: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#1e1e1e',
  },
  textInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 15,
    color: 'white',
    marginRight: 10,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#246d07ff',
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  // Modal de Perfil
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 400,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  largeAvatarText: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
  },
  profileUsername: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  profileSubtitle: {
    color: '#1E90FF',
    fontSize: 16,
  },
  profileOptions: {
    marginBottom: 20,
  },
  optionButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  optionText: {
    color: 'white',
    fontSize: 16,
  },
  logoutOption: {
    borderBottomWidth: 0,
    marginTop: 10,
  },
  logoutText: {
    color: '#FF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#333',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal de Busca
  searchModalContent: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 500,
  },
  searchModalTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  searchModalInput: {
    height: 50,
    backgroundColor: '#333',
    borderRadius: 25,
    paddingHorizontal: 20,
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
  },
  searchResultsContainer: {
    maxHeight: 300,
    marginBottom: 20,
  },
});