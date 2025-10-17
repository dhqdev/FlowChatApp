import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const WEBSOCKET_URL = 'ws://192.168.101.251:8080';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const ws = useRef(null);
  const scrollViewRef = useRef();

  useEffect(() => {
    ws.current = new WebSocket(WEBSOCKET_URL);

    ws.current.onopen = () => {
      console.log('Conexão WebSocket aberta!');
      setMessages([{ id: Math.random(), text: 'Conectado! Envie uma mensagem.', user: 'other' }]);
    };

    ws.current.onclose = (e) => console.log('Conexão WebSocket fechada.', e.code, e.reason);
    ws.current.onerror = (e) => console.error('Erro no WebSocket!', e.message || 'Um erro ocorreu.');

    ws.current.onmessage = (e) => {
      const receivedMessage = {
        id: Math.random(),
        text: `Eco: ${e.data}`,
        user: 'other',
      };
      setMessages(prevMessages => [...prevMessages, receivedMessage]);
    };

    return () => ws.current.close();
  }, []);

  const handleSendMessage = () => {
    if (inputText.trim().length > 0 && ws.current && ws.current.readyState === WebSocket.OPEN) {
      const newMessage = { id: Math.random(), text: inputText, user: 'me' };
      setMessages(prevMessages => [...prevMessages, newMessage]);
      ws.current.send(inputText);
      setInputText('');
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.chatContainer}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((message) => (
              <View 
                key={message.id} 
                style={[
                  styles.bubble,
                  message.user === 'me' ? styles.myBubble : styles.otherBubble
                ]}
              >
                <Text style={styles.bubbleText}>{message.text}</Text>
              </View>
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
              <Text style={styles.sendButtonText}>Enviar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
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
    backgroundColor: '#1E90FF',
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});