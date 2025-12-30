/**
 * Routing Service menggunakan OSRM (Open Source Routing Machine)
 * API Gratis - Tidak perlu API key
 * 
 * Pricing: Rp 5.000 per 1.5 km (dibulatkan ke atas)
 */

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  success: boolean;
  distance: number; // dalam meter
  distanceKm: number; // dalam kilometer
  duration: number; // dalam detik
  durationMinutes: number; // dalam menit
  price: number; // harga dalam rupiah
  polyline: Coordinate[]; // koordinat untuk gambar route
  error?: string;
}

// Base price configuration
const PRICE_PER_1_5_KM = 5000; // Rp 5.000 per 1.5 km
const KM_PER_UNIT = 1.5;

// Duration configuration: 1 km = 4 menit
const MINUTES_PER_KM = 4;

/**
 * Hitung durasi berdasarkan jarak
 * 1 km = 4 menit
 */
export const calculateDuration = (distanceKm: number): number => {
  if (distanceKm <= 0) return MINUTES_PER_KM; // Minimum 4 menit
  return Math.round(distanceKm * MINUTES_PER_KM);
};

/**
 * Hitung harga berdasarkan jarak
 * Rp 5.000 per 1.5 km, dibulatkan ke atas
 */
export const calculatePrice = (distanceKm: number): number => {
  if (distanceKm <= 0) return PRICE_PER_1_5_KM; // Minimum 1 unit
  
  const units = Math.ceil(distanceKm / KM_PER_UNIT);
  return units * PRICE_PER_1_5_KM;
};

/**
 * Hitung jarak langsung (straight line) menggunakan Haversine formula
 * Untuk estimasi cepat tanpa API call
 */
export const calculateStraightLineDistance = (
  origin: Coordinate,
  destination: Coordinate
): number => {
  const R = 6371; // Radius bumi dalam km
  const dLat = toRad(destination.latitude - origin.latitude);
  const dLon = toRad(destination.longitude - origin.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(origin.latitude)) * Math.cos(toRad(destination.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // 2 decimal places
};

const toRad = (value: number): number => {
  return (value * Math.PI) / 180;
};

/**
 * Get route dari OSRM (gratis, tanpa API key)
 * Mengembalikan jarak, durasi, harga, dan polyline untuk gambar route
 * 
 * Dengan retry + exponential backoff + fallback ke estimasi garis lurus
 */
export const getRoute = async (
  origin: Coordinate,
  destination: Coordinate
): Promise<RouteResult> => {
  // Retry configuration
  const maxRetries = 2;
  const baseTimeoutMs = 5000; // reduced timeout
  let lastError: any = null;

  // Validate coordinates early
  if (
    !origin || !destination ||
    typeof origin.latitude !== 'number' || typeof origin.longitude !== 'number' ||
    typeof destination.latitude !== 'number' || typeof destination.longitude !== 'number' ||
    isNaN(origin.latitude) || isNaN(origin.longitude) ||
    isNaN(destination.latitude) || isNaN(destination.longitude)
  ) {
    console.error('[RoutingService] Invalid coordinates', { origin, destination });
    return {
      success: false,
      distance: 0,
      distanceKm: 0,
      duration: 0,
      durationMinutes: 0,
      price: 0,
      polyline: [],
      error: 'Koordinat tidak valid'
    };
  }

  const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
  console.log('[RoutingService] getRoute start', { url });

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), baseTimeoutMs);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        console.warn('[RoutingService] OSRM HTTP not-ok', response.status);
        throw new Error(lastError);
      }

      const data = await response.json();

      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        lastError = data;
        console.warn('[RoutingService] OSRM returned no route or error', data);
        throw new Error('No route');
      }

      const route = data.routes[0];
      const distanceMeters = route.distance; // dalam meter
      const distanceKm = distanceMeters / 1000;
      const durationMinutes = calculateDuration(distanceKm);
      const durationSeconds = durationMinutes * 60;
      const price = calculatePrice(distanceKm);

      const polyline: Coordinate[] = route.geometry.coordinates.map(
        (coord: [number, number]) => ({ latitude: coord[1], longitude: coord[0] })
      );

      console.log('[RoutingService] Route found', { distanceKm, durationMinutes, price });

      return {
        success: true,
        distance: distanceMeters,
        distanceKm: Math.round(distanceKm * 100) / 100,
        duration: durationSeconds,
        durationMinutes,
        price,
        polyline
      };
    } catch (err: any) {
      lastError = err;
      const isAbort = err?.name === 'AbortError' || err?.code === 'ABORT_ERR';
      console.warn(`[RoutingService] getRoute attempt ${attempt} failed:`, isAbort ? 'Timeout' : err?.message || err);
      
      // exponential backoff before next attempt
      if (attempt < maxRetries) {
        const backoff = 300 * Math.pow(2, attempt); // 300ms, 600ms, ...
        await new Promise(res => setTimeout(res, backoff));
        continue;
      }
    }
  }

  // All attempts failed — fallback to straight-line estimate
  try {
    console.warn('[RoutingService] All OSRM attempts failed, using straight-line fallback');
    const distanceKm = calculateStraightLineDistance(origin, destination);
    const durationMinutes = calculateDuration(distanceKm);
    const price = calculatePrice(distanceKm);
    const polyline: Coordinate[] = [origin, destination];

    return {
      success: true, // success with estimated data
      distance: Math.round(distanceKm * 1000),
      distanceKm: Math.round(distanceKm * 100) / 100,
      duration: durationMinutes * 60,
      durationMinutes,
      price,
      polyline,
      error: 'Estimasi garis lurus (fallback)'
    };
  } catch (err) {
    console.error('[RoutingService] Fallback estimation failed', err);
    return {
      success: false,
      distance: 0,
      distanceKm: 0,
      duration: 0,
      durationMinutes: 0,
      price: 0,
      polyline: [],
      error: 'Gagal mengambil data rute'
    };
  }
};

/**
 * Geocoding: Convert address to coordinates using Nominatim (OpenStreetMap)
 * Gratis, tanpa API key
 * 
 * Includes fallback for common Solo/UNS locations
 */

// Hardcoded locations for common places in Solo
const KNOWN_LOCATIONS: { [key: string]: Coordinate } = {
  // UNS & sekitarnya
  'uns': { latitude: -7.5580, longitude: 110.8561 },
  'universitas sebelas maret': { latitude: -7.5580, longitude: 110.8561 },
  'kampus uns': { latitude: -7.5580, longitude: 110.8561 },
  'fkip uns': { latitude: -7.5576, longitude: 110.8513 },
  'fakultas teknik uns': { latitude: -7.5606, longitude: 110.8556 },
  'rektorat uns': { latitude: -7.5580, longitude: 110.8561 },
  'perpus uns': { latitude: -7.5585, longitude: 110.8558 },
  'mipa uns': { latitude: -7.5615, longitude: 110.8576 },
  
  // Stasiun
  'stasiun jebres': { latitude: -7.5664, longitude: 110.8323 },
  'statsiun jebres': { latitude: -7.5664, longitude: 110.8323 },
  'jebres': { latitude: -7.5664, longitude: 110.8323 },
  'stasiun solo jebres': { latitude: -7.5664, longitude: 110.8323 },
  'stasiun balapan': { latitude: -7.5677, longitude: 110.8181 },
  'solo balapan': { latitude: -7.5677, longitude: 110.8181 },
  'stasiun purwosari': { latitude: -7.5723, longitude: 110.7988 },
  
  // Terminal
  'terminal tirtonadi': { latitude: -7.5491, longitude: 110.8085 },
  'tirtonadi': { latitude: -7.5491, longitude: 110.8085 },
  
  // Mall & tempat umum
  'solo paragon': { latitude: -7.5744, longitude: 110.8154 },
  'paragon mall': { latitude: -7.5744, longitude: 110.8154 },
  'solo square': { latitude: -7.5716, longitude: 110.8063 },
  'solo grand mall': { latitude: -7.5709, longitude: 110.8214 },
  'hartono mall': { latitude: -7.5357, longitude: 110.8528 },
  
  // RS
  'rs moewardi': { latitude: -7.5562, longitude: 110.8474 },
  'rsud moewardi': { latitude: -7.5562, longitude: 110.8474 },
  'rs dr moewardi': { latitude: -7.5562, longitude: 110.8474 },
  
  // Kampus lain
  'isi solo': { latitude: -7.5527, longitude: 110.7997 },
  'isi surakarta': { latitude: -7.5527, longitude: 110.7997 },
  'unisri': { latitude: -7.5436, longitude: 110.8155 },
  'utp': { latitude: -7.5573, longitude: 110.7996 },
  'ums': { latitude: -7.5590, longitude: 110.7680 },
  'universitas muhammadiyah surakarta': { latitude: -7.5590, longitude: 110.7680 },
  
  // Cafe & Coffee Shop Solo
  'bento coffee': { latitude: -7.5608, longitude: 110.8515 },
  'bento kopi': { latitude: -7.5608, longitude: 110.8515 },
  'kopi klotok': { latitude: -7.5553, longitude: 110.8289 },
  'kopi toko djawa': { latitude: -7.5756, longitude: 110.8238 },
  'djawa coffee': { latitude: -7.5756, longitude: 110.8238 },
  'starbucks solo': { latitude: -7.5744, longitude: 110.8154 },
  'excelso solo paragon': { latitude: -7.5744, longitude: 110.8154 },
  'historica coffee': { latitude: -7.5713, longitude: 110.8218 },
  'kopi manis': { latitude: -7.5580, longitude: 110.8410 },
  'rolas coffee': { latitude: -7.5753, longitude: 110.8177 },
  'harvest coffee': { latitude: -7.5715, longitude: 110.8123 },
  'titik kumpul coffee': { latitude: -7.5570, longitude: 110.8520 },
  
  // Area
  'kentingan': { latitude: -7.5563, longitude: 110.8545 },
  'mojosongo': { latitude: -7.5436, longitude: 110.8528 },
  'nusukan': { latitude: -7.5466, longitude: 110.8203 },
  'kadipiro': { latitude: -7.5438, longitude: 110.7952 },
  'manahan': { latitude: -7.5648, longitude: 110.8075 },
  'sriwedari': { latitude: -7.5729, longitude: 110.8214 },
  'gladag': { latitude: -7.5694, longitude: 110.8249 },
  'pasar klewer': { latitude: -7.5727, longitude: 110.8285 },
  'laweyan': { latitude: -7.5752, longitude: 110.8021 },
  'pasar gede': { latitude: -7.5704, longitude: 110.8295 },
  'keraton solo': { latitude: -7.5775, longitude: 110.8269 },
  'keraton kasunanan': { latitude: -7.5775, longitude: 110.8269 },
  'alun alun utara': { latitude: -7.5737, longitude: 110.8264 },
  'alun alun kidul': { latitude: -7.5813, longitude: 110.8270 },
  
  // Wisata
  'taman balekambang': { latitude: -7.5662, longitude: 110.8099 },
  'taman sriwedari': { latitude: -7.5729, longitude: 110.8214 },
  'the heritage palace': { latitude: -7.5159, longitude: 110.7614 },
  'pandawa water world': { latitude: -7.5216, longitude: 110.8574 },
};

/**
 * Geocode menggunakan multiple free APIs untuk akurasi terbaik
 * 1. Photon (Komoot) - gratis unlimited
 * 2. Nominatim - fallback
 * 3. Photon with location bias - final fallback
 */
export const geocodeAddress = async (address: string): Promise<Coordinate | null> => {
  const normalizedAddress = address.toLowerCase().trim();
  
  console.log('[RoutingService] Geocoding address:', address);
  
  // Check known locations first (untuk lokasi populer Solo)
  for (const [key, coords] of Object.entries(KNOWN_LOCATIONS)) {
    if (normalizedAddress.includes(key) || key.includes(normalizedAddress)) {
      console.log('[RoutingService] Found in known locations:', key, coords);
      return coords;
    }
  }
  
  const searchQuery = `${address}, Indonesia`;
  
  // 1. Try Photon API (by Komoot) - GRATIS & UNLIMITED, cukup akurat
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=5&lang=en`;
    console.log('[RoutingService] Trying Photon API...');

    // Timeout for photon
    const photonController = new AbortController();
    const photonTimeout = setTimeout(() => photonController.abort(), 3000);
    const photonResponse = await fetch(photonUrl, { signal: photonController.signal });
    clearTimeout(photonTimeout);

    if (!photonResponse.ok) {
      console.warn('[RoutingService] Photon HTTP not-ok', photonResponse.status);
      throw new Error(`Photon HTTP ${photonResponse.status}`);
    }
    const photonData = await photonResponse.json();
    
    if (photonData.features && photonData.features.length > 0) {
      // Cari hasil yang paling relevan (prioritas Indonesia)
      let bestResult = photonData.features[0];
      for (const feature of photonData.features) {
        const country = feature.properties?.country;
        if (country === 'Indonesia') {
          bestResult = feature;
          break;
        }
      }
      
      const coords = bestResult.geometry.coordinates;
      const result = {
        latitude: coords[1],
        longitude: coords[0]
      };
      console.log('[RoutingService] Photon found:', result, '- Name:', bestResult.properties?.name || bestResult.properties?.street);
      return result;
    }
    console.log('[RoutingService] Photon returned no results');
  } catch (err: any) {
    const isAbort = err?.name === 'AbortError' || err?.code === 'ABORT_ERR';
    if (isAbort) {
      console.warn('[RoutingService] Photon request timed out');
    } else {
      console.error('[RoutingService] Photon error:', err?.message || err);
    }
  }
  
  // 2. Try Nominatim dengan parameter lebih baik
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1&countrycodes=id`;
    console.log('[RoutingService] Trying Nominatim API...');

    const nominatimController = new AbortController();
    const nominatimTimeout = setTimeout(() => nominatimController.abort(), 3000);
    const nominatimResponse = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'UnScoot/1.0' },
      signal: nominatimController.signal
    });
    clearTimeout(nominatimTimeout);

    if (!nominatimResponse.ok) {
      console.warn('[RoutingService] Nominatim HTTP not-ok', nominatimResponse.status);
      throw new Error(`Nominatim HTTP ${nominatimResponse.status}`);
    }

    const nominatimData = await nominatimResponse.json();

    if (nominatimData && nominatimData.length > 0) {
      // Pilih hasil dengan importance tertinggi
      const bestResult = nominatimData.reduce((best: any, current: any) => {
        return (current.importance > best.importance) ? current : best;
      }, nominatimData[0]);
      
      const result = {
        latitude: parseFloat(bestResult.lat),
        longitude: parseFloat(bestResult.lon)
      };
      console.log('[RoutingService] Nominatim found:', result, '- Display:', bestResult.display_name);
      return result;
    }

    console.log('[RoutingService] Nominatim returned no results');
  } catch (err: any) {
    const isAbort = err?.name === 'AbortError' || err?.code === 'ABORT_ERR';
    if (isAbort) {
      console.warn('[RoutingService] Nominatim request timed out');
    } else {
      console.error('[RoutingService] Nominatim error:', err?.message || err);
    }
  }
  
  // 3. Final fallback - coba tanpa "Indonesia" suffix dengan bias ke Solo
  try {
    const fallbackUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1&lat=-7.57&lon=110.82&location_bias_scale=0.5`;
    console.log('[RoutingService] Trying Photon with location bias (Solo area)...');

    const fallbackController = new AbortController();
    const fallbackTimeout = setTimeout(() => fallbackController.abort(), 3000);
    const fallbackResponse = await fetch(fallbackUrl, { signal: fallbackController.signal });
    clearTimeout(fallbackTimeout);

    if (!fallbackResponse.ok) {
      console.warn('[RoutingService] Photon (biased) HTTP not-ok', fallbackResponse.status);
      throw new Error(`Photon biased HTTP ${fallbackResponse.status}`);
    }

    const fallbackData = await fallbackResponse.json();
    
    if (fallbackData.features && fallbackData.features.length > 0) {
      const coords = fallbackData.features[0].geometry.coordinates;
      const result = {
        latitude: coords[1],
        longitude: coords[0]
      };
      console.log('[RoutingService] Photon (biased) found:', result);
      return result;
    }
  } catch (err: any) {
    const isAbort = err?.name === 'AbortError' || err?.code === 'ABORT_ERR';
    if (isAbort) {
      console.warn('[RoutingService] Photon (biased) request timed out');
    } else {
      console.error('[RoutingService] Fallback error:', err?.message || err);
    }
  }
  
  console.log('[RoutingService] All geocoding attempts failed');
  return null;
};

/**
 * Reverse Geocoding: Convert coordinates to address
 */
export const reverseGeocode = async (coordinate: Coordinate): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinate.latitude}&lon=${coordinate.longitude}`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'UnScoot/1.0' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    const data = await response.json();

    if (data && data.display_name) {
      return data.display_name;
    }

    return null;
  } catch (err: any) {
    const isAbort = err?.name === 'AbortError' || err?.code === 'ABORT_ERR';
    if (isAbort) {
      console.warn('[RoutingService] Reverse geocoding timed out');
    } else {
      console.error('[RoutingService] Reverse geocoding error:', err?.message || err);
    }
    return null;
  }
};
