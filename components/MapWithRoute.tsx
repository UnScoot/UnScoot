import * as React from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import { getRoute, Coordinate } from '../src/utils/routingService';

interface MapWithRouteProps {
  origin: Coordinate;
  destination: Coordinate;
  originLabel?: string;
  destinationLabel?: string;
  hidePrice?: boolean; // Untuk driver - sembunyikan harga
  fixedPrice?: number; // Harga tetap dari order (untuk customer)
  fixedDistance?: number; // Jarak tetap dari order (untuk customer)
  onRouteCalculated?: (distanceKm: number, durationMinutes: number, price: number) => void;
}

const MapWithRoute: React.FC<MapWithRouteProps> = ({
  origin,
  destination,
  originLabel = 'Jemput',
  destinationLabel = 'Tujuan',
  hidePrice = false,
  fixedPrice,
  fixedDistance,
  onRouteCalculated
}) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [routeCoords, setRouteCoords] = React.useState<Coordinate[]>([]);
  const [routeInfo, setRouteInfo] = React.useState<{
    distanceKm: number;
    durationMinutes: number;
    price: number;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [webViewError, setWebViewError] = React.useState(false);
  const webViewRef = React.useRef<WebView>(null);
  
  // Track fetch state to prevent duplicate/overlapping requests
  const fetchingRef = React.useRef(false);
  const abortRef = React.useRef<AbortController | null>(null);

  // Stable coordinate strings for dependency comparison
  const originKey = origin ? `${origin.latitude},${origin.longitude}` : '';
  const destKey = destination ? `${destination.latitude},${destination.longitude}` : '';

  React.useEffect(() => {
    // Skip if coordinates are missing or invalid
    if (!origin || !destination) {
      console.log('[MapWithRoute] Waiting for coordinates...');
      return;
    }
    
    if (
      typeof origin.latitude !== 'number' || typeof origin.longitude !== 'number' ||
      typeof destination.latitude !== 'number' || typeof destination.longitude !== 'number' ||
      isNaN(origin.latitude) || isNaN(origin.longitude) ||
      isNaN(destination.latitude) || isNaN(destination.longitude)
    ) {
      console.error('[MapWithRoute] Invalid coordinates', { origin, destination });
      setError('Koordinat tidak valid');
      setIsLoading(false);
      return;
    }

    // Prevent duplicate requests
    if (fetchingRef.current) {
      console.log('[MapWithRoute] Already fetching, skipping duplicate request');
      return;
    }

    // Abort previous request if any
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    const fetchRoute = async () => {
      fetchingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('[MapWithRoute] Requesting route', { origin, destination });
        const result = await getRoute(origin, destination);
        
        // Check if component is still mounted/relevant
        if (abortRef.current?.signal.aborted) {
          console.log('[MapWithRoute] Request was aborted, ignoring result');
          return;
        }

        if (result.success) {
          setRouteCoords(result.polyline);
          setRouteInfo({
            distanceKm: result.distanceKm,
            durationMinutes: result.durationMinutes,
            price: result.price
          });
          
          if (onRouteCalculated) {
            onRouteCalculated(result.distanceKm, result.durationMinutes, result.price);
          }
          
          // Clear error if there was a fallback message
          if (result.error) {
            console.log('[MapWithRoute] Using fallback route:', result.error);
          }
        } else {
          console.warn('[MapWithRoute] getRoute failed:', result.error);
          setError(result.error || 'Gagal mengambil rute');
        }
      } catch (err) {
        if (!abortRef.current?.signal.aborted) {
          setError('Terjadi kesalahan');
          console.error('[MapWithRoute] Error:', err);
        }
      } finally {
        fetchingRef.current = false;
        setIsLoading(false);
      }
    };

    fetchRoute();

    return () => {
      // Cleanup on unmount or when coords change
      if (abortRef.current) {
        abortRef.current.abort();
      }
      fetchingRef.current = false;
    };
  // Use stable string keys instead of object properties to avoid stale closure issues
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originKey, destKey]);

  // Generate HTML for Leaflet map
  const generateMapHTML = () => {
    const centerLat = (origin.latitude + destination.latitude) / 2;
    const centerLng = (origin.longitude + destination.longitude) / 2;
    
    const routeCoordinatesJS = routeCoords
      .map(c => `[${c.latitude}, ${c.longitude}]`)
      .join(',');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { width: 100%; height: 100vh; }
          .info-box {
            position: absolute;
            bottom: 20px;
            left: 10px;
            right: 10px;
            background: white;
            padding: 12px 15px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 1000;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .info-label { color: #666; font-size: 12px; }
          .info-value { color: #333; font-weight: bold; font-size: 14px; }
          .price { color: #4CAF50; font-size: 18px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        ${routeInfo ? `
        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Jarak</span>
            <span class="info-value">${fixedDistance !== undefined ? fixedDistance.toFixed(2) : routeInfo.distanceKm.toFixed(2)} km</span>
          </div>
          <div class="info-row">
            <span class="info-label">Estimasi Waktu</span>
            <span class="info-value">${routeInfo.durationMinutes} menit</span>
          </div>
          ${!hidePrice ? `
          <div class="info-row">
            <span class="info-label">Tarif</span>
            <span class="price">Rp ${(fixedPrice !== undefined ? fixedPrice : routeInfo.price).toLocaleString('id-ID')}</span>
          </div>
          ` : ''}
        </div>
        ` : ''}
        <script>
          var map = L.map('map').setView([${centerLat}, ${centerLng}], 13);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
          }).addTo(map);
          
          // Origin marker (green)
          var originIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="background:#4CAF50;width:30px;height:30px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;box-shadow:0 2px 5px rgba(0,0,0,0.3);">A</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });
          
          // Destination marker (red)
          var destIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="background:#f44336;width:30px;height:30px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;box-shadow:0 2px 5px rgba(0,0,0,0.3);">B</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });
          
          L.marker([${origin.latitude}, ${origin.longitude}], {icon: originIcon})
            .addTo(map)
            .bindPopup('<b>${originLabel}</b>');
          
          L.marker([${destination.latitude}, ${destination.longitude}], {icon: destIcon})
            .addTo(map)
            .bindPopup('<b>${destinationLabel}</b>');
          
          ${routeCoords.length > 0 ? `
          // Draw route line (RED)
          var routeCoords = [${routeCoordinatesJS}];
          var polyline = L.polyline(routeCoords, {
            color: '#FF0000',
            weight: 5,
            opacity: 0.9
          }).addTo(map);
          
          // Fit map to show entire route
          map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
          ` : `
          // Fit to both markers
          var bounds = L.latLngBounds([
            [${origin.latitude}, ${origin.longitude}],
            [${destination.latitude}, ${destination.longitude}]
          ]);
          map.fitBounds(bounds, { padding: [50, 50] });
          `}
        </script>
      </body>
      </html>
    `;
  };

  // Generate static map URL sebagai fallback (OpenStreetMap Static)
  const getStaticMapUrl = () => {
    // Gunakan staticmap.openstreetmap.de untuk gambar statis
    const markers = `${origin.latitude},${origin.longitude},green-marker|${destination.latitude},${destination.longitude},red-marker`;
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${(origin.latitude + destination.latitude) / 2},${(origin.longitude + destination.longitude) / 2}&zoom=14&size=600x400&markers=${markers}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Mengambil rute...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: generateMapHTML() }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={false}
        originWhitelist={['*']}
        mixedContentMode="always"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('[MapWithRoute] WebView error:', nativeEvent);
          setWebViewError(true);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('[MapWithRoute] WebView HTTP error:', nativeEvent.statusCode);
        }}
        renderLoading={() => (
          <View style={styles.webviewLoading}>
            <ActivityIndicator size="small" color="#4CAF50" />
          </View>
        )}
        startInLoadingState={true}
      />
      {/* Fallback: tampilkan static map jika WebView error */}
      {webViewError && (
        <View style={styles.fallbackContainer}>
          <Image 
            source={{ uri: getStaticMapUrl() }} 
            style={styles.fallbackImage}
            resizeMode="cover"
          />
          {routeInfo && (
            <View style={styles.fallbackInfo}>
              <Text style={styles.fallbackText}>
                📍 {routeInfo.distanceKm.toFixed(1)} km • {routeInfo.durationMinutes} menit • Rp {routeInfo.price.toLocaleString('id-ID')}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  fallbackContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fallbackImage: {
    width: '100%',
    height: '100%',
  },
  fallbackInfo: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  fallbackText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff3f3',
    padding: 20,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default MapWithRoute;
