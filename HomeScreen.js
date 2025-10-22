import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    Animated,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const API_URL = 'http://192.168.101.251:8080';

const HomeScreen = ({ username, onNavigateToChat, onOpenMenu, conversations, onStartConversation }) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeConversations: 0,
    unreadMessages: 0,
    onlineUsers: [],
  });

  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    // Animação de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Carregar estatísticas apenas uma vez
    loadStats();
    
    // REMOVIDO: setInterval que causava reload constante
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStats = async () => {
    try {
      // Buscar todos os usuários para calcular estatísticas
      const response = await fetch(`${API_URL}/users/search?q=`);
      const users = await response.json();
      
      setStats({
        totalUsers: users.length || 0,
        activeConversations: conversations.length,
        unreadMessages: Math.floor(Math.random() * 5), // Placeholder - implementar lógica real depois
        onlineUsers: users.slice(0, 5), // Top 5 usuários
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const StatCard = ({ icon, title, value, color, delay = 0 }) => {
    const [cardAnim] = useState(new Animated.Value(0));

    useEffect(() => {
      Animated.spring(cardAnim, {
        toValue: 1,
        delay,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <Animated.View
        style={[
          styles.statCard,
          {
            transform: [
              {
                scale: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
            opacity: cardAnim,
          },
        ]}
      >
        <View style={[styles.statIconContainer, { backgroundColor: color }]}>
          <Ionicons name={icon} size={28} color="white" />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </View>
      </Animated.View>
    );
  };

  const ConversationItem = ({ user, index }) => {
    const [itemAnim] = useState(new Animated.Value(0));

    useEffect(() => {
      Animated.spring(itemAnim, {
        toValue: 1,
        delay: index * 100,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <Animated.View
        style={[
          styles.conversationItem,
          {
            transform: [
              {
                translateX: itemAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0],
                }),
              },
            ],
            opacity: itemAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.conversationContent}
          onPress={() => onStartConversation(user)}
        >
          <View style={styles.conversationAvatar}>
            <Text style={styles.conversationAvatarText}>
              {user.charAt(0).toUpperCase()}
            </Text>
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.conversationInfo}>
            <Text style={styles.conversationName}>{user}</Text>
            <Text style={styles.conversationPreview}>Toque para conversar</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const OnlineUserItem = ({ user, index }) => {
    const [itemAnim] = useState(new Animated.Value(0));

    useEffect(() => {
      Animated.spring(itemAnim, {
        toValue: 1,
        delay: index * 80,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <Animated.View
        style={[
          styles.onlineUserItem,
          {
            transform: [{ scale: itemAnim }],
            opacity: itemAnim,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => onStartConversation(user.username)}
          style={styles.onlineUserButton}
        >
          <View style={styles.onlineUserAvatar}>
            <Text style={styles.onlineUserAvatarText}>
              {user.username.charAt(0).toUpperCase()}
            </Text>
            <View style={styles.onlineIndicator} />
          </View>
          <Text style={styles.onlineUserName} numberOfLines={1}>
            {user.username}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header - Sem título, mais limpo */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onOpenMenu} style={styles.menuButton}>
          <Ionicons name="menu" size={28} color="#1E90FF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerGreeting}>Olá, {username}! 👋</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.statusDot} />
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Estatísticas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Visão Geral</Text>
            <View style={styles.statsGrid}>
              <StatCard
                icon="people"
                title="Usuários"
                value={stats.totalUsers}
                color="#1E90FF"
                delay={0}
              />
              <StatCard
                icon="chatbubbles"
                title="Conversas"
                value={stats.activeConversations}
                color="#4ECDC4"
                delay={100}
              />
              <StatCard
                icon="mail-unread"
                title="Não Lidas"
                value={stats.unreadMessages}
                color="#FF6B6B"
                delay={200}
              />
              <StatCard
                icon="flash"
                title="Ativas"
                value={conversations.length}
                color="#FFE66D"
                delay={300}
              />
            </View>
          </View>

          {/* Usuários Online */}
          {stats.onlineUsers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👥 Usuários Online</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.onlineUsersList}
              >
                {stats.onlineUsers.map((user, index) => (
                  <OnlineUserItem key={user.username} user={user} index={index} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Conversas Recentes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>💬 Conversas Recentes</Text>
              {conversations.length > 0 && (
                <TouchableOpacity onPress={onOpenMenu}>
                  <Text style={styles.seeAllText}>Ver todas</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {conversations.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={60} color="#333" />
                <Text style={styles.emptyStateTitle}>Nenhuma conversa ainda</Text>
                <Text style={styles.emptyStateText}>
                  Comece uma nova conversa com alguém!
                </Text>
              </View>
            ) : (
              <View style={styles.conversationsList}>
                {conversations.slice(0, 5).map((user, index) => (
                  <ConversationItem key={user} user={user} index={index} />
                ))}
              </View>
            )}
          </View>

          {/* Botão de Chat Global */}
          <TouchableOpacity
            style={styles.globalChatButton}
            onPress={() => onNavigateToChat(null)}
          >
            <View style={styles.globalChatIcon}>
              <Ionicons name="globe" size={24} color="white" />
            </View>
            <View style={styles.globalChatInfo}>
              <Text style={styles.globalChatTitle}>Chat Global</Text>
              <Text style={styles.globalChatSubtitle}>
                Converse com todos os usuários
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color="#1E90FF" />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: 10, // Reduzido para não ficar muito para baixo
    backgroundColor: '#1e1e1e',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuButton: {
    padding: 5,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerGreeting: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  headerRight: {
    width: 38,
    alignItems: 'flex-end',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ECDC4',
    borderWidth: 2,
    borderColor: '#1e1e1e',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#1E90FF',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -4,
  },
  statCard: {
    width: (width - 48) / 2, // Ajustado para novo padding
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  statTitle: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  onlineUsersList: {
    paddingRight: 20,
  },
  onlineUserItem: {
    marginRight: 15,
    alignItems: 'center',
  },
  onlineUserButton: {
    alignItems: 'center',
  },
  onlineUserAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#4ECDC4',
    position: 'relative',
  },
  onlineUserAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4ECDC4',
    borderWidth: 2,
    borderColor: '#121212',
  },
  onlineUserName: {
    marginTop: 8,
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
    maxWidth: 60,
    textAlign: 'center',
  },
  conversationsList: {
    backgroundColor: '#1e1e1e',
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  conversationItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  conversationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    position: 'relative',
  },
  conversationAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ECDC4',
    borderWidth: 2,
    borderColor: '#1e1e1e',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  conversationPreview: {
    fontSize: 13,
    color: '#999',
  },
  emptyState: {
    backgroundColor: '#1e1e1e',
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  globalChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1E90FF',
  },
  globalChatIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  globalChatInfo: {
    flex: 1,
  },
  globalChatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  globalChatSubtitle: {
    fontSize: 12,
    color: '#999',
  },
});

export default HomeScreen;
