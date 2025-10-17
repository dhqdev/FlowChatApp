import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Menu from './Menu';

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

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchResultsOpacity] = useState(new Animated.Value(0));

  // Menu lateral
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuSlideAnim] = useState(new Animated.Value(-300)); // Menu começa fora da tela
  const [conversations, setConversations] = useState([]); // conversas recentes (usernames)

  // Registration mode
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Load conversations from storage when logged in
  useEffect(() => {
    if (isLoggedIn && username) {
      const loadConversations = async () => {
        try {
          const stored = await AsyncStorage.getItem(`conversations_${username}`);
          if (stored) {
            setConversations(JSON.parse(stored));
          }
        } catch (error) {
          console.error('Erro ao carregar conversas:', error);
        }
      };
      loadConversations();
    }
  }, [isLoggedIn, username]);

  // Save conversations to storage whenever they change
  useEffect(() => {
    if (isLoggedIn && username) {
      AsyncStorage.setItem(`conversations_${username}`, JSON.stringify(conversations)).catch(console.error);
    }
  }, [conversations, isLoggedIn, username]);

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

      // Se for conversa privada, garantir que ela esteja nas conversas recentes
      if (currentConversation) {
        setConversations((prev) => (prev.includes(currentConversation) ? prev : [currentConversation, ...prev]));
      }
    }
  };

  const backToGlobalChat = async () => {
    setCurrentConversation(null);
    // loadMessages será chamado automaticamente pelo useEffect
  };

  const handleLogout = () => {
    if (ws.current) ws.current.close();
    // Clear conversations from storage
    AsyncStorage.removeItem(`conversations_${username}`).catch(console.error);
    setIsLoggedIn(false);
    setUsername('');
    setMessages([]);
    setCurrentConversation(null);
    setConversations([]);
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

  const handleSearchInput = (text) => {
    setSearchQuery(text);
    handleSearch(text);
    
    // Animar resultados
    if (text.length >= 2 && searchResults.length > 0) {
      Animated.timing(searchResultsOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(searchResultsOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  // Funções do menu lateral
  const toggleMenu = () => {
    // fechar teclado ao abrir/fechar menu para evitar que o teclado fique por cima
    Keyboard.dismiss();
    if (isMenuOpen) {
      // Clearing search when closing menu
      setSearchQuery('');
      setSearchResults([]);
      setIsSearchActive(false);
    }
    const toValue = isMenuOpen ? -300 : 0;
    setIsMenuOpen(!isMenuOpen);

    Animated.timing(menuSlideAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
      Animated.timing(menuSlideAnim, {
        toValue: -300,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  // Inicia (ou foca) uma conversa privada. Adiciona à lista de conversas se não existir
  const startConversation = (user) => {
    setCurrentConversation(user);
    setConversations((prev) => (prev.includes(user) ? prev : [user, ...prev]));
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
            <Text style={styles.title}>{isRegisterMode ? 'Registrar' : 'FlowChat'}</Text>
            
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
              onPress={isRegisterMode ? handleRegister : handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Carregando...' : (isRegisterMode ? 'Registrar' : 'Login')}
              </Text>
            </TouchableOpacity>

            {isRegisterMode ? (
              <TouchableOpacity onPress={() => setIsRegisterMode(false)}>
                <Text style={styles.switchText}>Já tem conta? Login</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setIsRegisterMode(true)}>
                <Text style={styles.switchText}>Não tem conta? Registrar</Text>
              </TouchableOpacity>
            )}
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
        
        {/* Menu Lateral */}
        <Menu
          isMenuOpen={isMenuOpen}
          menuSlideAnim={menuSlideAnim}
          conversations={conversations}
          currentConversation={currentConversation}
          username={username}
          searchQuery={searchQuery}
          searchResults={searchResults}
          isSearchActive={isSearchActive}
          searchResultsOpacity={searchResultsOpacity}
          toggleMenu={toggleMenu}
          closeMenu={closeMenu}
          startConversation={startConversation}
          handleSearch={handleSearch}
          handleSearchInput={handleSearchInput}
          setIsProfileModalVisible={setIsProfileModalVisible}
          handleLogout={handleLogout}
          setIsSearchActive={setIsSearchActive}
          setSearchResults={setSearchResults}
          setSearchQuery={setSearchQuery}
          setCurrentConversation={setCurrentConversation}
        />

        {/* Overlay quando menu está aberto */}
        {isMenuOpen && (
          <TouchableOpacity 
            style={styles.menuOverlay}
            activeOpacity={1}
            onPress={closeMenu}
          />
        )}

        {/* Área Principal - Conversa */}
        <View style={styles.mainContent}>
          {/* Header com barrinha animada */}
          <View style={styles.mainHeader}>
            <TouchableOpacity 
              style={styles.menuToggleButton}
              onPress={toggleMenu}
            >
              <Animated.View style={[
                styles.menuToggleBar,
                {
                  transform: [{
                    rotate: menuSlideAnim.interpolate({
                      inputRange: [-300, 0],
                      outputRange: ['0deg', '45deg']
                    })
                  }]
                }
              ]} />
              <Animated.View style={[
                styles.menuToggleBar,
                {
                  transform: [{
                    rotate: menuSlideAnim.interpolate({
                      inputRange: [-300, 0],
                      outputRange: ['0deg', '-45deg']
                    })
                  }]
                }
              ]} />
            </TouchableOpacity>

            <Text style={styles.mainConversationTitle}>
              {currentConversation ? `Conversa com ${currentConversation}` : 'Chat Global'}
            </Text>

            {currentConversation && (
              <TouchableOpacity onPress={backToGlobalChat} style={styles.mainBackButton}>
                <Text style={styles.mainBackButtonText}>←</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Área da Conversa */}
          <KeyboardAvoidingView 
            style={styles.conversationContainer} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
          >
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.chatMessagesContainer}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((message) => (
                <AnimatedMessage key={message.id} message={message} />
              ))}
            </ScrollView>

            {/* Barra de Input */}
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
        </View>

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
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  // Menu Lateral
  sideMenu: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 300,
    backgroundColor: '#1e1e1e',
    zIndex: 1000,
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeMenuButton: {
    padding: 5,
  },
  closeMenuText: {
    color: '#999',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuProfile: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuAvatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuProfileInfo: {
    flex: 1,
  },
  menuUsername: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuStatus: {
    color: '#1E90FF',
    fontSize: 14,
  },
  menuSearchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuSearchInput: {
    flex: 1,
    height: 36,
    backgroundColor: '#222',
    borderWidth: 0,
    borderColor: 'transparent',
    color: 'white',
    fontSize: 15,
  },
  menuSearchInputActive: {
    borderColor: '#1E90FF',
    borderWidth: 1.5,
  },
  menuClearSearchButton: {
    marginLeft: 10,
    padding: 6,
  },
  menuClearSearchText: {
    color: '#999',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuSearchResults: {
    marginTop: 10,
    maxHeight: 150,
  },
  menuSearchResultsList: {
    maxHeight: 150,
  },
  menuSearchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuResultAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuResultAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  menuResultUsername: {
    color: 'white',
    fontSize: 16,
  },
  menuStartChatText: {
    color: '#1E90FF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 'auto',
  },
  menuConversations: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  menuConversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  menuSectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  menuConversationActive: {
    backgroundColor: '#1E90FF',
  },
  menuConversationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuConversationIconText: {
    fontSize: 20,
  },
  menuConversationText: {
    color: 'white',
    fontSize: 16,
  },
  menuFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
    backgroundColor: 'transparent',
  menuUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  menuUserAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuUserAvatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  menuUserInfo: {
    marginLeft: 12,
    flex: 1,
  },
  menuUserName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuUserSub: {
    color: '#999',
    fontSize: 12,
  },
  menuSmallLogout: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  menuSmallLogoutText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  menuProfileSmall: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  menuBrand: {
    color: '#1E90FF',
    fontSize: 22,
    fontWeight: '700',
  },
  menuStatusSmall: {
    color: '#8bd0ff',
    fontSize: 12,
  },
  },
  menuUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#141414',
  },
  menuUserAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuUserAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuUserInfo: {
    flex: 1,
  },
  menuUserName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuUserSub: {
    color: '#999',
    fontSize: 12,
  },
  menuSmallLogout: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  menuSmallLogoutText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },
  // Área Principal
  mainContent: {
    flex: 1,
  },
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#1e1e1e',
  },
  menuToggleButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuToggleBar: {
    width: 20,
    height: 2,
    backgroundColor: '#1E90FF',
    marginVertical: 2,
  },
  mainConversationTitle: {
    color: '#1E90FF',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  mainBackButton: {
    padding: 5,
  },
  mainBackButtonText: {
    color: '#1E90FF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  conversationContainer: {
    flex: 1,
  },
  chatMessagesContainer: {
    flexGrow: 1,
    paddingHorizontal: 15,
    paddingTop: 15,
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
  switchText: {
    color: '#1E90FF',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
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
    paddingHorizontal: 15,
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
    zIndex: 2000, // Z-index alto para ficar acima do menu
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 25,
    paddingTop: 10,
  },
  largeAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  largeAvatarText: {
    color: 'white',
    fontSize: 40,
    fontWeight: 'bold',
  },
  profileUsername: {
    color: 'white',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  profileSubtitle: {
    color: '#1E90FF',
    fontSize: 18,
  },
  profileOptions: {
    marginBottom: 25,
  },
  optionButton: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 5,
  },
  optionText: {
    color: 'white',
    fontSize: 18,
  },
  logoutOption: {
    borderBottomWidth: 0,
    marginTop: 10,
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
});