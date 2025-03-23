// app/screens/accountCreation.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform} from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import config from './(protected)/config.json';

const BACKEND_URL = config.url;

const RegistrationScreen = () => {
  // Get all the data from the user
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('');
  const [interests, setInterests] = useState('');
  const [personality, setpersonality] = useState('');
  const [why, setWhy] = useState('');

  // Handle changes from the DateTimePicker
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // On Android, hide after selection.
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  // To create an account, the user needs to fill the username, email, password, name, age and gender
  const handleRegister = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (username === '') {
      Alert.alert("Error", "Username is empty");
      return;
    } else if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    } else if (password.trim() === '') {
      Alert.alert("Error", "Password is empty");
      return;
    } else if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    } else if (name.trim() === '') {
      Alert.alert("Error", "Name is empty");
      return;
    }else if (gender.trim() === '') {
      Alert.alert("Error", "Choose a gender");
      return;
    }

    // Format date of birth as YYYY-MM-DD
    const dateOfBirth_str = dateOfBirth.toISOString().split('T')[0];

    // Construct payload based on the serializer
    // For fields not captured by the form, we provide default values.
    const payload = {
      username,
      email,
      password,
      name,
      dateOfBirth_str,
      gender,
      interests,
      personality,
      why
    };

    // Send request to the register endpoint to register a new user
    try {
      console.log(JSON.stringify(payload))
      const response = await fetch(`${BACKEND_URL}/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok) {
        console.log("Registration successful:", data);
        // Navigate back to the login screen on success.
        router.push('/');
      } else {
        console.error("Registration error:", data);
        Alert.alert("Registration failed", JSON.stringify(data));
      }
    } catch (error) {
      console.error("Network error:", error);
      // Alert.alert("Network error", error.toString());
    }
  };

  // display the form to get the data from the user (each block is to ask one data)
  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Register</Text>

      <TextInput
        placeholder="Username"
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Password"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        secureTextEntry
      />

      <TextInput
        placeholder="Confirm Password"
        style={styles.input}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        autoCapitalize="none"
        secureTextEntry
      />

      <TextInput
        placeholder="Name"
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

      <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.datePickerText}>
            Date of Birth: {dateOfBirth.toISOString().split('T')[0]}
          </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={dateOfBirth}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Gender:</Text>
        <Picker
          selectedValue={gender}
          style={styles.picker}
          onValueChange={(itemValue) => setGender(itemValue)}
        >
          <Picker.Item label="Gender" value="" />
          <Picker.Item label="Homme" value="homme" />
          <Picker.Item label="Femme" value="femme" />
        </Picker>
      </View>

      <TextInput
        placeholder="Interests"
        style={styles.input}
        value={interests}
        onChangeText={setInterests}
      />

      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Personality:</Text>
        <Picker
          selectedValue={gender}
          style={styles.picker}
          onValueChange={(itemValue) => setpersonality(itemValue)}
        >
          <Picker.Item label="What are you more ?" value="" />
          <Picker.Item label="Introvert" value="Introvert" />
          <Picker.Item label="Extravert" value="Extravert" />
        </Picker>
      </View>

      <TextInput
        placeholder="Why?"
        style={styles.input}
        value={why}
        onChangeText={setWhy}
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/')}>
        <Text style={styles.linkText}>Already have an account? Log In</Text>
      </TouchableOpacity>
    </KeyboardAwareScrollView>
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
  datePickerButton: {
    height: 50,
    justifyContent: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  datePickerText: {
    fontSize: 14,
  },
  pickerContainer: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
  },
  picker: {
    height: 50,
    width: '100%',
    fontSize: 14,
  },
  label: {
    flex: 1,
    fontSize: 14
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

export default RegistrationScreen;
