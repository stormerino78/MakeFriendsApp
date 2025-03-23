import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Switch, 
  StyleSheet, 
  Image, 
  Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NearbyUser = {
  id: string;
  name: string;
  profilePicture?: string;
  friendshipMood: string;
  visible: boolean;
};

const dummyNearbyUsers: NearbyUser[] = [
  { id: '1', name: 'Alice', profilePicture: 'https://via.placeholder.com/100', friendshipMood: 'Casual chat', visible: true },
  { id: '2', name: 'Bob', profilePicture: 'https://via.placeholder.com/100', friendshipMood: 'Looking for a deep talk', visible: true },
  { id: '3', name: 'Charlie', profilePicture: 'https://via.placeholder.com/100', friendshipMood: 'Activity partner', visible: true },
];

const PokeScreen = () => {
  const router = useRouter();
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [transparentMode, setTransparentMode] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  useEffect(() => {
    // For demo purposes, using dummy data. Later, fetch from backend.
    setNearbyUsers(dummyNearbyUsers.filter(u => u.visible));
  }, []);

  const handlePoke = (user: NearbyUser) => {
    Alert.alert("Poke Sent", `You have poked ${user.name}`);
    // Implement actual poke logic with backend
  };

  const handleBlock = (userId: string) => {
    setBlockedUsers(prev => [...prev, userId]);
    setNearbyUsers(prev => prev.filter(u => u.id !== userId));
    Alert.alert("User Blocked", "This user has been blocked.");
  };

  const renderUserItem = ({ item }: { item: NearbyUser }) => (
    <View style={styles.userItem}>
      {item.profilePicture ? (
        <Image source={{ uri: item.profilePicture }} style={styles.userImage} />
      ) : (
        <View style={[styles.userImage, styles.userPlaceholder]}>
          <Text style={styles.userPlaceholderText}>{item.name.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userMood}>{item.friendshipMood}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.pokeButton} onPress={() => handlePoke(item)}>
          <Text style={styles.pokeButtonText}>Poke</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header with Title and Chat Icon */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Poke Nearby Users</Text>
        <TouchableOpacity onPress={() => router.push('/screens/chat')}>
          <Ionicons name="chatbubble-ellipses-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Transparent Mode Toggle */}
      <View style={styles.transparentContainer}>
        <Text style={styles.transparentLabel}>Transparent Mode</Text>
        <Switch 
          value={transparentMode} 
          onValueChange={setTransparentMode} 
          trackColor={{ false: '#ccc', true: '#4287f5' }}
        />
      </View>

      {/* List of nearby users */}
      <FlatList
        data={nearbyUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderUserItem}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

export default PokeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1f1f1f',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18 },
  transparentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1f1f1f',
  },
  transparentLabel: { color: '#fff', fontSize: 14 },
  listContent: { padding: 16 },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userPlaceholder: {
    backgroundColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPlaceholderText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: 'bold' },
  userMood: { fontSize: 14, color: '#666' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  pokeButton: {
    backgroundColor: '#4287f5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginRight: 10,
  },
  pokeButtonText: { color: '#fff', fontSize: 14 },
  blockButton: {
    backgroundColor: '#CC0000',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginRight: 8,
  }
});
