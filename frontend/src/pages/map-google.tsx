import { useEffect, useRef, useState } from 'react';

import { Loader } from '@googlemaps/js-api-loader';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/navbar';
import Links from '../components/links';
import { Heart, Mic, MicOff, Star, TicketPercent } from 'lucide-react';
import LocalAiChatPopup from '../components/localAiChatPopup';
import LocationReviewsPopup from '../components/locationReviewsPopup';
import { enqueueAlert } from '../components/alerts';
import {
  serializeBusinessHours,
  serializeSocials,
  type SocialLink,
} from '../utils/tomtomPoiDetails';

// Reuses the app's existing shared types where possible.
interface Business {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
  category: string[];
  score: number;
  classifications: any[];
  imageUrl?: string;
  lid?: number;
  phone?: string;
  email?: string;
  website?: string;
  businessHours?: string[];
  socials?: SocialLink[];
}

interface Location {
  lid: number;
  name: string;
  longitude: number;
  latitude: number;
  type: number;
  address?: string;
  categories?: string[];
  time?: string;
  phone?: string;
  email?: string;
  website?: string;
  businessHours?: string[];
  socials?: SocialLink[];
}

type PoiOpenFilter = 'all' | 'open' | 'closed';
type PoiCouponFilter = 'all' | 'with' | 'without';

interface RouteInstruction {
  maneuverType: string;
  streetName: string;
  message: string;
  distance: number;
  time: number;
  point: { lng: number; lat: number };
}

interface RouteInfo {
  name: string;
  lat: number;
  lng: number;
  miles: string;
  mins: number;
  instructions: RouteInstruction[];
  currentInstruction: number;
}

interface PoiListItem {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  icon: string;
  type: string;
  categories: string[];
  distanceMeters: number;
  rating?: number;
  isOpenNow?: boolean;
  hasCoupon: boolean;
  phone?: string;
  email?: string;
  website?: string;
  businessHours?: string[];
  socials?: SocialLink[];
}

const POI_GROUPS = [
  {
    name: 'Automotive',
    color: 'bg-orange-500',
    items: [
      { id: 'gas', type: 'gas_station', label: 'Gas Station', icon: '⛽' },
      { id: 'parking', type: 'parking', label: 'Parking', icon: '🅿️' },
      { id: 'repair', type: 'car_repair', label: 'Repair', icon: '🔧' },
      { id: 'rental', type: 'car_rental', label: 'Car Rental', icon: '🚗' },
    ],
  },
  {
    name: 'Food & Drink',
    color: 'bg-red-500',
    items: [
      { id: 'restaurant', type: 'restaurant', label: 'Restaurant', icon: '🍽️' },
      { id: 'cafe', type: 'cafe', label: 'Cafe / Pub', icon: '☕' },
      { id: 'winery', type: 'liquor_store', label: 'Winery', icon: '🍷' },
    ],
  },
];

const metersToMiles = (meters: number) => meters * 0.000621371;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const getStarFillPercent = (value: number, star: number): number => {
  const raw = value - (star - 1);
  if (raw <= 0) return 0;
  if (raw >= 1) return 100;
  return raw * 100;
};

/* LocationDetailBlock removed (unused) */

const MapGoogle = () => {
  const mapElement = useRef<HTMLDivElement>(null);
  // Avoid referencing the `google` namespace in types (TS namespace issues).
  const mapRef = useRef<any>(null);
  // Use `any` types for Google objects to avoid TS namespace issues during loader-based init.
  const markersRef = useRef<any[]>([]);
  const poiMarkersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);


  const [user, setUser] = useState<{ uid: number; username: string } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const [userLoc, setUserLoc] = useState({ lat: 34.0731, lng: -118.4016 });
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const [stats, setStats] = useState<RouteInfo | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState(false);
  const [navStep, setNavStep] = useState(0);
  const [showFullDirections, setShowFullDirections] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState<Business | null>(null);

  const [poiRadiusFilter] = useState<'5' | '10' | '20'>('20');


  const [poiMinRating, setPoiMinRating] = useState<number>(0);
  const [poiOpenFilter, setPoiOpenFilter] = useState<PoiOpenFilter>('all');
  const [poiCouponFilter, setPoiCouponFilter] = useState<PoiCouponFilter>('all');
  const [activePoiType, setActivePoiType] = useState<string | null>(null);

    const [showSidebar, setShowSidebar] = useState(false);
    const [favoriteLocations, setFavoriteLocations] = useState<Location[]>([]);
    const [loadingFavorites, setLoadingFavorites] = useState(false);
    const [poiResults, setPoiResults] = useState<PoiListItem[]>([]);

  // Keep structure compatible with the legacy map page; coupon key tracking removed (unused) to satisfy strict TS.


  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isVoiceSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const speechRecognitionRef = useRef<any>(null);
  const speechToTextSupportedRef = useRef(false);

  const latestFinalSpeechRef = useRef('');
  const speechDraftRef = useRef('');
  const speechHadFinalRef = useRef(false);
  const speechToTextListeningRef = useRef(false);

  const voiceSpeakTimeoutRef = useRef<number | null>(null);
  const isNavigatingRef = useRef(false);
  const activeRouteRef = useRef<RouteInfo | null>(null);
  const lastSpokenInstructionRef = useRef<string | null>(null);

  const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.PUBLIC_GOOGLE_MAPS_API_KEY;
  const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5173';

  useEffect(() => {
    isNavigatingRef.current = isNavigating;
  }, [isNavigating]);

  useEffect(() => {
    activeRouteRef.current = stats;
  }, [stats]);

  const showToastNotice = (message: string, isError = false) => {
    enqueueAlert({ message, textColor: isError ? 'text-red-300' : 'text-green-300' });
  };

  const clearMap = (preservePoi = false) => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (!preservePoi) {
      poiMarkersRef.current.forEach((m) => m.setMap(null));
      poiMarkersRef.current = [];
      setPoiResults([]);
      setActivePoiType(null);
    }
  };

  const cancelNavigation = () => {
    if (voiceSpeakTimeoutRef.current !== null) {
      window.clearTimeout(voiceSpeakTimeoutRef.current);
      voiceSpeakTimeoutRef.current = null;
    }
    if (isVoiceSupported) window.speechSynthesis.cancel();
    setIsNavigating(false);
    setNavStep(0);
    setShowFullDirections(false);
    setStats(null);
  };

  const buildVoiceInstruction = (
    instruction: RouteInstruction | undefined,
    destinationName: string | undefined,
    stepIndex: number,
    totalSteps: number
  ): string | null => {
    if (!instruction) return null;
    const stepLabel = `Step ${stepIndex + 1} of ${totalSteps}.`;
    const cleanedMessage = (instruction.message || instruction.streetName || 'Continue').replace(/[•]/g, '').replace(/\s+/g, ' ').trim();
    if (instruction.maneuverType?.toLowerCase() === 'arrive') {
      return `${stepLabel} You are arriving at ${destinationName || 'your destination'}.`;
    }
    return `${stepLabel} ${cleanedMessage}.`;
  };

  const pickBestVoice = (): SpeechSynthesisVoice | null => {
    if (!isVoiceSupported) return null;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;
    const preferredNames = ['Google US English', 'Alex', 'Samantha'];
    return (
      voices.find((voice) => preferredNames.includes(voice.name)) ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith('en-us')) ||
      voices[0]
    );
  };

  // Boot: auth profile + favorites
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${AUTH_BASE_URL}/auth/dashboard`, { credentials: 'include' });
        if (!response.ok) return navigate('/login');
        const data = await response.json();
        setUser(data);
      } catch {
        navigate('/login');
      }
    };
    void fetchProfile();
  }, [navigate, AUTH_BASE_URL]);

  // Saved coupon meta keys (used for coupon badges)
  useEffect(() => {
    // (Removed unused coupon meta tracking to satisfy strict TS.)
  }, [user?.uid]);


  const fetchFavoriteLocations = async () => {
    setLoadingFavorites(true);
    try {
      const response = await fetch('http://localhost:5173/loc/favorites', { credentials: 'include' });
      if (!response.ok) return setFavoriteLocations([]);
      const data = await response.json();
      setFavoriteLocations(data);
    } catch {
      setFavoriteLocations([]);
    } finally {
      setLoadingFavorites(false);
    }
  };

  useEffect(() => {
    if (user) void fetchFavoriteLocations();
  }, [user]);

  // Speech recognition (kept from existing page so UI stays functional)
  useEffect(() => {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      speechToTextSupportedRef.current = false;
      return;
    }
    speechToTextSupportedRef.current = true;

    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      latestFinalSpeechRef.current = '';
      speechDraftRef.current = '';
      speechHadFinalRef.current = false;
      speechToTextListeningRef.current = true;
    };

    recognition.onresult = (event: any) => {
      const results = event?.results;
      const total = typeof results?.length === 'number' ? results.length : 0;
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < total; i += 1) {
        const result = results[i];
        if (!result || typeof result.length !== 'number') continue;
        const transcript = `${result[0]?.transcript || ''}`.trim();
        if (!transcript) continue;
        if (result.isFinal) finalText = `${finalText} ${transcript}`.trim();
        else interimText = `${interimText} ${transcript}`.trim();
      }
      const combinedText = finalText || interimText;
      if (combinedText) {
        speechDraftRef.current = combinedText;
        setInputValue(combinedText);
      }
      if (finalText) {
        latestFinalSpeechRef.current = finalText;
        speechHadFinalRef.current = true;
        void runSearchByQuery(finalText);
      }
    };

    recognition.onerror = (event: any) => {
      speechToTextListeningRef.current = false;
      const code = `${event?.error || ''}`.toLowerCase();
      if (code === 'no-speech') showToastNotice('No speech detected. Try again.', true);
      else if (code.includes('not-allowed')) showToastNotice('Microphone permission blocked.', true);
      else showToastNotice('Voice input failed. Try again.', true);
    };

    recognition.onend = () => {
      speechToTextListeningRef.current = false;
      const draft = speechDraftRef.current.trim();
      if (!speechHadFinalRef.current && draft) setInputValue(draft);
    };

    recognition.onnomatch = () => showToastNotice('Could not understand that voice input.', true);

    speechRecognitionRef.current = recognition;
    return () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      speechRecognitionRef.current = null;
    };
  }, []);

  const toggleSpeechToText = () => {
    if (!speechToTextSupportedRef.current || !speechRecognitionRef.current) {
      showToastNotice('Speech-to-text is not supported on this browser.', true);
      return;
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      showToastNotice('Voice input requires HTTPS (or localhost).', true);
      return;
    }

    if (speechToTextListeningRef.current) {
      speechRecognitionRef.current.stop();
      return;
    }

    try {
      speechRecognitionRef.current.abort?.();
      speechRecognitionRef.current.start();
    } catch {
      showToastNotice('Unable to start microphone input right now.', true);
    }
  };

  // Google Map init
  useEffect(() => {
    if (!mapElement.current) return;
    if (!GOOGLE_KEY) {
      setMapError('Google Maps API key is missing. Set VITE_GOOGLE_MAPS_API_KEY in your .env file.');
      return;
    }

    const loader = new Loader({ apiKey: GOOGLE_KEY, version: 'weekly' });

    let canceled = false;
    const init = async () => {
      try {
        // `@googlemaps/js-api-loader` has had slight API/type differences across versions.
        // Call via `any` to avoid TS method-not-found errors.
        const anyLoader = loader as any;
        if (typeof anyLoader.load === 'function') {
          await anyLoader.load();
        } else if (typeof anyLoader.importLibrary === 'function') {
          // Minimal fallback: ensure maps library is loaded.
          await anyLoader.importLibrary('maps');
        } else {
          throw new Error('Google Maps loader missing load/importLibrary method.');
        }

        const googleNs = (window as any).google as any;

        if (canceled) return;

        const map = new googleNs.maps.Map(mapElement.current!, {
          center: { lat: userLoc.lat, lng: userLoc.lng },
          zoom: 13,
          mapId: undefined,
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#0b1220' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
          ],
          disableDefaultUI: true,
          zoomControl: true,
        });

        mapRef.current = map;

        directionsRendererRef.current = new googleNs.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: { strokeColor: '#3F92FF', strokeWeight: 6, strokeOpacity: 0.9 },
        });
        directionsRendererRef.current.setMap(map);

        setMapLoaded(true);
        setMapError(null);

        // user marker
        const um = new googleNs.maps.Marker({
          position: { lat: userLoc.lat, lng: userLoc.lng },
          map,
          icon: {
            path: googleNs.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#3F92FF',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });
        userMarkerRef.current = um;

        // click -> select destination (place details not implemented yet)
        map.addListener('click', (e: any) => {
          if (!e?.latLng) return;
          cancelNavigation();
          setSelectedLocation({
            name: 'Selected Location',
            address: 'Unknown Location',
            latitude: e.latLng.lat(),
            longitude: e.latLng.lng(),
            distance_meters: 0,
            category: [],
            score: 0,
            classifications: [],
            imageUrl: undefined,
          });
        });

        // geolocation
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setUserLoc(coords);
              map.setCenter(coords);
              if (userMarkerRef.current) userMarkerRef.current.setPosition(coords);
            },
            () => {}
          );

          navigator.geolocation.watchPosition(
            (pos) => {
              const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setUserLoc(coords);
              if (userMarkerRef.current) userMarkerRef.current.setPosition(coords);
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
          );
        }
      } catch (e: any) {
        setMapError('Failed to load Google Maps. Check your API key.');
      }
    };

    void init();
    return () => {
      canceled = true;
    };
  }, [GOOGLE_KEY]);

  // Route from URL params (same pattern as original)
  useEffect(() => {
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    if (!lat || !lon || !mapLoaded) return;
    const destLat = parseFloat(lat);
    const destLng = parseFloat(lon);
    if (Number.isNaN(destLat) || Number.isNaN(destLng)) return;

    const nameParam = searchParams.get('name');
    const addressParam = searchParams.get('address');
    const routeName = nameParam?.trim() || addressParam?.trim() || 'Destination';

    void calculateRoute(destLat, destLng, routeName, false);
  }, [mapLoaded, searchParams]);

  const calculateRoute = async (
    dLat: number,
    dLng: number,
    name: string,
    autoStart = false,
  ): Promise<RouteInfo | null> => {
    if (!mapRef.current || !directionsRendererRef.current) return null;

    try {
      const googleNs = (window as any).google as any;
      const ds = new googleNs.maps.DirectionsService();

      const request = {
        origin: { lat: userLoc.lat, lng: userLoc.lng },
        destination: { lat: dLat, lng: dLng },
        travelMode: googleNs.maps.TravelMode.DRIVING,
      };

      const result = await new Promise<any>((resolve, reject) => {
        ds.route(request, (res: any, status: string) => {
          if (status === 'OK' && res) resolve(res);
          else reject(new Error(status));
        });
      });

      directionsRendererRef.current.setDirections(result);

      const route = result.routes?.[0];
      const leg = route?.legs?.[0];

      const steps = leg?.steps || [];
      const instructions: RouteInstruction[] = steps.map((s: any) => {
        const start = s.start_location;
        return {
          maneuverType: 'turn',
          streetName: '',
          message: s.instructions ? s.instructions.replace(/<[^>]+>/g, '') : 'Continue',
          distance: s.distance?.value || 0,
          time: s.duration?.value || 0,
          point: { lng: start.lng(), lat: start.lat() },
        };
      });

      if (instructions.length === 0) {
        instructions.push({
          maneuverType: 'depart',
          streetName: 'Start',
          message: `Head towards ${name}`,
          distance: 0,
          time: 0,
          point: { lng: userLoc.lng, lat: userLoc.lat },
        });
        instructions.push({
          maneuverType: 'arrive',
          streetName: name,
          message: `You have arrived at ${name}`,
          distance: 0,
          time: 0,
          point: { lng: dLng, lat: dLat },
        });
      }

      const totalDistanceM = leg?.distance?.value || 0;
      const totalTimeS = leg?.duration?.value || 0;

      const routeInfo: RouteInfo = {
        name,
        lat: dLat,
        lng: dLng,
        miles: totalDistanceM > 0 ? (metersToMiles(totalDistanceM) * 1).toFixed(1) : '0',
        mins: totalTimeS > 0 ? Math.round(totalTimeS / 60) : 0,
        instructions,
        currentInstruction: 0,
      };

      setStats(routeInfo);

      if (autoStart) {
        setIsNavigating(true);
        setNavStep(0);
        setShowFullDirections(false);
      }

      return routeInfo;
    } catch {
      const fallbackRoute: RouteInfo = {
        name,
        lat: dLat,
        lng: dLng,
        miles: '0',
        mins: 0,
        instructions: [
          {
            maneuverType: 'arrive',
            streetName: name,
            message: `Navigate to ${name}`,
            distance: 0,
            time: 0,
            point: { lng: dLng, lat: dLat },
          },
        ],
        currentInstruction: 0,
      };
      setStats(fallbackRoute);
      if (autoStart) setIsNavigating(true);
      return fallbackRoute;
    }
  };

  // (startNavigation removed - unused in this interim Google maps implementation.)

  const nextNavStep = () => {
    if (!stats) return;
    const ni = clamp(navStep + 1, 0, stats.instructions.length - 1);
    setNavStep(ni);
  };

  const prevNavStep = () => {
    if (!stats) return;
    const ni = clamp(navStep - 1, 0, stats.instructions.length - 1);
    setNavStep(ni);
  };

  const jumpToStep = (idx: number) => {
    if (!stats?.instructions?.[idx]) return;
    setNavStep(idx);
  };

  // Voice guidance
  useEffect(() => {
    if (!voiceGuidanceEnabled || !isNavigating || !stats || !isVoiceSupported) return;
    const text = buildVoiceInstruction(stats.instructions[navStep], stats.name, navStep, stats.instructions.length);
    if (!text) return;
    if (lastSpokenInstructionRef.current === text) return;
    lastSpokenInstructionRef.current = text;

    if (voiceSpeakTimeoutRef.current !== null) window.clearTimeout(voiceSpeakTimeoutRef.current);

    voiceSpeakTimeoutRef.current = window.setTimeout(() => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickBestVoice();
      if (voice) utterance.voice = voice;
      utterance.lang = 'en-US';
      utterance.rate = 0.92;
      utterance.pitch = 1.03;
      utterance.volume = 0.96;
      window.speechSynthesis.speak(utterance);
    }, 160);

    return () => {
      if (voiceSpeakTimeoutRef.current !== null) {
        window.clearTimeout(voiceSpeakTimeoutRef.current);
        voiceSpeakTimeoutRef.current = null;
      }
    };
  }, [voiceGuidanceEnabled, isNavigating, stats, navStep, isVoiceSupported]);

  useEffect(() => {
    return () => {
      if (voiceSpeakTimeoutRef.current !== null) window.clearTimeout(voiceSpeakTimeoutRef.current);
      if (isVoiceSupported) window.speechSynthesis.cancel();
    };
  }, [isVoiceSupported]);

  const matchesPoiFilters = (poi: PoiListItem) => {
    const miles = metersToMiles(poi.distanceMeters);
    const maxMiles = poiRadiusFilter === '5' ? 5 : poiRadiusFilter === '10' ? 10 : 20;
    if (miles > maxMiles) return false;
    if (poiMinRating > 0) {
      if (typeof poi.rating !== 'number' || poi.rating < poiMinRating) return false;
    }
    if (poiOpenFilter === 'open' && poi.isOpenNow !== true) return false;
    if (poiOpenFilter === 'closed' && poi.isOpenNow !== false) return false;
    if (poiCouponFilter === 'with' && !poi.hasCoupon) return false;
    if (poiCouponFilter === 'without' && poi.hasCoupon) return false;
    return true;
  };

  const filteredPoiResults = poiResults.filter(matchesPoiFilters);

  const runSearchByQuery = async (queryRaw: string) => {
    const query = queryRaw.trim();
    if (!query || !mapRef.current) return;

    const googleNs = (window as any).google as any;
    const svc = new googleNs.maps.places.PlacesService(mapRef.current);

    // Keep it functional: use textSearch.
    svc.textSearch(
      {
        query,
        location: { lat: userLoc.lat, lng: userLoc.lng },
        radius: 5000,
      },
      (results: any, status: string) => {
        if (status !== 'OK' || !Array.isArray(results)) {
          setSuggestions([]);
          return;
        }
        setSuggestions(results.slice(0, 6));
      }
    );
  };

  const handleSearch = async () => {
    await runSearchByQuery(inputValue);
  };

  const handleSelectSuggestion = (place: any) => {
    const geometry = place.geometry?.location;
    if (!geometry) return;
    cancelNavigation();
    setSelectedLocation({
      name: place.name || 'Selected Location',
      address: place.formatted_address || place.vicinity || 'Unknown Location',
      latitude: geometry.lat(),
      longitude: geometry.lng(),
      distance_meters: 0,
      category: [],
      score: 0,
      classifications: [],
      businessHours: undefined,
      socials: undefined,
    });

    // Marker + route
    const pos = { lat: geometry.lat(), lng: geometry.lng() };
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const googleNs = (window as any).google as any;
    const marker = new googleNs.maps.Marker({
      position: pos,
      map: mapRef.current!,
      icon: {
        path: googleNs.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: '#3F92FF',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });
    markersRef.current.push(marker);

    void calculateRoute(pos.lat, pos.lng, place.name || 'Destination', false);
    setSuggestions([]);
  };

  const buildMapRouteUrl = (loc: Location | Business) => {
    const params = new URLSearchParams({
      lat: String(loc.latitude),
      lon: String(loc.longitude),
      name: loc.name || '',
      address: loc.address || '',
    });
    if (loc.phone) params.set('phone', loc.phone);
    if (loc.email) params.set('email', loc.email);
    if (loc.website) params.set('website', loc.website);

    const serializedHours = serializeBusinessHours((loc as any).businessHours);
    if (serializedHours) params.set('businessHours', serializedHours);

    const serializedSocials = serializeSocials((loc as any).socials);
    if (serializedSocials) params.set('socials', serializedSocials);

    return `/map?${params.toString()}`;
  };

  // Minimal POI search: Places nearbySearch with keyword = active category.
  const searchPoi = async (type: string, icon: string) => {
    if (!mapRef.current) return;
    cancelNavigation();
    clearMap(true);

    setActivePoiType(type);
    setPoiResults([]);

    const googleNs = (window as any).google as any;
    const svc = new googleNs.maps.places.PlacesService(mapRef.current);

    const maxMiles = poiRadiusFilter === '5' ? 5 : poiRadiusFilter === '10' ? 10 : 20;
    const radiusMeters = maxMiles * 1609.34;

    svc.nearbySearch(
      {
        location: { lat: userLoc.lat, lng: userLoc.lng },
        radius: radiusMeters,
        keyword: type.replace(/_/g, ' '),
      },
      (results: any[], status: string) => {
        if (status !== 'OK' || !Array.isArray(results)) {
          setPoiResults([]);
          return;
        }

        // Build POI entries
        const next: PoiListItem[] = results
          .slice(0, 40)
          .map((r, idx) => {
            const loc = r.geometry?.location;
            if (!loc) return null;
            const lat = loc.lat();
            const lng = loc.lng();
            const distMeters = 0; // (optional) compute later
            return {
              id: `${type}-${idx}-${lat}-${lng}`,
              name: r.name || type,
              address: r.vicinity || r.formatted_address || 'Unknown',
              lat,
              lng,
              icon,
              type,
              categories: [type],
              distanceMeters: distMeters,
              rating: typeof r.rating === 'number' ? r.rating : undefined,
              isOpenNow: undefined,
              hasCoupon: false,
              phone: undefined,
              email: undefined,
              website: undefined,
              businessHours: undefined,
              socials: undefined,
            };
          })
          .filter(Boolean) as PoiListItem[];

        // Add markers
        poiMarkersRef.current.forEach((m) => m.setMap(null));
        poiMarkersRef.current = [];

        const markers = next.map((poi) =>
          new googleNs.maps.Marker({
            position: { lat: poi.lat, lng: poi.lng },
            map: mapRef.current!,
            label: { text: poi.icon, color: '#fff' },
          })
        );

        poiMarkersRef.current = markers;
        setPoiResults(next);
      }
    );
  };

  // Voice card
  const navigationCard =
    isNavigating && stats && stats.instructions?.length > 0 ? (
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-neutral-900/98 border border-neutral-800 rounded-2xl w-80 z-[2000] shadow-2xl max-h-[50vh] overflow-hidden">
        <div className="flex justify-between items-center p-3 px-4 border-b border-neutral-800">
          <div className="flex items-center text-white gap-2.5 text-sm">
            <span className="text-2xl">📍</span>
            <div>
              <h4 className="m-0 text-cyan-500 text-md">{stats.name}</h4>
              <p className="m-0 mt-0.5 text-gray-400 text-[11px]">
                {stats.miles} mi • {stats.mins} min
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`group inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-full cursor-pointer text-[11px] font-semibold transition-all ${
                voiceGuidanceEnabled
                  ? 'border-cyan-300/80 bg-cyan-500/25 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.25)]'
                  : 'border-neutral-700 bg-neutral-800/90 text-neutral-300 hover:border-cyan-500/40 hover:text-cyan-200'
              }`}
              onClick={() => {
                if (!isVoiceSupported) {
                  showToastNotice('Voice guidance not supported on this browser.', true);
                  return;
                }
                setVoiceGuidanceEnabled((prev) => {
                  const next = !prev;
                  if (!next) window.speechSynthesis.cancel();
                  lastSpokenInstructionRef.current = null;
                  return next;
                });
              }}
              title="Toggle live voice instructions"
            >
              {voiceGuidanceEnabled ? 'Voice On' : 'Voice Off'}
            </button>
            <button className="border-none text-cyan-500 w-7 h-7 rounded-full cursor-pointer text-sm hover:bg-white/5" onClick={cancelNavigation}>
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 bg-gradient-to-br from-[#3F92FF1A] to-[#2F75D90D]">
          <div className="rounded-lg border border-cyan-400/20 bg-black/20 px-3 py-2">
            <p className="m-0 text-cyan-300 text-xs font-semibold">Step {navStep + 1}</p>
            <p className="m-0 mt-1 text-white text-sm font-bold">
              {stats.instructions[navStep]?.streetName || stats.instructions[navStep]?.message || 'Unknown'}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center p-2.5 px-4 border-t border-neutral-800">
          <button
            className="bg-neutral-800 border-none text-white py-2 px-4 rounded-lg cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-700"
            onClick={prevNavStep}
            disabled={navStep === 0}
          >
            ◀
          </button>
          <span className="text-gray-400 text-xs">
            {navStep + 1} / {stats.instructions.length}
          </span>
          <button
            className="bg-neutral-800 border-none text-white py-2 px-4 rounded-lg cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-700"
            onClick={nextNavStep}
            disabled={navStep >= stats.instructions.length - 1}
          >
            ▶
          </button>
        </div>

        <div
          className="text-center p-2.5 text-cyan-500 cursor-pointer text-xs border-t border-neutral-800 hover:bg-white/5"
          onClick={() => setShowFullDirections((v) => !v)}
        >
          {showFullDirections ? '▲ Hide all steps' : '▼ Show all steps'}
        </div>

        {showFullDirections && (
          <div className="max-h-[150px] overflow-y-auto border-t border-neutral-800">
            {stats.instructions.map((inst, idx) => (
              <div
                key={idx}
                className={`p-2.5 px-4 cursor-pointer border-b border-neutral-800 hover:bg-white/5 ${
                  idx === navStep ? 'bg-[#3F92FF26] border-l-[3px] border-l-[#3F92FF]' : ''
                } ${idx < navStep ? 'opacity-50' : ''}`}
                onClick={() => jumpToStep(idx)}
              >
                <p className="m-0 text-white text-xs">
                  <span className="text-cyan-300 font-semibold mr-2">#{idx + 1}</span>
                  {inst.streetName || inst.message || 'Unknown'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  : null;

  const showError = mapError ? (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-neutral-900/98 border border-red-500 rounded-xl p-8 max-w-[420px] text-center z-[3000]">
      <div className="text-[40px] mb-4">⚠️</div>
      <h3 className="text-red-500 m-0 mb-2.5">Map Error</h3>
      <p className="text-gray-300 m-0 mb-5 leading-relaxed">{mapError}</p>
    </div>
  ) : null;

  const searchOverlay = (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 translate-y-20 w-[90%] max-w-[320px] z-[1000]">
      <div className="bg-neutral-900/95 border border-neutral-800 rounded-xl overflow-hidden shadow-lg">
        <div className="flex items-center p-2 px-3 gap-2">
          <input
            className="flex-1 border-none bg-transparent text-white text-sm outline-none placeholder-neutral-500"
            placeholder="Search location..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSearch();
            }}
          />
          {inputValue && (
            <button
              className="bg-transparent border-none text-slate-400 cursor-pointer text-lg p-1 px-2 hover:text-white"
              onClick={() => setInputValue('')}
            >
              x
            </button>
          )}
          <button
            className={`border-none p-2 rounded-lg cursor-pointer text-sm transition-colors ${
              speechToTextListeningRef.current
                ? 'bg-red-500/30 text-red-200 hover:bg-red-500/40'
                : speechToTextSupportedRef.current
                ? 'bg-neutral-800 text-cyan-300 hover:bg-neutral-700'
                : 'bg-neutral-800/60 text-neutral-500 cursor-not-allowed'
            }`}
            onClick={toggleSpeechToText}
            disabled={!speechToTextSupportedRef.current}
            title={speechToTextListeningRef.current ? 'Stop voice input' : 'Start voice input'}
          >
            {speechToTextListeningRef.current ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <button
            className="bg-[#3F92FF] border-none text-white p-2 px-3 rounded-lg cursor-pointer text-sm font-bold hover:bg-[#2F75D9]"
            onClick={() => void handleSearch()}
          >
            🔍
          </button>
        </div>

        {suggestions.length > 0 && (
          <div className="bg-neutral-900/95 border-t border-neutral-800 max-h-[180px] overflow-y-auto scrollbar-hide">
            {suggestions.map((s: any, i: number) => (
              <div
                key={i}
                className="p-3 border-b border-neutral-800 hover:bg-neutral-800"
                onClick={() => handleSelectSuggestion(s)}
              >
                <strong className="text-white block text-sm">{s.name || 'Unknown'}</strong>
                <span className="text-gray-400 text-sm">{s.formatted_address || s.vicinity || ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
        <label className="rounded-xl border border-neutral-800 bg-neutral-900/95 px-2 py-1.5">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-cyan-200/80">Rating</span>
          <div className="flex items-center justify-between gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const isHalf = clickX <= rect.width / 2;
                  const next = Math.max(0.5, Math.min(5, star - (isHalf ? 0.5 : 0)));
                  setPoiMinRating((prev) => (Math.abs(prev - next) < 0.001 ? 0 : next));
                }}
                className="rounded-sm p-0.5 hover:bg-white/10 transition-colors"
              >
                <span className="relative block h-4 w-4 leading-none">
                  <span className="absolute inset-0 text-[16px] text-neutral-600">★</span>
                  <span
                    className="absolute inset-0 overflow-hidden text-amber-300"
                    style={{ width: `${getStarFillPercent(poiMinRating, star)}%` }}
                  >
                    ★
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-[10px] text-gray-400">{poiMinRating > 0 ? `${poiMinRating.toFixed(1)}+` : 'Any'}</p>
            <button onClick={() => setPoiMinRating(0)} className="text-[10px] text-cyan-300 hover:text-cyan-200">
              Clear
            </button>
          </div>
        </label>

        <label className="rounded-xl border border-neutral-800 bg-neutral-900/95 px-2 py-1.5">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-cyan-200/80">Open</span>
          <select
            value={poiOpenFilter}
            onChange={(e) => setPoiOpenFilter(e.target.value as PoiOpenFilter)}
            className="w-full border-none bg-transparent text-white outline-none text-xs"
          >
            <option value="all" className="bg-neutral-900 text-white">Any</option>
            <option value="open" className="bg-neutral-900 text-white">Open now</option>
            <option value="closed" className="bg-neutral-900 text-white">Closed now</option>
          </select>
        </label>

        <label className="rounded-xl border border-neutral-800 bg-neutral-900/95 px-2 py-1.5">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-cyan-200/80">Coupon</span>
          <select
            value={poiCouponFilter}
            onChange={(e) => setPoiCouponFilter(e.target.value as PoiCouponFilter)}
            className="w-full border-none bg-transparent text-white outline-none text-xs"
          >
            <option value="all" className="bg-neutral-900 text-white">Any</option>
            <option value="with" className="bg-neutral-900 text-white">Has coupon</option>
            <option value="without" className="bg-neutral-900 text-white">No coupon</option>
          </select>
        </label>
      </div>

      <div className="mt-2.5 text-[14px]">
        <div className="w-full bg-neutral-900/95 text-white border border-neutral-800 p-3 rounded-xl flex justify-between items-center">
          <span className="font-large">Select Category</span>
          <span className="text-xs text-gray-400">(demo)</span>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {POI_GROUPS.flatMap((group) =>
          group.items.map((item) => ({
            ...item,
            groupColor: group.color,
          }))
        )
          .slice(0, 4)
          .map((item) => (
            <button
              key={item.id}
              onClick={() => void searchPoi(item.type, item.icon)}
              className="rounded-md border border-neutral-800 bg-neutral-900/95 px-2 py-2 text-xs text-cyan-200 hover:bg-white/5"
            >
              {item.icon} {item.label}
            </button>
          ))}
      </div>
    </div>
  );

  // Loading state
  const loading = !mapLoaded && !mapError ? (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-500 text-lg flex flex-col items-center gap-4 z-[1200]">
      <div className="w-10 h-10 border-[3px] border-neutral-800 border-t-[#3F92FF] rounded-full animate-spin" />
      <span>Loading Map...</span>
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 bg-neutral-900">
      <div ref={mapElement} className="w-full h-full relative">
        <Navbar page="Map">
          <Links link="tinder" className="text-[15px]">
            Findr <Heart size={18} />
          </Links>
          <Links link="discount" className="text-[15px]">
            Coupons <TicketPercent size={18} />
          </Links>
          <Links link="reviews" className="text-[15px]">
            Reviews <Star size={18} />
          </Links>
        </Navbar>

        {loading}
        {showError}
        {navigationCard}
        {searchOverlay}

        {/* Minimal favorites sidebar (keep original look while compacting later) */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3 }}
              className="fixed top-20 bottom-3 right-2 z-[1500] w-[92vw] max-w-[360px] rounded-2xl border border-cyan-500/30 bg-neutral-900/90 p-3 sm:p-4 shadow-2xl backdrop-blur-xl"
            >
              <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-cyan-300 text-base sm:text-lg font-semibold">All Favorited Locations</h3>
                <button onClick={() => setShowSidebar(false)} className="h-7 w-7 rounded-full bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10">
                  ✕
                </button>
              </div>

              <div className="h-[calc(100%-48px)] overflow-y-auto pr-1">
                {loadingFavorites ? (
                  <p className="text-gray-400 text-center py-4">Loading favorite locations...</p>
                ) : favoriteLocations.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No favorite locations yet.</p>
                ) : (
                  favoriteLocations.map((loc, i) => (
                    <div
                      key={i}
                      className="mb-3 rounded-xl border border-white/10 bg-neutral-800/55 p-2.5 sm:p-3 hover:bg-neutral-800/80 transition-colors"
                    >
                      <div className="flex-1 cursor-pointer" onClick={() => navigate(buildMapRouteUrl(loc))}>
                        <h4 className="text-cyan-300 text-base sm:text-lg font-semibold">{loc.name}</h4>
                        <p className="text-gray-400 text-sm">{loc.address}</p>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <LocationReviewsPopup
                          location={{ lid: loc.lid, name: loc.name, address: loc.address }}
                          buttonClassName="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-[11px] text-gray-200 hover:bg-white/10"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute left-4 top-20 z-[1000] flex flex-col gap-3">
          <button
            onClick={() => setShowSidebar((v) => !v)}
            className="w-[55px] h-[40px] md:w-[60px] md:h-[50px] bg-neutral-900/95 text-white border border-neutral-800 rounded-xl cursor-pointer text-sm flex flex-col items-center justify-center shadow-lg transition-all hover:scale-105 hover:border-[#3F92FF]"
            title="Favorites"
          >
            <span className="text-xs font-bold">★</span>
          </button>
          <button
            onClick={() => {
              if (mapRef.current) mapRef.current.panTo(userLoc);
              if (userMarkerRef.current) userMarkerRef.current.setPosition(userLoc);
            }}
            className="w-[55px] h-[40px] md:w-[60px] md:h-[50px] bg-neutral-900/95 text-white border border-neutral-800 rounded-xl cursor-pointer text-sm flex flex-col items-center justify-center shadow-lg transition-all hover:scale-105 hover:border-[#3F92FF]"
            title="My Location"
          >
            📍
          </button>
        </div>

        <LocalAiChatPopup
          userName={user?.username || 'User'}
          activePage="map"
          currentLocation={userLoc}
          favoriteLocations={favoriteLocations.map((loc) => ({ name: loc.name, address: loc.address, latitude: loc.latitude, longitude: loc.longitude }))}
          visitedLocations={[]}
          likedLocations={[]}
          selectedPois={filteredPoiResults.map((poi) => ({ name: poi.name, address: poi.address, latitude: poi.lat, longitude: poi.lng }))}
          activeSelectionLabel={selectedLocation?.name || stats?.name || activePoiType || undefined}
        />
      </div>
    </div>
  );
};

export default MapGoogle;

