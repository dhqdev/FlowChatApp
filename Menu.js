import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const Menu = ({
  isMenuOpen,
  menuSlideAnim,
  conversations,
  currentConversation,
  username,
  searchQuery,
  searchResults,
  isSearchActive,
  searchResultsOpacity,
  toggleMenu,
  closeMenu,
  startConversation,
  handleSearch,
  handleSearchInput,
  setIsProfileModalVisible,
  handleLogout,
  setIsSearchActive,
  setSearchResults,
  setSearchQuery,
  setCurrentConversation,
  onNavigateToHome, // Nova prop
}) => {
  const [avatarPressed, setAvatarPressed] = useState(false);
  return (
    <Animated.View style={[styles.sideMenu, { transform: [{ translateX: menuSlideAnim }] }]}>
      <View style={styles.menuHeader}>
        <View style={styles.menuHeaderContent}>
          <Text style={styles.menuBrandTitle}>FlowChat</Text>
          <Text style={styles.menuBrandSubtitle}>Suas conversas</Text>
        </View>
        <TouchableOpacity onPress={closeMenu} style={styles.closeMenuButton}>
          <Ionicons name="close" size={24} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Barra de Pesquisa */}
      <View style={styles.menuSearchContainer}>
        <View style={styles.menuSearchBar}>
          <TextInput
            style={[
              styles.menuSearchInput,
              isSearchActive && styles.menuSearchInputActive
            ]}
            placeholder="Buscar usuários..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearchInput}
            onFocus={() => setIsSearchActive(true)}
            onBlur={() => {
              if (!searchQuery.trim()) {
                setIsSearchActive(false);
                setSearchResults([]);
                Animated.timing(searchResultsOpacity, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                }).start();
              }
            }}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.menuClearSearchButton}
              onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
                Animated.timing(searchResultsOpacity, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                }).start();
              }}
            >
              <Text style={styles.menuClearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Resultados da Busca no Menu */}
        {isSearchActive && searchResults.length > 0 && (
          <Animated.View style={[styles.menuSearchResults, { opacity: searchResultsOpacity }]}>
            <ScrollView
              style={styles.menuSearchResultsList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {searchResults.map((user) => (
                <TouchableOpacity
                  key={user.username}
                  style={styles.menuSearchResultItem}
                  onPress={() => {
                    startConversation(user.username);
                    toggleMenu();
                    Alert.alert('Conversa iniciada', `Conversando com ${user.username}`);
                  }}
                >
                  <View style={styles.menuResultAvatar}>
                    <Text style={styles.menuResultAvatarText}>
                      {user.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.menuResultUsername}>{user.username}</Text>
                  <Text style={styles.menuStartChatText}>Conversar</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}
      </View>

      {/* Conversas */}
      <View style={styles.menuConversations}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Botão Home */}
          {onNavigateToHome && (
            <TouchableOpacity
              style={styles.menuConversationItem}
              onPress={() => {
                onNavigateToHome();
                closeMenu();
              }}
            >
              <View style={styles.menuConversationIcon}>
                <Text style={styles.menuConversationIconText}>🏠</Text>
              </View>
              <Text style={styles.menuConversationText}>Home</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.menuConversationItem,
              !currentConversation && styles.menuConversationActive
            ]}
            onPress={() => {
              if (startConversation) {
                startConversation(null); // null = chat global
              }
              setCurrentConversation(null);
              closeMenu();
            }}
          >
            <View style={styles.menuConversationIcon}>
              <Text style={styles.menuConversationIconText}>🌐</Text>
            </View>
            <Text style={styles.menuConversationText}>Chat Global</Text>
          </TouchableOpacity>

          {/* Conversas privadas recentes (dinâmicas) */}
          {conversations.map((user) => (
            <TouchableOpacity
              key={user}
              style={[
                styles.menuConversationItem,
                currentConversation === user && styles.menuConversationActive
              ]}
              onPress={() => {
                if (startConversation) {
                  startConversation(user);
                }
                setCurrentConversation(user);
                closeMenu();
              }}
            >
              <View style={styles.menuConversationIcon}>
                <Text style={styles.menuConversationIconText}>{user.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.menuConversationText}>{user}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Botão de Logout */}
      <View style={styles.menuFooter}>
        {/* Cartão compacto do usuário no rodapé */}
        <TouchableOpacity
          style={styles.menuUserCard}
          onPress={() => {
            // abrir perfil (modal)
            setIsProfileModalVisible(true);
            closeMenu();
          }}
          onPressIn={() => setAvatarPressed(true)}
          onPressOut={() => setAvatarPressed(false)}
        >
          <View style={[styles.menuUserAvatar, { backgroundColor: avatarPressed ? '#0000FF' : '#1E90FF' }]}>
            <Text style={styles.menuUserAvatarText}>{username.charAt(0).toUpperCase()}</Text>
          </View>
                        <View style={styles.menuUserInfo}>
                <Text style={styles.menuUserName} numberOfLines={1} ellipsizeMode="tail">{username}</Text>
                <Text style={styles.menuUserSub}>Ver perfil</Text>
              </View>
          <TouchableOpacity
            style={styles.menuSmallLogout}
            onPress={() => {
              closeMenu();
              handleLogout();
            }}
          >
            <Text style={styles.menuSmallLogoutText}>Sair</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Menu Lateral
  sideMenu: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 300,
    backgroundColor: '#1a1a1a',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  menuHeaderContent: {
    flex: 1,
  },
  menuBrandTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E90FF',
    marginBottom: 2,
  },
  menuBrandSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  closeMenuButton: {
    padding: 5,
    marginLeft: 'auto',
  },
  closeMenuText: {
    color: '#999',
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuSearchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#141414',
  },
  menuSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuSearchInput: {
    flex: 1,
    height: 38,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    color: 'white',
    fontSize: 14,
    paddingHorizontal: 15,
  },
  menuSearchInputActive: {
    borderColor: '#1E90FF',
    backgroundColor: '#1e2530',
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
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuConversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  menuConversationActive: {
    backgroundColor: '#1E90FF',
  },
  menuConversationIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuConversationIconText: {
    fontSize: 20,
  },
  menuConversationText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
  },
  menuFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#141414',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  menuUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
  },
  menuUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#1E90FF',
  },
  menuUserAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuUserInfo: {
    flex: 1,
  },
  menuUserName: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  menuUserSub: {
    color: '#4ECDC4',
    fontSize: 11,
  },
  menuSmallLogout: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  menuSmallLogoutText: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: 'bold',
  },
});

export default Menu;