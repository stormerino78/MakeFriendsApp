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
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from './config.json';
import { apiFetch } from './_authHelper';

const BACKEND_URL = config.url;

type NearbyUser = {
  user_id: number;
  name: string;
  dateOfBirth_str: string;
  profile_picture?: string;
  mood: string;
  location_display?: {
    type: string;
    coordinates: [number, number];
  };
  anonymous?: boolean; // Indicates if the user is in anonymous mode.
};

// Custom hook to debounce a value
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const PokeScreen = () => {
  const router = useRouter();
  const [allNearbyUsers, setAllNearbyUsers] = useState<NearbyUser[]>([]);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [userMood, setUserMood] = useState<string>("");
  const [transparentMode, setTransparentMode] = useState(false);
  const [maxRange, setMaxRange] = useState<number>(10); // Range in km
  const [sliderValue, setSliderValue] = useState<number>(0); // Live value for the slider

  // Debounce the maxRange value so filtering happens only after slider settles
  const debouncedMaxRange = useDebounce(maxRange, 500);

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
        const patchResponse = await apiFetch(`${BACKEND_URL}/api/users/me/`, {
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
  
  // Fetch the current user's profile to get their mood and anonymous flag.
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (!token) {
          Alert.alert("Error", "Not logged in");
          router.push('/screens/login');
          return;
        }
        const response = await apiFetch(`${BACKEND_URL}/api/users/me/`, {
          method: 'GET',
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setUserMood((data.mood || "").toLowerCase());
          // Set the switch state based on the user's anonymous flag.
          setTransparentMode(data.anonymous);
        } else {
          Alert.alert("Error", "Failed to fetch profile");
        }
      } catch (error: any) {
        Alert.alert("Error", error.toString());
      }
    })();
  }, []);

  // Fetch nearby users from backend and store them in allNearbyUsers.
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (!token) {
          Alert.alert("Error", "Not logged in");
          router.push('/screens/login');
          return;
        }
        const response = await apiFetch(`${BACKEND_URL}/api/nearby-users/`, {
          method: 'GET',
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data: NearbyUser[] = await response.json();
          setAllNearbyUsers(data);
        } else {
          Alert.alert("Error", "Failed to fetch nearby users");
        }
      } catch (error: any) {
        Alert.alert("Error", error.toString());
      }
    })();
  }, [router]);

  // Filter nearby users based on mood, anonymous flag, and distance.
  useEffect(() => {
    let filtered = allNearbyUsers;
    if (userMood) {
      filtered = filtered.filter(user => user.mood.toLowerCase() === userMood);
    }
    // When anonymous mode is disabled, only show users who have also disabled anonymous mode.
    if (!transparentMode) {
      filtered = filtered.filter(user => !user.anonymous);
    }
    if (userLocation) {
      filtered = filtered.filter(user => {
        if (user.location_display && user.location_display.coordinates && user.location_display.coordinates.length === 2) {
          const [lon, lat] = user.location_display.coordinates;
          const distance = getDistanceFromLatLonInKm(
            userLocation.latitude,
            userLocation.longitude,
            lat,
            lon
          );
          return distance <= debouncedMaxRange;
        }
        return false;
      });
    }
    setNearbyUsers(filtered);
  }, [allNearbyUsers, userMood, transparentMode, userLocation, debouncedMaxRange]);

  // Update the current user's anonymous flag on the backend
  const updateAnonymousFlag = async (newValue: boolean) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert("Error", "Not logged in");
        router.push('/screens/login');
        return;
      }
      const response = await apiFetch(`${BACKEND_URL}/api/users/me/`, {
        method: 'PATCH',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ anonymous: newValue }),
      });
      if (!response.ok) {
        Alert.alert("Error", "Failed to update anonymous flag");
      } else {
        console.log("Anonymous flag updated successfully");
      }
    } catch (error: any) {
      Alert.alert("Error", error.toString());
    }
  };

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
  
  const calculateAge = (dateOfBirth: string) => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age < 0 ? 0 : age;
  };

  const handlePoke = async (user: NearbyUser) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert("Error", "Not logged in");
        router.push('/screens/login');
        return;
      }
      const response = await apiFetch(`${BACKEND_URL}/api/poke/`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ target_id: user.user_id })
      });
      if (response.ok) {
        await response.json();
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
    const age = calculateAge(item.dateOfBirth_str);
    if (
      userLocation &&
      item.location_display &&
      item.location_display.coordinates &&
      item.location_display.coordinates.length === 2
    ) {
      const [lon, lat] = item.location_display.coordinates;
      const distance = getDistanceFromLatLonInKm(
        userLocation.latitude,
        userLocation.longitude,
        lat,
        lon
      );
      distanceText = `${distance.toFixed(1)} km away`;
    }

    if (transparentMode) {
      return (
        <View style={styles.userItem}>
          <View style={[styles.userImage, styles.userPlaceholder]}>
            <Text style={styles.userPlaceholderText}>A</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Anonymous</Text>
            <Text style={styles.userAge}>{age}</Text>
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
    } else {
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
            <Text style={styles.userAge}>{age}</Text>
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
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Poke Nearby Users</Text>
        <TouchableOpacity onPress={() => router.push('/screens/chat')}>
          <Ionicons name="chatbubble-ellipses-outline" size={28} />
        </TouchableOpacity>
      </View>

      {/* Anonymous Mode Toggle */}
      <View style={styles.transparentContainer}>
        <Text style={styles.transparentLabel}>Anonymous Mode</Text>
        <Switch 
          value={transparentMode} 
          onValueChange={(value) => {
            setTransparentMode(value);
            updateAnonymousFlag(value);
            if (!value) {
              setNearbyUsers(prev => prev.filter(user => !user.anonymous));
            }
          }} 
          trackColor={{ false: '#ccc', true: '#153b8e' }}
        />
      </View>

      {/* Slider to control detection range */}
      <View style={styles.sliderContainer}>
        <Text style={styles.sliderLabel}>Detection Range: {sliderValue} km</Text>
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={0}
          maximumValue={100}
          step={1}
          value={maxRange}
          onValueChange={(value) => setSliderValue(value)}
          onSlidingComplete={(value) => setMaxRange(value)}
          minimumTrackTintColor="#153b8e"
          thumbTintColor = '#eb9800'
          maximumTrackTintColor="#ccc"
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18 },
  transparentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  transparentLabel: { fontSize: 14 },
  sliderContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sliderLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  listContent: { padding: 16 },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomColor: "rgba(0,0,0,0.1)",
    borderBottomWidth: 1,
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
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
  userInfo: { flex: 1, marginLeft: 8 },
  userName: { fontSize: 16, fontWeight: 'bold' },
  userAge: { fontSize: 14 },
  userMood: { fontSize: 14, color: '#666' },
  userDistance: { fontSize: 12, color: '#888', marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  pokeButton: {
    backgroundColor: "#fcb900",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  pokeButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "bold",
  },
});
