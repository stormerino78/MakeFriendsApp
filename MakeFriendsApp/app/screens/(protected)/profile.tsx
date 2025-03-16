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

// URL for the backend API
const BACKEND_URL = "http://192.168.1.11:8000";

const ProfileScreen = () => {
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
        const response = await fetch(`${BACKEND_URL}/api/users/me/`, {
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
      const response = await fetch(`${BACKEND_URL}/api/users/me/`, {
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

  // Render the UI wrapped in a KeyboardAwareScrollView to adjust layout when the keyboard appears
  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Profile</Text>

      {profilePicture && (
        // Display the profile image in a circular view.
        <Image
          source={{ uri: profilePicture }}
          style={styles.profileImage}
        />
      )}
      <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
        <Text style={styles.imagePickerText}>Change Profile Picture</Text>
      </TouchableOpacity>

      {/* Read-only fields */}
      <Text style={styles.label}>Username: {username}</Text>
      <Text style={styles.label}>Email: {email}</Text>

      {/* Other fields */}
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

      {/* Picker for Gender */}
      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Gender:</Text>
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

      {/* Input for Interests */}
      <TextInput
        placeholder="Interests"
        style={styles.input}
        value={interests}
        onChangeText={setInterests}
      />

      {/* Picker for Personality */}
      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Personality:</Text>
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

      {/* Input for Why */}
      <TextInput
        placeholder="Why?"
        style={styles.input}
        value={why}
        onChangeText={setWhy}
      />

      {/* Save Button */}
      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Save Profile</Text>
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  // Container for the entire scrollable content
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  // Title style
  title: {
    fontSize: 32,
    marginBottom: 20,
    alignSelf: 'center',
  },
  // Label style for text fields
  label: {
    fontSize: 16,
    marginVertical: 8,
  },
  // Style for TextInput fields
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  // Button style for date picker
  datePickerButton: {
    height: 50,
    justifyContent: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  // Text style for the date picker button
  datePickerText: {
    fontSize: 14,
  },
  // Container for pickers (gender and personality)
  pickerContainer: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
  },
  // Style for Picker component
  picker: {
    height: 50,
    width: '100%',
    fontSize: 14,
  },
  // Style for the button that triggers image picking
  imagePickerButton: {
    backgroundColor: '#888',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  // Text style for the image picker button
  imagePickerText: {
    color: '#fff',
    textAlign: 'center',
  },
  // Style for displaying the profile image (circular image)
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 15,
  },
  // Style for the save profile button
  button: {
    backgroundColor: '#4287f5',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  // Text style for the save profile button
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 18,
  },
});

export default ProfileScreen;
