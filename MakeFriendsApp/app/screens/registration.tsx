// app/screens/RegistrationOptionsScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const RegistrationOptionsScreen = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Registration Method</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/screens/accountCreation')}
      >
        <Text style={styles.buttonText}>Register Locally</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          // TODO: Implement Google registration logic or navigate to a dedicated screen.
          console.log("Register with Google pressed");
        }}
      >
        <Text style={styles.buttonText}>Register with Google</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          // TODO: Implement Facebook registration logic or navigate to a dedicated screen.
          console.log("Register with Facebook pressed");
        }}
      >
        <Text style={styles.buttonText}>Register with Facebook</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4287f5',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginVertical: 10,
    width: '80%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default RegistrationOptionsScreen;
