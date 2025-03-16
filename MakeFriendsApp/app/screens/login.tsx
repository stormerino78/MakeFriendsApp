// app/screens/login.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = "http://192.168.1.11:8000";

const LoginScreen = () => {
  // Get the login credentials
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    // Send request to the token url endpoint to login and receive the login token with the credentials gotten
    try {
      const response = await fetch(`${BACKEND_URL}/token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        // Login with username and password
        body: JSON.stringify({
          username: username, 
          password: password
        })
      });
      const data = await response.json();
      if (response.ok) {
        console.log("Login successful:", data);
        // Save the token for the next requests to remain authentificated through asyncStorage
        await AsyncStorage.setItem('access_token', data.access);
        console.log("Login successful, token saved:", data.access);
        // Navigate to the Home screen.
        router.push('/screens/(protected)/home');
      } else {
        console.error("Login error:", data);
        Alert.alert("Login failed", JSON.stringify(data));
      }
    } catch (error) {
      console.error("Network error:", error);
      // Alert.alert("Network error", error.toString());
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      
      <TextInput
        placeholder="Username"
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        // keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        placeholder="Password"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Log In</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => router.push('/screens/registration')}>
        <Text style={styles.linkText}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 32,
    marginBottom: 20,
    alignSelf: 'center'
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
    borderRadius: 5
  },
  button: {
    backgroundColor: '#4287f5',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 18
  },
  linkText: {
    color: '#4287f5',
    textAlign: 'center'
  }
});

export default LoginScreen;
