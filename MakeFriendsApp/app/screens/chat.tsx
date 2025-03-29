import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  SafeAreaView, 
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from './(protected)/config.json';
import { apiFetch } from './(protected)/_authHelper';

const BACKEND_URL = config.url;

type ChatItem = {
  id: string;
  name: string;
  lastMessage: string;
  unread: boolean;
  blocked: boolean;
};

const ChatScreen = () => {
  const router = useRouter();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'blocked'>('all');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const getLastMessageForChat = async (chat: ChatItem, token: string, currentUserId: string) => {
    try {
      const messagesResponse = await apiFetch(`${BACKEND_URL}/api/chats/${chat.id}/messages/`, {
        method: 'GET',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        const latestOtherMessage = messagesData.find((msg: any) => msg.sender.toString() !== currentUserId);
        const lastMsg = latestOtherMessage ? latestOtherMessage.message : "No messages";
        return { ...chat, lastMessage: lastMsg };
      }
    } catch (err) {
      console.error(err);
    }
    return { ...chat, lastMessage: "No messages" };
  };
  
  // Fetch chat history from backend
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert("Error", "Not logged in");
        router.push('/screens/login');
        return;
      }
      const response = await apiFetch(`${BACKEND_URL}/api/chats/me/`, {
        method: 'GET',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data: ChatItem[] = await response.json();
        const chatsWithLastMessages = await Promise.all(
          data.map(chat => getLastMessageForChat(chat, token, currentUserId))
        );
        setChats(chatsWithLastMessages);
      } else {
        Alert.alert("Error", "Failed to fetch chat history");
      }
    })();
  }, [currentUserId]);

  const filteredChats = chats.filter(chat => {
    if (filter === 'all') return !chat.blocked; // Exclude blocked in all view
    if (filter === 'unread') return chat.unread && !chat.blocked;
    if (filter === 'blocked') return chat.blocked;
    return true;
  });

  const renderChatItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => router.push(`/screens/chatConversation?chat_id=${item.id}&chatName=${encodeURIComponent(item.name)}`)}
    >
      <Text style={styles.chatName}>{item.name}</Text>
      <Text style={styles.chatMessage}>{item.lastMessage}</Text>
      {item.unread && filter === 'all' && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>New</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat</Text>
      </View>

      {/* Filter Options */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'all' && styles.filterActive]} 
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'unread' && styles.filterActive]} 
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>Not Read</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'blocked' && styles.filterActive]} 
          onPress={() => setFilter('blocked')}
        >
          <Text style={[styles.filterText, filter === 'blocked' && styles.filterTextActive]}>Blocked</Text>
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      <FlatList 
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, marginLeft: 12 },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#eee',
    paddingVertical: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterActive: { backgroundColor: '#4287f5' },
  filterText: { fontSize: 14, color: '#333' },
  filterTextActive: { color: '#fff' },
  listContent: { padding: 16 },
  chatItem: {
    padding: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 12,
  },
  chatName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  chatMessage: { fontSize: 14, color: '#555' },
  unreadBadge: {
    backgroundColor: '#f00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  unreadText: { color: '#fff', fontSize: 10 },
});
