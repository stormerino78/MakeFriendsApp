// app/screens/(protected)/_layout.tsx
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProtectedLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('access_token');
      const authStatus = !!token;
      setIsAuthenticated(authStatus);
      if (!authStatus) {
        router.replace('/screens/login');
      }
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', flexDirection: 'row', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // We define only two tab screens: home and profile.
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName = "";
          if (route.name === "poke") {
            iconName = "chatbubbles-outline";
          } else if (route.name === "event") {
            iconName = "calendar-number-outline";
          } else if (route.name === "profile") {
            iconName = "person";
          } else if (route.name === "profile") {
            iconName = "person";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#153b8e",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
      })}
    >
      <Tabs.Screen name="poke"/>
      <Tabs.Screen name="event"/>
      <Tabs.Screen name="profile"/>
    </Tabs>
  );
}
