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
  user_id: number;
  name: string;
  profile_picture?: string;
  mood: string;
  location_display?: {
    type: string;
    coordinates: [number, number];
  };
};

const PokeScreen = () => {
  const router = useRouter();
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [userMood, setUserMood] = useState<string>("");
  const [transparentMode, setTransparentMode] = useState(false);

  // Get user's current location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Location permission was denied");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(coords);
  
      // Update user profile with current location
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (!token) {
          Alert.alert("Error", "Not logged in");
          router.push('/screens/login');
          return;
        }
        const patchResponse = await fetch(`${BACKEND_URL}/api/users/me/`, {
          method: 'PATCH',
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            location: {
              type: "Point",
              coordinates: [coords.longitude, coords.latitude]
            }
          }),
        });
        if (!patchResponse.ok) {
          const errText = await patchResponse.text();
          console.error("Failed to update location on profile", patchResponse.status, errText);
        } else {
          console.log("Location updated successfully");
        }
      } catch (error: any) {
        console.error("Error updating location:", error);
      }
    })();
  }, []);
  
  // Fetch the current user's profile to get their mood
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
          setUserMood((data.mood || "").toLowerCase());
        } else {
          Alert.alert("Error", "Failed to fetch profile");
        }
      } catch (error: any) {
        Alert.alert("Error", error.toString());
      }
    })();
  }, []);

  // Fetch nearby users from backend
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (!token) {
          Alert.alert("Error", "Not logged in");
          router.push('/screens/login');
          return;
        }
        // Assuming your backend has an endpoint for nearby users.
        // You might want to pass the current location as query parameters.
        const response = await fetch(`${BACKEND_URL}/api/nearby-users/`, {
          method: 'GET',
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data: NearbyUser[] = await response.json();
          let filtered = data;
          // Optionally filter by mood if set
          if (userMood) {
            filtered = filtered.filter(user => user.mood.toLowerCase() === userMood);
          }
          setNearbyUsers(filtered);
        } else {
          Alert.alert("Error", "Failed to fetch nearby users");
        }
      } catch (error: any) {
        Alert.alert("Error", error.toString());
      }
    })();
  }, [userMood]);

  // Helper function: Haversine formula for distance in km.
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

  const handlePoke = async (user: NearbyUser) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert("Error", "Not logged in");
        router.push('/screens/login');
        return;
      }
      const response = await fetch(`${BACKEND_URL}/api/poke/`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ target_id: user.user_id })  // use user_id instead of id
      });
      if (response.ok) {
        const data = await response.json();
        setNearbyUsers(prev => prev.filter(u => u.user_id !== user.user_id));
        router.push('/screens/chat');
      } else {
        Alert.alert("Error", "Failed to send poke");
      }
    } catch (error: any) {
      Alert.alert("Error", error.toString());
    }
  };

  const renderUserItem = ({ item }: { item: NearbyUser }) => {
    let distanceText = "";
    if (
      userLocation &&
      item.location_display &&
      item.location_display.coordinates &&
      item.location_display.coordinates.length === 2
    ) {
      // Extract coordinates from location_display
      const [lon, lat] = item.location_display.coordinates;
      const distance = getDistanceFromLatLonInKm(
        userLocation.latitude,
        userLocation.longitude,
        lat,
        lon
      );
      distanceText = `${distance.toFixed(1)} km away`;
    }
    return (
      <View style={styles.userItem}>
        {item.profile_picture ? (
          <Image source={{ uri: item.profile_picture }} style={styles.userImage} />
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

      {/* Transparent Mode Toggle */}
      <View style={styles.transparentContainer}>
        <Text style={styles.transparentLabel}>Transparent Mode</Text>
        <Switch 
          value={transparentMode} 
          onValueChange={setTransparentMode} 
          trackColor={{ false: '#ccc', true: '#4287f5' }}
        />
      </View>

      {/* List of Nearby Users */}
      <FlatList
        data={nearbyUsers}
        keyExtractor={(item) => item.user_id.toString()}
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
