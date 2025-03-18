import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

// Get the device's screen dimensions.
const { width, height } = Dimensions.get('window');

// Define the initial position for the map view.
const INITIAL_REGION = {
  latitude: 48.78825,
  longitude: 7.4324,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// Define a TypeScript type for markers that can represent events or people.
export type MarkerType = {
  id: string;
  title: string;
  description: string;
  date: string; // Optional: date of event
  coordinates: { latitude: number; longitude: number };
  eventType: string;  // Optional: type of event
  age_range?: string; // Optional: date of the event
  gender_preference?: string; // Optional: gender preference for the event
};

const HomeScreen = () => {
  const router = useRouter();

  // State for events/people markers
  const [markers, setMarkers] = useState<MarkerType[]>([]);

  // Friendship mood state from the top bar (default Open)
  const [selectedMood, setSelectedMood] = useState('Open');
  const [searchQuery, setSearchQuery] = useState('');
  // Filter the markers displayed on the map (initially all)
  const [filteredMarkers, setFilteredMarkers] = useState<MarkerType[]>([]);
  // State for the user's current location (latitude & longitude).
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  // Ref for the MapView to animate the map to the user's location
  const mapRef = useRef<MapView>(null);
  // Toggle between map view and list view
  const [viewMode, setViewMode] = useState('map');
  // Whether the filter menu is visible
  const [showFilter, setShowFilter] = useState(false);
  // Sort choice
  const [sortOption, setSortOption] = useState<string | null>(null);
  // Filter choice
  const [filterOption, setFilterOption] = useState<string | null>(null);
  // Selected marker (for the bottom card)
  const [selectedMarker, setSelectedMarker] = useState<MarkerType | null>(null);
  const [currentRegion, setCurrentRegion] = useState(INITIAL_REGION);

  const [showFABMenu, setShowFABMenu] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);

  // Form states for new event creation
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newEventType, setNewEventType] = useState('');
  // Optional fields
  const [newAgeRange, setNewAgeRange] = useState('');
  const [newGenderPreference, setNewGenderPreference] = useState('');

  // Pïck the location of the event
  const [newEventCoordinates, setNewEventCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showLocationPickerModal, setShowLocationPickerModal] = useState(false);

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

  // 1) On mount request location permission and get user location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Permission to access location was denied");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
    })();
  }, []);
  
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

  // 2) Fetch events from the backend
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Assure the user is logged in
        const token = await AsyncStorage.getItem('access_token');
        if (!token) {
          Alert.alert("Error", "Not logged in");
          router.push('/');
          return;
        }
        // GET request to the events endpoint with the authentification token
        const response = await fetch("http://192.168.1.11:8000/api/events/", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (!response.ok) {
          Alert.alert("Error", "Failed to fetch events from backend");
          return;
        }
        const data = await response.json();
        // Transform each event into a MarkerType
        const eventMarkers: MarkerType[] = data.map((evt: any) => ({
          id: String(evt.id),
          title: evt.title,
          description: evt.description,
          date: evt.date,
          coordinates: {
            latitude: evt.latitude,
            longitude: evt.longitude,
          },
          eventType: evt.event_type,
          age_range: evt.age_range,
          gender_preference: evt.gender_preference,
        }));
        setMarkers(eventMarkers);
      } catch (error) {
        Alert.alert("Error", String(error));
      }
    };

    fetchEvents();
  }, []);

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

  // 3) Filter & sort markers
  useEffect(() => {
    // Filter search
    const filtered = markers.filter(marker => {
      const matchesSearch =
        marker.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        marker.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    // Sort
    let sorted = [...filtered];
    if (sortOption === 'alphabetical') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortOption === 'oldest') {
      sorted.sort((a, b) => Number(a.id) - Number(b.id));
    } else if (sortOption === 'newest') {
      sorted.sort((a, b) => Number(b.id) - Number(a.id));
    }

    // Additional filter if filterOption is set ('sport', 'online')
    if (filterOption) {
      sorted = sorted.filter(marker => {
        if (marker.eventType) {
          return marker.eventType.toLowerCase() === filterOption.toLowerCase();
        }
        return true;
      });
    }
    setFilteredMarkers(sorted);
  }, [selectedMood, searchQuery, sortOption, filterOption]);

  // Update current region on map region change.
  const handleRegionChangeComplete = (region: any) => {
    setCurrentRegion(region);
  };

  // Sort handler
  const handleSort = (option: string) => {
    if (option === 'none') {
      setSortOption(null);
    } else {
      setSortOption(option);
    }
    setShowFilter(false);
  };

  // Filter handler
  const handleFilter = (option: string) => {
    if (option === 'none') {
      setFilterOption(null);
    } else {
      setFilterOption(option);
    }
    setShowFilter(false);
  };

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

  // Handle Publish of new event
  const handlePublishEvent = async () => {
    // Validate required fields
    if (!newTitle.trim() || !newDescription.trim() || !newDate) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }
    // Use the selected event location if set or use currentRegion
    const coords = newEventCoordinates || currentRegion;
    if (!coords) {
      Alert.alert("Error", "Unable to determine event location.");
      return;
    }
    const eventData = {
      title: newTitle,
      description: newDescription,
      date: newDate.toISOString(), // backend expects ISO string
      latitude: coords.latitude,
      longitude: coords.longitude,
      event_type: newEventType,
      age_range: newAgeRange || null,
      gender_preference: newGenderPreference || null,
    };

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert("Error", "Not logged in");
        router.push('/');
        return;
      }
      const response = await fetch("http://192.168.1.11:8000/api/events/", {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(eventData),
      });
      if (response.ok) {
        Alert.alert("Success", "Event created successfully.");
        // Optionally, refresh events list:
        const createdEvent = await response.json();
        setMarkers(prev => [...prev, {
          id: String(createdEvent.id),
          title: createdEvent.title,
          description: createdEvent.description,
          date: createdEvent.date,
          coordinates: { latitude: createdEvent.latitude, longitude: createdEvent.longitude },
          eventType: createdEvent.event_type,
          age_range: createdEvent.age_range,
          gender_preference: createdEvent.gender_preference,
        }]);

        // Reset form fields and close modal/menu
        setNewTitle('');
        setNewDescription('');
        setNewDate(new Date());
        setNewEventCoordinates(null);
        setNewEventType('sport');
        setNewAgeRange('');
        setNewGenderPreference('');
        setShowCreateEventModal(false);
        setShowFABMenu(false);
      } else {
        const errorData = await response.json();
        Alert.alert("Publish Failed", JSON.stringify(errorData));
      }
    } catch (error) {
      Alert.alert("Error", String(error));
    }
  };

  // Date picker handler for new event date
  const handleNewDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // For Android hide after selection
    if (selectedDate) {
      setNewDate(selectedDate);
    }
  };

  // Handler for tapping on the location picker map.
  const handleMapPressForLocation = (e: any) => {
    const { coordinate } = e.nativeEvent;
    setNewEventCoordinates(coordinate);
  };

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

  // Join event logic
  const handleJoinEvent = (marker: MarkerType) => {
    Alert.alert('Join Event', `You have joined the event: ${marker.title}`);
  };

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

  return (
    <View style={styles.container}>
      {/* --- Top Friendship Mood Selector --- 
      <View style={styles.moodContainer}>
        {['Chat', 'Activity Partner', 'Business', 'Open'].map(mood => (
          <TouchableOpacity
            key={mood}
            style={[
              styles.moodButton,
              selectedMood === mood && styles.moodButtonActive,
            ]}
            onPress={() => setSelectedMood(mood)}
          >
            <Text
              style={[
                styles.moodButtonText,
                selectedMood === mood && styles.moodButtonTextActive,
              ]}
            >
              {mood}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      */}

      {/* --- Search Bar --- */}
      <TextInput
        style={styles.searchBar}
        placeholder="Search events or people..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* --- Bar with View Toggle and Filter Button --- */}
      <View style={styles.viewFilterBar}>
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => setViewMode('list')}
          >
            <Ionicons
              name="list-outline"
              size={20}
              color={viewMode === 'list' ? '#4287f5' : '#333'}
              style={styles.viewIcon}
            />
            <Text
              style={[
                styles.viewButtonText,
                viewMode === 'list' && styles.activeViewButtonText,
              ]}
            >
              List
            </Text>
          </TouchableOpacity>

          {/* Vertical divider */}
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => setViewMode('map')}
          >
            <Ionicons
              name="map-outline"
              size={20}
              color={viewMode === 'map' ? '#4287f5' : '#333'}
              style={styles.viewIcon}
            />
            <Text
              style={[
                styles.viewButtonText,
                viewMode === 'map' && styles.activeViewButtonText,
              ]}
            >
              Carte
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Section with Label and Icon */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filtrer</Text>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilter(!showFilter)}
          >
            <Ionicons name="filter-circle-outline" size={34} color="#4287f5" />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- Bottom-Sheet-Style Modal (react-native-modal) --- */}
      <Modal
        isVisible={showFilter}
        onBackdropPress={() => setShowFilter(false)}
        style={styles.bottomModal}
        animationIn="slideInUp"
        animationOut="slideOutDown"
      >
        {/* The container that appears from the bottom, full width */}
        <View style={styles.fullWidthModal}>
          <Text style={styles.modalTitle}>Trier par</Text>

          {/* None / reset option */}
          <TouchableOpacity
            onPress={() => {
              handleSort('none');
              handleFilter('none');
            }}
            style={styles.modalOptionRow}
          >
            <View style={styles.checkIconContainer}>
              {sortOption === null && filterOption === null && (
                <Ionicons name="arrow-forward-outline" size={24} color="#4287f5" />
              )}
            </View>
            <Ionicons name="close-circle-outline" size={24} color="#333" style={styles.optionIcon} />
            <Text style={styles.optionText}>None</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleSort('alphabetical')} style={styles.modalOptionRow}>
            <View style={styles.checkIconContainer}>
              {sortOption === 'alphabetical' && (
                <Ionicons name="arrow-forward-outline" size={24} color="#4287f5" />
              )}
            </View>
            <Ionicons name="list-outline" size={24} color="#333" style={styles.optionIcon} />
            <Text style={styles.optionText}>Alphabetically</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort('oldest')} style={styles.modalOptionRow}>
            <View style={styles.checkIconContainer}>
              {sortOption === 'oldest' && (
                <Ionicons name="arrow-forward-outline" size={24} color="#4287f5" />
              )}
            </View>
            <Ionicons name="arrow-up-outline" size={24} color="#333" style={styles.optionIcon} />
            <Text style={styles.optionText}>Oldest to Newest</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort('newest')} style={styles.modalOptionRow}>
            <View style={styles.checkIconContainer}>
              {sortOption === 'newest' && (
                <Ionicons name="arrow-forward-outline" size={24} color="#4287f5" />
              )}
            </View>
            <Ionicons name="arrow-down-outline" size={24} color="#333" style={styles.optionIcon} />
            <Text style={styles.optionText}>Newest to Oldest</Text>
          </TouchableOpacity>

          {/* Filter Section */}
          <Text style={[styles.modalTitle, { marginTop: 15 }]}>Filtrer par</Text>
          <TouchableOpacity onPress={() => handleFilter('sport')} style={styles.modalOptionRow}>
            <View style={styles.checkIconContainer}>
              {filterOption === 'sport' && (
                <Ionicons name="arrow-forward-outline" size={24} color="#4287f5" />
              )}
            </View>
            <Ionicons name="football-outline" size={24} color="#333" style={styles.optionIcon} />
            <Text style={styles.optionText}>Sport</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleFilter('cultural')} style={styles.modalOptionRow}>
            <View style={styles.checkIconContainer}>
              {filterOption === 'cultural' && (
                <Ionicons name="arrow-forward-outline" size={24} color="#4287f5" />
              )}
            </View>
            <Ionicons name="ticket-outline" size={24} color="#333" style={styles.optionIcon} />
            <Text style={styles.optionText}>Cultural</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleFilter('networking')} style={styles.modalOptionRow}>
            <View style={styles.checkIconContainer}>
              {filterOption === 'networking' && (
                <Ionicons name="arrow-forward-outline" size={24} color="#4287f5" />
              )}
            </View>
            <Ionicons name="briefcase-outline" size={24} color="#333" style={styles.optionIcon} />
            <Text style={styles.optionText}>Networking</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleFilter('online')} style={styles.modalOptionRow}>
            <View style={styles.checkIconContainer}>
              {filterOption === 'online' && (
                <Ionicons name="arrow-forward-outline" size={24} color="#4287f5" />
              )}
            </View>
            <Ionicons name="wifi-outline" size={24} color="#333" style={styles.optionIcon} />
            <Text style={styles.optionText}>Online</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* --- Conditionally Render Map or List View --- */}
      {viewMode === 'map' ? (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={
              userLocation
                ? { ...userLocation, latitudeDelta: 0.0922, longitudeDelta: 0.0421 }
                : INITIAL_REGION
            }
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation={true}
          >
            {filteredMarkers.map(marker => (
              <Marker
                key={marker.id}
                coordinate={marker.coordinates}
                onPress={() => setSelectedMarker(marker)}
                image={
                  marker.eventType === 'cultural'
                    ? require('../../../assets/images/cultural_icon.png')
                    : marker.eventType === 'sport'
                    ? require('../../../assets/images/sport_icon.png')
                    : marker.eventType === 'online'
                    ? require('../../../assets/images/online_icon.png')
                    : marker.eventType === 'networking'
                    ? require('../../../assets/images/networking_icon.png')
                    : require('../../../assets/images/event_icon.png')
                }
              />
            ))}
          </MapView>
        </>
      ) : (
        // Render List view
        <View style={styles.listContainer}>
          {filteredMarkers.map(marker => (
            <TouchableOpacity
              key={marker.id}
              style={styles.listItem}
              onPress={() => handleJoinEvent(marker)}
            >
              <Text style={styles.listTitle}>{marker.title}</Text>
              <Text style={styles.listDescription}>{marker.description}</Text>
              <Text style={styles.cardDescription}>Type: {marker.eventType}</Text>
              <Text style={styles.cardDescription}>Date: {marker.date}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {/* --- Bottom Card for Selected Marker only in the map view --- */}
      {viewMode === 'map' && selectedMarker && (
        <View style={styles.bottomCard}>
          <Text style={styles.cardTitle}>{selectedMarker.title}</Text>
          <Text style={styles.cardDescription}>{selectedMarker.description}</Text>
          <Text style={styles.cardDescription}>Type: {selectedMarker.eventType}</Text>
          <Text style={styles.cardDescription}>Date: {selectedMarker.date}</Text>
          {selectedMarker.age_range && (
            <Text style={styles.cardDescription}>
              Age Range: {selectedMarker.age_range}
            </Text>
          )}
          {selectedMarker.gender_preference && (
            <Text style={styles.cardDescription}>
              Gender Pref: {selectedMarker.gender_preference}
            </Text>
          )}
          <TouchableOpacity onPress={() => setSelectedMarker(null)}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowFABMenu(!showFABMenu)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* FAB Menu (appears above the FAB when toggled) */}
      {showFABMenu && (
        <View style={styles.fabMenu}>
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setShowCreateEventModal(true);
              setShowFABMenu(false);
            }}
          >
            <Text style={styles.fabMenuText}>Create Event</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal for Creating New Event */}
      <Modal
        isVisible={showCreateEventModal}
        onBackdropPress={() => setShowCreateEventModal(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Create New Event</Text>
          <TextInput
            style={styles.input}
            placeholder="Title"
            value={newTitle}
            onChangeText={setNewTitle}
          />
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Description"
            value={newDescription}
            onChangeText={setNewDescription}
            multiline
          />
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={24} color="#333" style={styles.optionIcon} />
            <Text style={styles.datePickerText}>
              {`${newDate.toISOString().split('T')[0]}`}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={newDate}
              mode="date"
              display="default"
              onChange={handleNewDateChange}
              minimumDate={new Date()}
            />
          )}
          {/* Drop-down for Event Type */}
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={newEventType}
              onValueChange={(itemValue) => setNewEventType(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="SELECT" value={null} />
              <Picker.Item label="SPORT" value="sport" />
              <Picker.Item label="ONLINE" value="online" />
              <Picker.Item label="CULTURAL" value="cultural" />
              <Picker.Item label="NETWORKING" value="networking" />
            </Picker>
          </View>
          {/* Button to launch location picker */}
          <TouchableOpacity
            style={styles.selectLocationButton}
            onPress={() => setShowLocationPickerModal(true)}
          >
            <Text style={styles.selectLocationText}>
              {newEventCoordinates
                ? `Location: (${newEventCoordinates.latitude.toFixed(4)}, ${newEventCoordinates.longitude.toFixed(4)})`
                : "Select Location"}
            </Text>
          </TouchableOpacity>
          {/* Optional fields */}
          <TextInput
            style={styles.input}
            placeholder="Age Range (optional)"
            value={newAgeRange}
            onChangeText={setNewAgeRange}
          />
          <TextInput
            style={styles.input}
            placeholder="Gender Preference (optional)"
            value={newGenderPreference}
            onChangeText={setNewGenderPreference}
          />
          <TouchableOpacity style={styles.publishButton} onPress={handlePublishEvent}>
            <Text style={styles.publishButtonText}>Publish</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      {/* Modal for Location Picker */}
      <Modal
        isVisible={showLocationPickerModal}
        onBackdropPress={() => setShowLocationPickerModal(false)}
        style={styles.locationModal}
      >
        <View style={styles.locationModalContent}>
          <Text style={styles.modalTitle}>Select Event Location</Text>
          <MapView
            style={styles.locationMap}
            initialRegion={
              userLocation
                ? { ...userLocation, latitudeDelta: 0.0922, longitudeDelta: 0.0421 }
                : INITIAL_REGION
            }
            onPress={handleMapPressForLocation}
          >
            {newEventCoordinates && (
              <Marker coordinate={newEventCoordinates} />
            )}
          </MapView>
          <TouchableOpacity
            style={styles.confirmLocationButton}
            onPress={() => setShowLocationPickerModal(false)}
          >
            <Text style={styles.confirmLocationText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  moodButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    backgroundColor: '#fff',
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
  moodButtonActive: {
    backgroundColor: '#4287f5',
  },
  moodButtonText: {
    fontSize: 14,
    color: '#333',
  },
  moodButtonTextActive: {
    color: '#fff',
  },
  searchBar: {
    height: 40,
    margin: 10,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 50,
    paddingHorizontal: 5,
    alignItems: 'center',
    marginRight: 10,
    alignSelf: 'center',
  },
  viewFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fff',
  },
  viewToggle: {
    flexDirection: 'row',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  activeViewButton: {
    backgroundColor: '#4287f5',
    borderColor: '#4287f5',
  },
  viewButtonText: {
    fontSize: 14,
    color: '#333',
    padding: 5,
  },
  customMarker: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    // Optional shadow or border for visibility:
    borderWidth: 1,
    borderColor: '#fff',
    // You can also add elevation for Android or shadow for iOS:
    elevation: 2,
  },
  markerTypeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  activeViewButtonText: {
    color: '#4287f5',
  },
  filterButton: {
    backgroundColor: '#fff',
    borderRadius: 50,
  },
  checkIconContainer: {
    width: 20, // fixed width container for the check icon
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  // react-native-modal bottom style
  bottomModal: {
    margin: 0,
    justifyContent: 'flex-end', // to appear from bottom
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 14,
    color: '#333',
    marginRight: 5,
  },
  markerContainer: {
    // Optionally adjust the container styling if needed.
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerImage: {
    width: 40,  // Set desired width
    height: 40, // Set desired height
    resizeMode: 'contain',
  },
  fullWidthModal: {
    backgroundColor: '#fff',
    width: '100%',       // take full width
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',    // optional limit
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#4287f5',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  fabMenu: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 5,
  },
  fabMenuItem: {
    padding: 10,
  },
  fabMenuText: {
    fontSize: 16,
    color: '#4287f5',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
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
  locationModal: {
    margin: 0,
    justifyContent: 'center',
  },
  locationModalContent: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    height: height * 0.6,
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  optionIcon: {
    marginRight: 6,
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
  listContainer: {
    flex: 1,
    padding: 10,
  },
  listItem: {
    padding: 10,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  listDescription: {
    fontSize: 14,
    color: '#555',
  },
  map: {
    flex: 1,
  },
  bottomCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  // Icon for each view button, with a little left margin
  viewIcon: {
    marginLeft: 5,
  },
  // Vertical divider between the two view buttons
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#ccc',
    marginHorizontal: 10,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  cardInfo: {
    fontSize: 14,
    marginBottom: 4,
  },
  closeButton: {
    fontSize: 16,
    color: '#4287f5',
    marginTop: 8,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginVertical: 6,
    paddingHorizontal: 10,
  },
  datePickerButton: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginVertical: 6,
    paddingHorizontal: 10,
  },
  datePickerText: {
    fontSize: 14,
  },
  publishButton: {
    backgroundColor: '#4287f5',
    padding: 12,
    borderRadius: 5,
    marginTop: 12,
    alignItems: 'center',
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  selectLocationButton: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ddd',
    borderRadius: 5,
    marginVertical: 6,
  },
  selectLocationText: { fontSize: 14, color: '#333' },
  locationMap: { flex: 1, borderRadius: 12 },
  confirmLocationButton: {
    backgroundColor: '#4287f5',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  confirmLocationText: { color: '#fff', fontSize: 16 },
});

export default HomeScreen;
