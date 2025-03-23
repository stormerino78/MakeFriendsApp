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
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from './config.json';

const BACKEND_URL = config.url;

type NearbyUser = {
  id: string;
  name: string;
  profilePicture?: string;
  mood: string;
  coordinates: { latitude: number; longitude: number };
  visible: boolean;
};

// Updated dummy data using the new type
const dummyNearbyUsers: NearbyUser[] = [
  { 
    id: '1', 
    name: 'Alice', 
    profilePicture: 'https://via.placeholder.com/100', 
    mood: 'Casual chat', 
    coordinates: { latitude: 48.575147, longitude: 7.752592 }, 
    visible: true 
  },
  { 
    id: '2', 
    name: 'Bob', 
    profilePicture: 'https://via.placeholder.com/100', 
    mood: 'Looking for a deep talk', 
    coordinates: { latitude: 48.578962, longitude: 7.761605 }, 
    visible: true 
  },
  { 
    id: '3', 
    name: 'Charlie', 
    profilePicture: 'https://via.placeholder.com/100', 
    mood: 'Activity partner', 
    coordinates: { latitude: 48.563107, longitude: 7.761999 }, 
    visible: true 
  },
];

const PokeScreen = () => {
  const router = useRouter();
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [userMood, setUserMood] = useState<string>("");

  useEffect(() => {
    (async () => {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Location permission was denied");
        return;
      }
      // Get current user position and update state
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  // Fetch current user's profile to get their friendship mood
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (!token) {
          Alert.alert("Error", "Not logged in");
          router.push('/screens/login');
          return;
        }
        const response = await fetch(`${BACKEND_URL}/api/users/me/`, {
          method: 'GET',
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          // Set the user's mood (ensure it is in lowercase for consistent comparison)
          setUserMood((data.mood || "").toLowerCase());
        } else {
          Alert.alert("Error", "Failed to fetch profile");
        }
      } catch (error: any) {
        Alert.alert("Error", error.toString());
      }
    })();
  }, []);

  useEffect(() => {
    let filtered = dummyNearbyUsers.filter(user => user.visible);
    if (userMood) {
      filtered = filtered.filter(user => user.mood.toLowerCase() === userMood);
    }
    setNearbyUsers(filtered);
  }, [userMood]);

  const handlePoke = (user: NearbyUser) => {
    Alert.alert("Poke Sent", `You have poked ${user.name}`);
    // Implement actual poke logic with backend
  };

  // Helper function: Haversine formula to compute distance in km.
  const getDistanceFromLatLonInKm = (
    lat1: number, lon1: number, lat2: number, lon2: number
  ) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Render each nearby user item, including the distance.
  const renderUserItem = ({ item }: { item: NearbyUser }) => {
    // Calculate distance if userLocation is available.
    let distanceText = "";
    if (userLocation) {
      const distance = getDistanceFromLatLonInKm(
        userLocation.latitude,
        userLocation.longitude,
        item.coordinates.latitude,
        item.coordinates.longitude
      );
      distanceText = `${distance.toFixed(1)} km`;
    }
    return (
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
          <Text style={styles.userMood}>{item.mood}</Text>
          {distanceText !== "" && (
            <Text style={styles.userDistance}>{distanceText}</Text>
          )}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.pokeButton} onPress={() => handlePoke(item)}>
            <Text style={styles.pokeButtonText}>Poke</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with Title and Chat Icon */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Poke Nearby Users</Text>
        <TouchableOpacity onPress={() => router.push('/screens/chat')}>
          <Ionicons name="chatbubble-ellipses-outline" size={28} color="#fff" />
        </TouchableOpacity>
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
  userDistance: { fontSize: 12, color: '#888', marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  pokeButton: {
    backgroundColor: '#4287f5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginRight: 10,
  },
  pokeButtonText: { color: '#fff', fontSize: 14 },
});
