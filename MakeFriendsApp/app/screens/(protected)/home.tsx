import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Alert,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';

// Get the device's screen dimensions.
const { width, height } = Dimensions.get('window');

// Define the initial position for the map view.
const INITIAL_REGION = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// Define a TypeScript type for markers that can represent events or people.
type MarkerType = {
  id: string;
  type: 'event' | 'person'; // Indicates whether the marker is an event or a person.
  mood: string; // Friendship mood: Chat, Activity Partner, Business, or Open.
  coordinates: { latitude: number; longitude: number };
  title: string;
  description: string;
  date?: string;       // Optional: date of event
  image?: string;      // Optional: image of event
  eventType?: string;  // Optional: type of event
  personMood?: string; // Optional: mood for people
};

// Dummy marker data testing
const dummyMarkers: MarkerType[] = [
  {
    id: '1',
    type: 'event',
    mood: 'Chat',
    coordinates: { latitude: 48.575147, longitude: 7.752592 },
    title: 'Quick Chat Meetup',
    description: 'Join for a quick chat!',
    eventType: 'online',
  },
  {
    id: '2',
    type: 'event',
    mood: 'Activity Partner',
    coordinates: { latitude: 48.578962, longitude: 7.761605 },
    title: 'Hiking Adventure',
    description: 'Looking for a partner for a hike',
    eventType: 'sport',
  },
  {
    id: '3',
    type: 'person',
    mood: 'Business',
    coordinates: { latitude: 48.563107, longitude: 7.761999 },
    title: 'Jane Smith',
    description: 'Professional networking',
    personMood: 'professional',
  },
  {
    id: '4',
    type: 'person',
    mood: 'Open',
    coordinates: { latitude: 48.539024, longitude: 7.736038 },
    title: 'John Doe',
    description: 'Open to all connections',
    personMood: 'deep talk',
  },
];

const MainScreen = () => {
  // Friendship mood state from the top bar (default Open)
  const [selectedMood, setSelectedMood] = useState('Open');
  const [searchQuery, setSearchQuery] = useState('');
  // Filter the markers displayed on the map (initially all)
  const [filteredMarkers, setFilteredMarkers] = useState<MarkerType[]>(dummyMarkers);
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

  const router = useRouter();

  // Get user's location when the component mounts
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

  // Filter and sort markers whenever filter settings change
  useEffect(() => {
    // Filter by mood and search
    const filtered = dummyMarkers.filter(marker => {
      const matchesMood =
        selectedMood === 'Open' || marker.mood.toLowerCase() === selectedMood.toLowerCase();
      const matchesSearch =
        marker.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        marker.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesMood && matchesSearch;
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

    // Additional filter if filterOption is set (e.g., 'sport', 'online', etc.)
    if (filterOption) {
      sorted = sorted.filter(marker => {
        if (marker.type === 'event' && marker.eventType) {
          return marker.eventType.toLowerCase() === filterOption.toLowerCase();
        }
        return true;
      });
    }
    setFilteredMarkers(sorted);
  }, [selectedMood, searchQuery, sortOption, filterOption]);

  // Join event logic
  const handleJoinEvent = (marker: MarkerType) => {
    Alert.alert('Join Event', `You have joined the event: ${marker.title}`);
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

  return (
    <View style={styles.container}>
      {/* --- Top Friendship Mood Selector --- */}
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

      {/* --- Search Bar --- */}
      <TextInput
        style={styles.searchBar}
        placeholder="Search events or people..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* --- Bar with View Toggle and Filter Button --- */}
      <View style={styles.viewFilterBar}>
        {/* View Toggle: List and Map buttons */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.viewButton,
              viewMode === 'list' && styles.activeViewButton,
            ]}
            onPress={() => setViewMode('list')}
          >
            <Text
              style={[
                styles.viewButtonText,
                viewMode === 'list' && styles.activeViewButtonText,
              ]}
            >
              List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewButton,
              viewMode === 'map' && styles.activeViewButton,
            ]}
            onPress={() => setViewMode('map')}
          >
            <Text
              style={[
                styles.viewButtonText,
                viewMode === 'map' && styles.activeViewButtonText,
              ]}
            >
              Map
            </Text>
          </TouchableOpacity>
        </View>
        {/* Filter Icon Button */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilter(!showFilter)}
        >
          <Ionicons name="filter-circle-outline" size={32} />
        </TouchableOpacity>
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
            <Ionicons name="close-circle-outline" size={16} color="#333" style={styles.optionIcon} />
            <Text style={styles.optionText}>Aucun</Text>
          </TouchableOpacity>

          {/* Sort options */}
          <TouchableOpacity onPress={() => handleSort('alphabetical')} style={styles.modalOptionRow}>
            <Ionicons name="list-outline" size={16} color="#333" style={styles.optionIcon} />
            <Text style={styles.optionText}>Alphabetiquement</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort('oldest')} style={styles.modalOptionRow}>
            <Ionicons name="arrow-up-outline" size={16} color="#333" style={styles.optionIcon} />
            <Text style={styles.optionText}>Du + ancien au + récent</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleSort('newest')} style={styles.modalOptionRow}>
            <Ionicons name="arrow-down-outline" size={16} color="#333" style={styles.optionIcon} />
            <Text style={styles.optionText}>Du + récent au + ancien</Text>
          </TouchableOpacity>

          <Text style={[styles.modalTitle, { marginTop: 15 }]}>Filtrer</Text>
          {/* Filter options */}
          <TouchableOpacity onPress={() => handleFilter('sport')} style={styles.modalOptionRow}>
            <Ionicons name="football-outline" size={16} color="#333" style={styles.optionIcon} />
            <Text style={styles.optionText}>Sport</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleFilter('cultural')} style={styles.modalOptionRow}>
            <Ionicons name="color-palette-outline" size={16} color="#333" style={styles.optionIcon} />
            <Text style={styles.optionText}>Culturel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleFilter('activity')} style={styles.modalOptionRow}>
            <Ionicons name="briefcase-outline" size={16} color="#333" style={styles.optionIcon} />
            <Text style={styles.optionText}>Activité</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleFilter('online')} style={styles.modalOptionRow}>
            <Ionicons name="wifi-outline" size={16} color="#333" style={styles.optionIcon} />
            <Text style={styles.optionText}>En ligne</Text>
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
            showsUserLocation={true}
          >
            {filteredMarkers.map(marker => (
              <Marker
                key={marker.id}
                coordinate={marker.coordinates}
                pinColor={
                  marker.type === 'event'
                    ? getEventColor(marker.eventType)
                    : getPersonColor(marker.personMood)
                }
                onPress={() => setSelectedMarker(marker)}
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
              onPress={() => marker.type === 'event' && handleJoinEvent(marker)}
            >
              <Text style={styles.listTitle}>{marker.title}</Text>
              <Text style={styles.listDescription}>{marker.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* --- Bottom Card for Selected Marker --- */}
      {selectedMarker && (
        <View style={styles.bottomCard}>
          <Text style={styles.cardTitle}>{selectedMarker.title}</Text>
          <Text style={styles.cardDescription}>{selectedMarker.description}</Text>
          {selectedMarker.date && (
            <Text style={styles.cardInfo}>Date: {selectedMarker.date}</Text>
          )}
          <TouchableOpacity onPress={() => setSelectedMarker(null)}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// Helper Functions for Marker Colors
const getEventColor = (eventType?: string) => {
  switch (eventType) {
    case 'sport':
      return 'green';
    case 'cultural':
      return 'purple';
    case 'activity':
      return 'orange';
    case 'online':
      return 'blue';
    default:
      return 'red';
  }
};

const getPersonColor = (personMood?: string) => {
  switch (personMood) {
    case 'quick chat':
      return 'yellow';
    case 'deep talk':
      return 'brown';
    case 'professional':
      return 'gray';
    default:
      return 'black';
  }
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
    padding: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 3,
    marginRight: 5,
  },
  activeViewButton: {
    backgroundColor: '#4287f5',
    borderColor: '#4287f5',
  },
  viewButtonText: {
    fontSize: 12,
    color: '#333',
  },
  activeViewButtonText: {
    color: '#fff',
  },
  filterButton: {
    backgroundColor: '#fff',
    borderRadius: 50,
  },
  // react-native-modal bottom style
  bottomModal: {
    margin: 0,
    justifyContent: 'flex-end', // to appear from bottom
  },
  fullWidthModal: {
    backgroundColor: '#fff',
    width: '100%',       // take full width
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',    // optional limit
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
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
});

export default MainScreen;
