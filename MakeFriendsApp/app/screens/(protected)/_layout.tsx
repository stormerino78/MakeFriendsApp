// app/(protected)/_layout.tsx
import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define and export the ProtectedLayout component which will wrap protected screens.
export default function ProtectedLayout() {
  // Track when the user is authentificated (null since the autentication is not initialised)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Navigation through expo router
  const router = useRouter();

  // run once when the components mounts
  useEffect(() => {
    // check authentification status (async)
    const checkAuth = async () => {
      // check by cheking the token in the async storage
      const token = await AsyncStorage.getItem('access_token');
      // the user is authentificated if the token is found (converting into a bool)
      const authStatus = !!token;
      // update the authentification status state
      setIsAuthenticated(authStatus);
      if (!authStatus) {
        router.replace('/screens/login'); // redirect to login if not authenticated
      }
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    // While checking auth status, show a loading spinner
    return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;
  }

  // display the bottom tab navigator when authentification is confirmed
  return (
    <Tabs
        screenOptions={({ route }) => ({
          // dinamically define the icon for each tab of the navigator tab
          tabBarIcon: ({ color, size }) => {
            let iconName = "";
            if (route.name === "home") {
              iconName = "home";
            } else if (route.name === "profile") {
              iconName = "person";
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: "#4287f5",
          tabBarInactiveTintColor: "gray",
          headerShown: false,
        })}
      >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
