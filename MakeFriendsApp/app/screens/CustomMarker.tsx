// CustomMarker.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getEventColor, getPersonColor } from './(protected)/helper';
import { MarkerType } from './(protected)/home'; // or adjust path accordingly

type CustomMarkerProps = {
  marker: MarkerType;
  scale: number; // computed marker size (in pixels)
};

const baseSize = 16; // The base size for scaling

const CustomMarker: React.FC<CustomMarkerProps> = ({ marker, scale }) => {
  // Choose the color using helper functions.
  const backgroundColor =
    marker.type === 'event'
      ? getEventColor(marker.eventType)
      : getPersonColor(marker.personMood);

  // Instead of setting width/height dynamically,
  // we keep a constant container size and apply a scale transform.
  const scaleFactor = scale / baseSize;

  return (
    <View style={[styles.markerContainer, { transform: [{ scale: scaleFactor }] }]}>
      <View style={[styles.marker, { backgroundColor }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    // Fixed size container; its size doesn't change.
    width: baseSize,
    height: baseSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: baseSize,
    height: baseSize,
    borderRadius: baseSize / 2,
    borderWidth: 1,
    borderColor: '#fff',
  },
});

export default CustomMarker;
