import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  SafeAreaView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type ChatItem = {
  id: string;
  name: string;
  lastMessage: string;
  unread: boolean;
  blocked: boolean;
};

const dummyChats: ChatItem[] = [
  { id: '1', name: 'Alice', lastMessage: 'Hey, how are you?', unread: true, blocked: false },
  { id: '2', name: 'Bob', lastMessage: 'See you tomorrow!', unread: false, blocked: false },
  { id: '3', name: 'Charlie', lastMessage: 'Blocked conversation', unread: false, blocked: true },
  { id: '4', name: 'Diana', lastMessage: 'Let’s catch up soon!', unread: true, blocked: false },
];

const ChatScreen = () => {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread' | 'blocked'>('all');

  const filteredChats = dummyChats.filter(chat => {
    if (filter === 'all') return !chat.blocked; // Exclude blocked items
    if (filter === 'unread') return chat.unread && !chat.blocked; // Exclude blocked items
    if (filter === 'blocked') return chat.blocked;
    return true;
  });

  const renderChatItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity style={styles.chatItem}>
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
          <Ionicons name="arrow-back" size={24} color="#fff" />
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
    backgroundColor: '#1f1f1f',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: '#fff', fontSize: 18, marginLeft: 12 },
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
