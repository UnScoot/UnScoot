import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface StaticMapDisplayProps {
  latitude1: number;
  longitude1: number;
  latitude2: number;
  longitude2: number;
  label1?: string;
  label2?: string;
}

/**
 * Simple static map display using text-based map representation
 * Fast alternative to WebView-based MapWithRoute for display-only purposes
 */
const StaticMapDisplay: React.FC<StaticMapDisplayProps> = ({
  latitude1,
  longitude1,
  latitude2,
  longitude2,
  label1 = 'Jemput',
  label2 = 'Tujuan'
}) => {
  // Calculate center point and distance info
  const centerLat = (latitude1 + latitude2) / 2;
  const centerLon = (longitude1 + longitude2) / 2;
  
  // Simple distance estimation (in km)
  const distance = Math.sqrt(
    Math.pow(latitude2 - latitude1, 2) + Math.pow(longitude2 - longitude1, 2)
  ) * 111; // 1 degree ≈ 111 km at equator

  return (
    <View style={styles.container}>
      {/* Visual map representation */}
      <View style={styles.mapVisualization}>
        {/* Route line */}
        <View style={styles.routeLine} />
        
        {/* Start marker */}
        <View style={styles.markerContainer}>
          <View style={[styles.marker, styles.startMarker]}>
            <Text style={styles.markerText}>📍</Text>
          </View>
          <Text style={styles.markerLabel}>{label1}</Text>
          <Text style={styles.markerCoord}>
            {latitude1.toFixed(4)}, {longitude1.toFixed(4)}
          </Text>
        </View>

        {/* Middle info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoDistance}>
            📏 ~{distance.toFixed(1)} km
          </Text>
        </View>

        {/* End marker */}
        <View style={[styles.markerContainer, styles.endMarkerContainer]}>
          <View style={[styles.marker, styles.endMarker]}>
            <Text style={styles.markerText}>📍</Text>
          </View>
          <Text style={styles.markerLabel}>{label2}</Text>
          <Text style={styles.markerCoord}>
            {latitude2.toFixed(4)}, {longitude2.toFixed(4)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 280,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  mapVisualization: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    position: 'relative',
  },
  routeLine: {
    position: 'absolute',
    left: 40,
    top: 60,
    bottom: 60,
    width: 2,
    backgroundColor: '#33cc66',
    opacity: 0.5,
  },
  markerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1,
  },
  endMarkerContainer: {
    justifyContent: 'flex-end',
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  startMarker: {
    backgroundColor: '#d4f8e8',
    borderColor: '#33cc66',
  },
  endMarker: {
    backgroundColor: '#ffe0e0',
    borderColor: '#FF6B6B',
  },
  markerText: {
    fontSize: 20,
  },
  markerLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Montserrat-Bold',
    fontWeight: '700',
    color: '#333',
  },
  markerCoord: {
    fontSize: 10,
    fontFamily: 'Montserrat-Regular',
    fontWeight: '500',
    color: '#999',
    textAlign: 'right',
  },
  infoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  infoDistance: {
    fontSize: 13,
    fontFamily: 'Montserrat-SemiBold',
    fontWeight: '600',
    color: '#33cc66',
  },
});

export default StaticMapDisplay;
