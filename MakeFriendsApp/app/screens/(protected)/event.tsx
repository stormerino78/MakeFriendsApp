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
  ScrollView,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import config from './config.json';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { apiFetch } from './_authHelper';

const BACKEND_URL = config.url;

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

// Helper function to format ISO date strings into French style ("28 mars | 21:14")
const formatEventDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const month = months[date.getMonth()];
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} | ${hours}:${minutes}`;
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
      const response = await apiFetch(`${BACKEND_URL}/api/events/`, {
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

  // Fetch events on mount and set up polling
  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
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
  }, [markers, searchQuery, sortOption, filterOption]);

  // Update current region on map region change.
  const handleRegionChangeComplete = (region: any) => {
    setCurrentRegion(region);
  };

  // Sort handler
  const handleSort = (option: string) => {
    setSortOption(option === 'none' ? null : option);
    setShowFilter(false);
  };

  // Filter handler
  const handleFilter = (option: string) => {
    setFilterOption(option === 'none' ? null : option);
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
      latitude: coords.latitude || null,
      longitude: coords.longitude || null,
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
      const response = await apiFetch(`${BACKEND_URL}/api/events/`, {
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
    <LinearGradient colors={['rgba(255,255,255,0.9)', 'rgba(255,165,0,0.05)']} style={styles.gradient}>
      <View style={styles.container}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search events or people..."
          placeholderTextColor="rgba(0,0,0,0.6)"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.viewFilterBar}>
          <View style={styles.viewToggleContainer}>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => setViewMode('list')}
            >
              <Ionicons
                name="list-outline"
                size={20}
                color={viewMode === 'list' ? secondaryOrange : '#333'}
                style={styles.viewIcon}
              />
              <Text style={[styles.viewButtonText, viewMode === 'list' && styles.activeViewButtonText]}>
                List
              </Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => setViewMode('map')}
            >
              <Ionicons
                name="map-outline"
                size={20}
                color={viewMode === 'map' ? secondaryOrange : '#333'}
                style={styles.viewIcon}
              />
              <Text style={[styles.viewButtonText, viewMode === 'map' && styles.activeViewButtonText]}>
                Carte
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilter(!showFilter)}
            >
              <Ionicons name="filter-circle-outline" size={34} color={primaryBlue} />
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          isVisible={showFilter}
          onBackdropPress={() => setShowFilter(false)}
          style={styles.bottomModal}
          animationIn="slideInUp"
          animationOut="slideOutDown"
        >
          <View style={styles.fullWidthModal}>
            <Text style={styles.modalTitle}>Trier par</Text>
            <TouchableOpacity
              onPress={() => {
                handleSort('none');
                handleFilter('none');
              }}
              style={styles.modalOptionRow}
            >
              <View style={styles.checkIconContainer}>
                {sortOption === null && filterOption === null && (
                  <Ionicons name="arrow-forward-outline" size={24} color={secondaryOrange} />
                )}
              </View>
              <Ionicons name="close-circle-outline" size={24} color="#333" style={styles.optionIcon} />
              <Text style={styles.optionText}>None</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSort('alphabetical')} style={styles.modalOptionRow}>
              <View style={styles.checkIconContainer}>
                {sortOption === 'alphabetical' && (
                  <Ionicons name="arrow-forward-outline" size={24} color={secondaryOrange} />
                )}
              </View>
              <Ionicons name="list-outline" size={24} color="#333" style={styles.optionIcon} />
              <Text style={styles.optionText}>Alphabetically</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSort('oldest')} style={styles.modalOptionRow}>
              <View style={styles.checkIconContainer}>
                {sortOption === 'oldest' && (
                  <Ionicons name="arrow-forward-outline" size={24} color={secondaryOrange} />
                )}
              </View>
              <Ionicons name="arrow-up-outline" size={24} color="#333" style={styles.optionIcon} />
              <Text style={styles.optionText}>Oldest to Newest</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSort('newest')} style={styles.modalOptionRow}>
              <View style={styles.checkIconContainer}>
                {sortOption === 'newest' && (
                  <Ionicons name="arrow-forward-outline" size={24} color={secondaryOrange} />
                )}
              </View>
              <Ionicons name="arrow-down-outline" size={24} color="#333" style={styles.optionIcon} />
              <Text style={styles.optionText}>Newest to Oldest</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { marginTop: 15 }]}>Filtrer par</Text>
            <TouchableOpacity onPress={() => handleFilter('sport')} style={styles.modalOptionRow}>
              <View style={styles.checkIconContainer}>
                {filterOption === 'sport' && (
                  <Ionicons name="arrow-forward-outline" size={24} color={secondaryOrange} />
                )}
              </View>
              <Ionicons name="football-outline" size={24} color="#333" style={styles.optionIcon} />
              <Text style={styles.optionText}>Sport</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleFilter('cultural')} style={styles.modalOptionRow}>
              <View style={styles.checkIconContainer}>
                {filterOption === 'cultural' && (
                  <Ionicons name="arrow-forward-outline" size={24} color={secondaryOrange} />
                )}
              </View>
              <Ionicons name="ticket-outline" size={24} color="#333" style={styles.optionIcon} />
              <Text style={styles.optionText}>Cultural</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleFilter('networking')} style={styles.modalOptionRow}>
              <View style={styles.checkIconContainer}>
                {filterOption === 'networking' && (
                  <Ionicons name="arrow-forward-outline" size={24} color={secondaryOrange} />
                )}
              </View>
              <Ionicons name="briefcase-outline" size={24} color="#333" style={styles.optionIcon} />
              <Text style={styles.optionText}>Networking</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleFilter('online')} style={styles.modalOptionRow}>
              <View style={styles.checkIconContainer}>
                {filterOption === 'online' && (
                  <Ionicons name="arrow-forward-outline" size={24} color={secondaryOrange} />
                )}
              </View>
              <Ionicons name="wifi-outline" size={24} color="#333" style={styles.optionIcon} />
              <Text style={styles.optionText}>Online</Text>
            </TouchableOpacity>
          </View>
        </Modal>

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
          <ScrollView style={styles.listContainer}>
            {filteredMarkers.map(marker => (
              <TouchableOpacity
                key={marker.id}
                style={styles.listItem}
                onPress={() => handleJoinEvent(marker)}
              >
                <Text style={styles.listTitle}>{marker.title}</Text>
                <Text style={styles.listDescription}>{marker.description}</Text>
                <Text style={styles.cardDescription}>Type: {marker.eventType}</Text>
                <Text style={styles.cardDescription}>Date: {formatEventDate(marker.date)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        {viewMode === 'map' && selectedMarker && (
          <BlurView intensity={50} tint="light" style={styles.bottomCardBlur}>
            <View style={styles.bottomCard}>
              <Text style={styles.cardTitle}>{selectedMarker.title}</Text>
              <Text style={styles.cardDescription}>{selectedMarker.description}</Text>
              <Text style={styles.cardDescription}>Type: {selectedMarker.eventType}</Text>
              <Text style={styles.cardDescription}>Date: {formatEventDate(selectedMarker.date)}</Text>
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
          </BlurView>
        )}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowFABMenu(!showFABMenu)}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
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
        <Modal
          isVisible={showCreateEventModal}
          onBackdropPress={() => setShowCreateEventModal(false)}
        >
          <BlurView intensity={50} tint="light" style={styles.modalBlur}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create New Event</Text>
              <TextInput
                style={styles.input}
                placeholder="Title"
                placeholderTextColor="rgba(0,0,0,0.6)"
                value={newTitle}
                onChangeText={setNewTitle}
              />
              <TextInput
                style={[styles.input, { height: 80 }]}
                placeholder="Description"
                placeholderTextColor="rgba(0,0,0,0.6)"
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
                  {formatEventDate(newDate.toISOString())}
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
              {newEventType !== 'online' && (
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
              )}
              <TextInput
                style={styles.input}
                placeholder="Age Range (optional)"
                placeholderTextColor="rgba(0,0,0,0.6)"
                value={newAgeRange}
                onChangeText={setNewAgeRange}
              />
              <TextInput
                style={styles.input}
                placeholder="Gender Preference (optional)"
                placeholderTextColor="rgba(0,0,0,0.6)"
                value={newGenderPreference}
                onChangeText={setNewGenderPreference}
              />
              <TouchableOpacity style={styles.publishButton} onPress={handlePublishEvent}>
                <Text style={styles.publishButtonText}>Publish</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Modal>
        <Modal
          isVisible={showLocationPickerModal}
          onBackdropPress={() => setShowLocationPickerModal(false)}
          style={styles.locationModal}
        >
          <BlurView intensity={50} tint="light" style={styles.modalBlur}>
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
          </BlurView>
        </Modal>
      </View>
    </LinearGradient>
  );
};

const primaryBlue = "#153b8e";
const secondaryOrange = "#eb9800";

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 10,
  },
  searchBar: {
    height: 45,
    margin: 10,
    borderColor: primaryBlue,
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 15,
    backgroundColor: "rgba(255,255,255,1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  viewFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderBottomWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: "rgba(240,240,240,0.8)",
    borderRadius: 50,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
  },
  viewButtonText: {
    fontSize: 14,
    color: '#333',
    padding: 5,
  },
  activeViewButtonText: {
    color: secondaryOrange,
  },
  viewIcon: {
    marginLeft: 5,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginHorizontal: 10,
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
  filterButton: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 50,
    padding: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  bottomModal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  fullWidthModal: {
    backgroundColor: "rgba(255,255,255,0.9)",
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkIconContainer: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  optionIcon: {
    marginRight: 6,
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
  map: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    padding: 12,
  },
  listItem: {
    padding: 12,
    borderBottomColor: "rgba(0,0,0,0.1)",
    borderBottomWidth: 1,
    backgroundColor: "rgba(255,255,255,1)",
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  listDescription: {
    fontSize: 14,
    color: '#555',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  bottomCardBlur: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    margin: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  closeButton: {
    fontSize: 16,
    color: secondaryOrange,
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: secondaryOrange,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  fabMenu: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: "rgba(255,255,255,1)",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabMenuItem: {
    padding: 10,
  },
  fabMenuText: {
    fontSize: 16,
    color: secondaryOrange,
  },
  modalContent: {
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    height: 45,
    borderColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  datePickerButton: {
    height: 45,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  datePickerText: {
    fontSize: 14,
    color: '#333',
  },
  publishButton: {
    backgroundColor: primaryBlue,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  pickerContainer: {
    borderColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  picker: {
    height: 50,
    width: '100%',
  },
  selectLocationButton: {
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "rgba(200,200,200,0.8)",
    borderRadius: 8,
    marginVertical: 8,
  },
  selectLocationText: {
    fontSize: 14,
    color: '#333',
  },
  locationModal: {
    margin: 0,
    justifyContent: 'center',
  },
  locationModalContent: {
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 16,
    borderRadius: 12,
    height: height * 0.6,
  },
  locationMap: { flex: 1, borderRadius: 12 },
  confirmLocationButton: {
    backgroundColor: primaryBlue,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  confirmLocationText: {
    color: '#fff',
    fontSize: 16,
  },
  modalBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default HomeScreen;