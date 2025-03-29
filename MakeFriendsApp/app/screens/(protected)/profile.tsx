import React, { useEffect, useState } from 'react';
import { FlatList, TouchableOpacity, Text, StyleSheet, View, SafeAreaView, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from './config.json';
import { apiFetch } from './_authHelper';

const BACKEND_URL = config.url;

type MenuItem = {
  key: string;
  label: string;
  icon: string; // Ionicon name
  onPress: () => void;
};

const ProfileMenuScreen = () => {
  const router = useRouter();
  
  // State to store profile data (name and profile picture)
  const [name, setName] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  // Disconnect function: clear tokens and redirect to login screen.
  const handleDisconnect = async () => {
    try {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
      router.push('/screens/login');
    } catch (error: any) {
      Alert.alert("Error", error.toString());
    }
  };

  // Show confirmation popup before disconnecting.
  const confirmDisconnect = () => {
    Alert.alert(
      "Confirm Disconnection",
      "Are you sure you want to disconnect?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Disconnect", style: "destructive", onPress: handleDisconnect }
      ]
    );
  };

  // Fetch the profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
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
          setName(data.name || data.username); // Fallback to username if name is not set
          if (data.profile_picture) {
            setProfilePicture(data.profile_picture);
          }
        } else {
          Alert.alert("Error", "Failed to fetch profile");
        }
      } catch (error: any) {
        Alert.alert("Error", error.toString());
      }
    };
    fetchProfile();
  }, []);

  // Define menu items. When "Account" is pressed, navigate to AccountScreen.
  const menuItems: MenuItem[] = [
    {
      key: 'account',
      label: 'Account',
      icon: 'person-circle-outline',
      onPress: () => router.push('/screens/account'),
    },
    {
      key: 'devices',
      label: 'Associated Devices',
      icon: 'tablet-landscape-outline',
      onPress: () => Alert.alert('Associated Devices Pressed'),
    },
    {
      key: 'donation',
      label: 'Donate to MakeFriendsApp',
      icon: 'heart-outline',
      onPress: () => Alert.alert('Thank you for your attention but I do not need yet donations to remain alive'),
    },
    {
      key: 'appearance',
      label: 'Appearance',
      icon: 'color-palette-outline',
      onPress: () => Alert.alert('Appearance Pressed'),
    },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: 'notifications-outline',
      onPress: () => Alert.alert('Notifications Pressed'),
    },
    {
      key: 'privacy',
      label: 'Privacy',
      icon: 'lock-closed-outline',
      onPress: () => Alert.alert('Privacy Pressed'),
    },
    {
      key: 'disconnect',
      label: 'Disconnect',
      icon: 'log-out-outline',
      onPress: confirmDisconnect,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header displaying profile picture and name */}
      <View style={styles.profileHeader}>
        {profilePicture ? (
          <Image source={{ uri: profilePicture }} style={styles.profileImage} />
        ) : (
          <View style={styles.profilePlaceholder}>
            <Ionicons name="person" size={40} color="#fff" />
          </View>
        )}
        <Text style={styles.profileName}>{name}</Text>
      </View>

      {/* Menu List */}
      <FlatList
        data={menuItems}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.menuItem} onPress={item.onPress}>
            <Ionicons name={item.icon} size={24} style={[
                styles.menuItemIcon,
                item.key === 'disconnect' && { color: 'red' },
              ]} />
            <Text style={[
                styles.menuItemLabel,
                item.key === 'disconnect' && { color: 'red' },
              ]}
              >{item.label}</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
};

export default ProfileMenuScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  profilePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuItemIcon: {
    marginRight: 16,
  },
  menuItemLabel: {
    fontSize: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#ccc',
    marginLeft: 60,
  },
});
