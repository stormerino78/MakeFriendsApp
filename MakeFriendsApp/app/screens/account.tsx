import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import config from './(protected)/config.json';
import { LinearGradient } from 'expo-linear-gradient';
import { apiFetch } from './(protected)/_authHelper';

const BACKEND_URL = config.url;

const AccountScreen = () => {
  // Get router for navigation
  const router = useRouter();

  // Username and email are read-only
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  // non read-only
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('');
  const [interests, setInterests] = useState('');
  const [personality, setPersonality] = useState('');
  const [why, setWhy] = useState('');
  // State for the profile picture URI; will hold the image file path
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [mood, setMood] = useState('');
  const [activeInput, setActiveInput] = useState<string | null>(null);
  
  // Fetch the current user profile from the backend when the component mounts
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Retrieve JWT token from AsyncStorage
        const token = await AsyncStorage.getItem('access_token');
        if (!token) {
          Alert.alert("Error", "Not logged in");
          // Redirect to login screen if not authenticated
          router.push('/');
          return;
        }
        // Fetch profile from api/users/me/ endpoint using the token for authentication
        const response = await apiFetch(`${BACKEND_URL}/api/users/me/`, {
          method: 'GET',
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });
        // Update the data with the returned data
        if (response.ok) {
          const data = await response.json();
          setUsername(data.username);
          setEmail(data.email);
          setName(data.name || '');
          // Convert the date string returned by the backend (if possible) into a Date object
          if (data.dateOfBirth_str) {
            setDateOfBirth(new Date(data.dateOfBirth_str));
          }
          setGender(data.gender || '');
          setInterests(data.interests || '');
          setPersonality(data.personality || '');
          setWhy(data.why || '');
          setMood(data.mood || '');
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
  }, []); // Empty dependency array -> runs once on mount

  // Updates the dateOfBirth state when a new date is selected with the DateTimePicker handler
  const handleDateChange = (event: any, selectedDate?: Date) => {
    // For Android hide the picker after selection
    // For iOS we keep it visible
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  // Function to pick an image from the gallery
  const pickImage = async () => {
    // Request permission to access the media library.
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission required", "Permission to access gallery is required!");
      return;
    }
    // Launch the image library
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    // If the user didn't cancel and at least one asset is returned we update the profile picture URI
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfilePicture(result.assets[0].uri);
    }
  };

  // Function to save the updated profile data.
  // Creates a FormData object to allow file uploads for the profile picture
  const handleSave = async () => {
    // Format the date of birth as a string in the form YYYY-MM-DD
    const dateOfBirth_str = dateOfBirth.toISOString().split('T')[0];

    // Create a new FormData instance and append all profile datas
    const formData = new FormData();
    formData.append('name', name);
    formData.append('dateOfBirth_str', dateOfBirth_str);
    formData.append('gender', gender);
    formData.append('interests', interests);
    formData.append('personality', personality);
    formData.append('why', why);
    formData.append('mood', mood);
    // Append profile pic to the form data as a file.
    if (profilePicture) {
      let localUri = profilePicture;
      // Extract filename from the URI
      let filename = localUri.split('/').pop() || 'profile.jpg';
      // Determine file type from the file extension
      let match = /\.(\w+)$/.exec(filename);
      let type = match ? `image/${match[1]}` : `image`;
      formData.append('profile_picture', { uri: localUri, name: filename, type } as any);
    }

    // Check the user is logged in
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert("Error", "Not logged in");
        router.push('/');
        return;
      }

      // PATCH request to update the profile
      // NB not Content-Type header when sending FormData
      const response = await apiFetch(`${BACKEND_URL}/api/users/me/`, {
        method: 'PATCH',
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert("Profile updated successfully");
      } else {
        Alert.alert("Update failed", JSON.stringify(data));
      }
    } catch (error: any) {
      Alert.alert("Network error", error.toString());
    }
  };

  return (
    <LinearGradient colors={['#f9f9f9', '#fff']} style={styles.gradient}>
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/screens/(protected)/profile')}>
            <Ionicons name="arrow-back" size={24} color={"#153b8e"} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account</Text>
        </View>
        {profilePicture && (
          <Image
            source={{ uri: profilePicture }}
            style={styles.profileImage}
          />
        )}
        <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
          <Text style={styles.imagePickerText}>Change Profile Picture</Text>
        </TouchableOpacity>
        <Text style={styles.label}>Username</Text>
        <TextInput
          placeholder="Username"
          style={[styles.input, activeInput === 'username' && styles.inputFocused]}
          value={username}
          onChangeText={setUsername}
          placeholderTextColor="rgba(0,0,0,0.6)"
          cursorColor={secondaryOrange}
          onFocus={() => setActiveInput('username')}
        />
        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="email"
          style={[styles.input, activeInput === 'email' && styles.inputFocused]}
          value={email}
          onChangeText={setEmail}
          placeholderTextColor="rgba(0,0,0,0.6)"
          cursorColor={secondaryOrange}
          onFocus={() => setActiveInput('email')}
        />
        <Text style={styles.label}>Name</Text>
        <TextInput
          placeholder="Name"
          style={[styles.input, activeInput === 'name' && styles.inputFocused]}
          value={name}
          onChangeText={setName}
          placeholderTextColor="rgba(0,0,0,0.6)"
          cursorColor={secondaryOrange}
          onFocus={() => setActiveInput('name')}
        />
        <Text style={styles.label}>Date of birth</Text>
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={24} color="#333" style={styles.optionIcon} />
          <Text style={styles.datePickerText}>
            {dateOfBirth.toISOString().split('T')[0]}
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
        <Text style={styles.label}>Gender</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={gender}
            style={styles.picker}
            onValueChange={(itemValue) => setGender(itemValue)}
          >
            <Picker.Item label="Select gender" value="" />
            <Picker.Item label="Homme" value="homme" />
            <Picker.Item label="Femme" value="femme" />
          </Picker>
        </View>
        <Text style={styles.label}>Interests</Text>
        <TextInput
          placeholder="Interests"
          style={[styles.input, activeInput === "Interests" && styles.inputFocused]}
          value={interests}
          onChangeText={setInterests}
          placeholderTextColor="rgba(0,0,0,0.6)"
          cursorColor={secondaryOrange}
          onFocus={() => setActiveInput("Interests")}
        />
        <Text style={styles.label}>Personality:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={personality}
            style={styles.picker}
            onValueChange={(itemValue) => setPersonality(itemValue)}
          >
            <Picker.Item label="What are you more?" value="" />
            <Picker.Item label="Introvert" value="Introvert" />
            <Picker.Item label="Extravert" value="Extravert" />
          </Picker>
        </View>
        <Text style={styles.label}>Friendship Mood</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={mood} style={styles.picker} onValueChange={(itemValue) => setMood(itemValue)}>
            <Picker.Item label="None" value="" />
            <Picker.Item label="Casual chat" value="casual chat" />
            <Picker.Item label="Looking for a deep talk" value="deep talk" />
            <Picker.Item label="Activity partner" value="activity partner" />
            <Picker.Item label="Networking" value="networking" />
            <Picker.Item label="New to town" value="new to town" />
          </Picker>
        </View>
        <Text style={styles.label}>Why are you on the app?</Text>
        <TextInput
          placeholder=" "
          style={[styles.input, activeInput === " " && styles.inputFocused]}
          value={why}
          onChangeText={setWhy}
          placeholderTextColor="rgba(0,0,0,0.6)"
          cursorColor={secondaryOrange}
          onFocus={() => setActiveInput(" ")}
        />
        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Save Profile</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </LinearGradient>
  );
};

const secondaryOrange = "#FFA500";

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    backgroundColor: "rgba(255,255,255,0.95)",
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderColor: "#ccc",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    marginLeft: 12,
    color: "#333",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#153b8e",
  },
  imagePickerButton: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: secondaryOrange,
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  imagePickerText: {
    color: "rgba(0,0,0,0.9)",
    textAlign: 'center',
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    padding: 10,
    color: '#000',
  },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    marginBottom: 16,
    marginLeft: 12,
    paddingVertical: 8,
    paddingHorizontal: 0
  },
  datePickerButton: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    marginLeft: 12,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  datePickerText: {
    fontSize: 14,
    color: '#333',
  },
  optionIcon: {
    marginRight: 6,
  },
  pickerContainer: {
    borderColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    marginLeft: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  picker: {
    height: 50,
    width: '100%',
  },
  button: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: secondaryOrange,
    borderWidth: 1,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  buttonText: {
    color: "rgba(0,0,0,0.9)",
    textAlign: 'center',
    fontSize: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  inputFocused: { borderBottomColor: secondaryOrange, borderBottomWidth: 2, },
});

export default AccountScreen;