import React, { useEffect, useRef, useState } from 'react';
import tt from '@tomtom-international/web-sdk-maps';
import { services } from '@tomtom-international/web-sdk-services';
import '@tomtom-international/web-sdk-maps/dist/maps.css';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/navbar';
import Links from '../components/links';
import {House, Heart, HeartPlus} from 'lucide-react';
import { enqueueAlert } from '../components/alerts';
import LocalAiChatPopup from '../components/localAiChatPopup';
import {
  extractTomTomPoiDetails,
  fetchTomTomPoiDetailsForLocation,
  formatBusinessHoursForDisplay,
  parseBusinessHoursQuery,
  parseSocialsQuery,
  serializeBusinessHours,
  serializeSocials,
  type SocialLink
} from '../utils/tomtomPoiDetails';

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

const API_KEY =
  import.meta.env.VITE_TOMTOM_API_KEY ||
  import.meta.env.PUBLIC_TOMTOM_API_KEY ||
  import.meta.env.TOMTOM_API_KEY;
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5173';

const POI_GROUPS = [
  {
    name: 'Automotive',
    color: 'bg-orange-500',
    items: [
      { id: '7311', type: 'GAS_STATION', label: 'Gas Station', icon: '⛽' },
      { id: '7313', type: 'PARKING', label: 'Parking Garage', icon: '🅿️' },
      { id: '7310', type: 'REPAIR', label: 'Repair Facility', icon: '🔧' },
      { id: '7312', type: 'RENTAL', label: 'Car Rental', icon: '🚗' },
    ]
  },
  {
    name: 'Food & Drink',
    color: 'bg-red-500',
    items: [
      { id: '7315', type: 'RESTAURANT', label: 'Restaurant', icon: '🍽️' },
      { id: '9376', type: 'CAFE', label: 'Cafe / Pub', icon: '☕' },
      { id: '7349', type: 'WINERY', label: 'Winery', icon: '🍷' }
    ]
  },
  {
    name: 'Shopping',
    color: 'bg-blue-500',
    items: [
      { id: '7373', type: 'SHOPPING', label: 'Shopping Center', icon: '🛍️' },
      { id: '7332', type: 'MARKET', label: 'Supermarket', icon: '🛒' },
      { id: '7327', type: 'STORE', label: 'Department Store', icon: '🏪' }
    ]
  },
  {
    name: 'Health',
    color: 'bg-pink-500',
    items: [
      { id: '7321', type: 'HOSPITAL', label: 'Hospital', icon: '🏥' },
      { id: '9373', type: 'DOCTOR', label: 'Doctor', icon: '👨‍⚕️' },
      { id: '9374', type: 'DENTIST', label: 'Dentist', icon: '🦷' },
      { id: '7326', type: 'PHARMACY', label: 'Pharmacy', icon: '💊' },
    ]
  },
  {
    name: 'Leisure & Ent.',
    color: 'bg-purple-500',
    items: [
      { id: '7342', type: 'CINEMA', label: 'Movie Theater', icon: '🎬' },
      { id: '7317', type: 'MUSEUM', label: 'Museum', icon: '🏛️' },
      { id: '7374', type: 'STADIUM', label: 'Stadium', icon: '🏟️' },
      { id: '9911', type: 'GOLF', label: 'Golf Course', icon: '⛳' }
    ]
  },
  {
    name: 'Travel',
    color: 'bg-indigo-500',
    items: [
      { id: '7314', type: 'HOTEL', label: 'Hotel', icon: '🏨' },
      { id: '7360', type: 'CAMPING', label: 'Camping', icon: '⛺' }
    ]
  }
];

const getLng = (pos: any): number | undefined => {
  if (!pos) return undefined;
  if (typeof pos.lng === 'number') return pos.lng;
  if (typeof pos.lon === 'number') return pos.lon;
  return undefined;
};

const getLat = (pos: any): number | undefined => {
  if (!pos) return undefined;
  if (typeof pos.lat === 'number') return pos.lat;
  return undefined;
};

const hasValidPosition = (pos: any): boolean => {
  const lng = getLng(pos);
  const lat = getLat(pos);
  return lng !== undefined && lat !== undefined && 
         !isNaN(lng) && !isNaN(lat);
};

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
  phone?: string;
  email?: string;
  website?: string;
  businessHours?: string[];
  socials?: SocialLink[];
}

const LocationDetailBlock = ({ details }: { details?: Pick<Business, 'phone' | 'email' | 'website' | 'businessHours' | 'socials'> }) => {
  const formattedHours = formatBusinessHoursForDisplay(details?.businessHours, 2);

  return (
    <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-[11px] leading-snug">
      <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-300">
        Phone: {details?.phone || 'N/A'}
      </div>
      <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-300">
        Email: {details?.email || 'N/A'}
      </div>
      <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-300">
        Website:{' '}
        {details?.website ? (
          <a
            href={details.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 hover:text-cyan-200 underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            Open
          </a>
        ) : 'N/A'}
      </div>
      <div className="col-span-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-400">
        Socials: {' '}
        {details?.socials && details.socials.length > 0 ? details.socials.slice(0, 3).map((social) => social.platform).join(', ') : 'N/A'}
      </div>
      <div className="col-span-2 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-400">
        Hours: {formattedHours.length > 0 ? formattedHours.join(' | ') : 'N/A'}
      </div>
    </div>
  );
};

const Map = () => {
  const mapElement = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<{uid: number, username: string} | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const poiMarkersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const [userLoc, setUserLoc] = useState({ lat: 34.0731, lng: -118.4016 });
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [stats, setStats] = useState<RouteInfo | null>(null);
  const [trafficOn, setTrafficOn] = useState(false);
  const [poiMarkers, setPoiMarkers] = useState<any[]>([]);
  const [activePoiType, setActivePoiType] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState(false);
  const [navStep, setNavStep] = useState(0);
  const [showFullDirections, setShowFullDirections] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Business | null>(null);
  const [routeFavoriteLocation, setRouteFavoriteLocation] = useState<Business | null>(null);
  const [mapStyle, setMapStyle] = useState<'regular' | 'satellite' | 'dark' | 'hybrid'>('dark');
  const [mapPerspective, setMapPerspective] = useState<'2d' | '3d'>('2d');
  const [mapError, setMapError] = useState<string | null>(null);
  const [isPoiDropdownOpen, setIsPoiDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSavingRef = useRef(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showPoiSidebar, setShowPoiSidebar] = useState(false);
  const [poiResults, setPoiResults] = useState<PoiListItem[]>([]);
  const [poiRadiusFilter, setPoiRadiusFilter] = useState<'5' | '10' | '20'>('20');
  const poiMarkerEntriesRef = useRef<Array<{ marker: any; distanceMeters: number }>>([]);
  const {scrollY} = useScroll();
  const marginTop = useTransform(scrollY, [0, 100], ["0px", "12px"]);
  const marginBottom = useTransform(scrollY, [0, 100], ["0px", "12px"]);
	const borderRadius = useTransform(scrollY, [0, 100], ["0px", "24px"]);
	const right = useTransform(scrollY, [0, 100], ["0px", "1%"]);
	const bgColor = useTransform(scrollY, [0, 100], ["rgba(23, 23, 23, 1)", "rgba(30, 30, 30, 0.7)"]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [favoriteLocations, setFavoriteLocations] = useState<Location[]>([]);
  const [likedLocations] = useState<Business[]>([]);
  const geolocationWatchRef = useRef<number | null>(null);
  const markerAnimationRef = useRef<number | null>(null);
  const displayedUserLocRef = useRef<{ lat: number; lng: number } | null>(null);
  const userHeadingRef = useRef<number>(0);
  const isNavigatingRef = useRef(false);
  const activeRouteRef = useRef<RouteInfo | null>(null);
  const lastSpokenInstructionRef = useRef<string | null>(null);
  const hasSelectedLocationImage = !!selectedLocation?.imageUrl;
  const showImageLocationPopup = !!selectedLocation && hasSelectedLocationImage && !isNavigating;
  const isVoiceSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  
  useEffect(() => {
    isNavigatingRef.current = isNavigating;
  }, [isNavigating]);

  useEffect(() => {
    activeRouteRef.current = stats;
  }, [stats]);

  useEffect(() => {
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    if (lat && lon && mapLoaded) {
      const destLat = parseFloat(lat);
      const destLng = parseFloat(lon);
      const nameParam = searchParams.get('name');
      const addressParam = searchParams.get('address');
      if (!isNaN(destLat) && !isNaN(destLng)) {
        const routeName = nameParam?.trim() || addressParam?.trim() || 'Destination';
        const businessHours = parseBusinessHoursQuery(searchParams.get('businessHours'));
        const socials = parseSocialsQuery(searchParams.get('socials'));
        const paramLocation: Business | undefined = (nameParam || addressParam)
          ? {
              name: nameParam?.trim() || addressParam?.trim() || 'Selected Location',
              address: addressParam?.trim() || nameParam?.trim() || 'Unknown Location',
              latitude: destLat,
              longitude: destLng,
              distance_meters: 0,
              category: [],
              score: 0,
              classifications: [],
              phone: searchParams.get('phone') || undefined,
              email: searchParams.get('email') || undefined,
              website: searchParams.get('website') || undefined,
              businessHours,
              socials
            }
          : undefined;
        calculateRoute(destLat, destLng, routeName, false, paramLocation);
      }
    }
  }, [searchParams, mapLoaded]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${AUTH_BASE_URL}/auth/dashboard`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        navigate('/login');
      }
    };
    fetchProfile();
  }, [navigate, AUTH_BASE_URL]);

  const getMapStyle = () => {
    switch (mapStyle) {
      case 'satellite':
        return { map: '2/basic_street-satellite', poi: '2/poi_satellite' };
      case 'dark':
        return { map: '2/basic_street-dark', poi: '2/poi_dark' };
      case 'hybrid':
        return { map: '2/hybrid_street-light', poi: '2/poi_light' };
      default:
        return { map: '2/basic_street-light', poi: '2/poi_light' };
    }
  };
  const showToastNotice = (message: string, isError = false) => {
    enqueueAlert({
      message,
      textColor: isError ? 'text-red-300' : 'text-green-300',
    });
  };
  const buildStaticMapImage = (lng: number, lat: number) =>
    `https://api.tomtom.com/map/1/staticimage?key=${API_KEY}&layer=basic&style=main&center=${lng},${lat}&zoom=16&width=400&height=200&format=png`;
  const metersToMiles = (meters: number): number => meters * 0.000621371;
  const isPoiWithinRadius = (distanceMeters: number): boolean => {
    const miles = metersToMiles(distanceMeters);
    if (poiRadiusFilter === '5') return miles <= 5;
    if (poiRadiusFilter === '10') return miles <= 10;
    return miles <= 20;
  };
  const filteredPoiResults = poiResults.filter((poi) => {
    return isPoiWithinRadius(poi.distanceMeters);
  });
  const applyPoiRadiusToMarkers = () => {
    poiMarkerEntriesRef.current.forEach(({ marker, distanceMeters }) => {
      const markerEl = marker?.getElement?.();
      if (!markerEl) return;
      markerEl.style.display = isPoiWithinRadius(distanceMeters) ? '' : 'none';
    });
  };

  const getDirectionBearing = (route?: RouteInfo): number => {
    if (userHeadingRef.current > 0 && Number.isFinite(userHeadingRef.current)) {
      return userHeadingRef.current;
    }

    const nextPoint = route?.instructions?.[0]?.point;
    if (nextPoint && Number.isFinite(nextPoint.lat) && Number.isFinite(nextPoint.lng)) {
      const lat1 = (userLoc.lat * Math.PI) / 180;
      const lat2 = (nextPoint.lat * Math.PI) / 180;
      const dLon = ((nextPoint.lng - userLoc.lng) * Math.PI) / 180;
      const y = Math.sin(dLon) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
      const bearing = (Math.atan2(y, x) * 180) / Math.PI;
      return (bearing + 360) % 360;
    }

    return mapRef.current ? mapRef.current.getBearing() : 0;
  };

const fetchFavoriteLocations = async () => {
  setLoadingFavorites(true);
  try {
    const response = await fetch('http://localhost:5173/loc/favorites', {
      credentials: 'include'
    });
    if (response.ok) {
      const data = await response.json();
      if (!API_KEY) {
        setFavoriteLocations(data);
      } else {
        const enriched = await Promise.all(
          data.map(async (loc: Location) => {
            const details = await fetchTomTomPoiDetailsForLocation(API_KEY, {
              name: loc.name,
              address: loc.address,
              latitude: loc.latitude,
              longitude: loc.longitude
            });
            return { ...loc, ...details };
          })
        );
        setFavoriteLocations(enriched);
      }
    } else {
      console.error('Failed to fetch favorite locations');
      setFavoriteLocations([]);
    }
  } catch (error) {
    console.error('Error fetching favorite locations:', error);
    setFavoriteLocations([]);
  } finally {
    setLoadingFavorites(false);
  }
};

useEffect(() => {
  if (user) {
    fetchFavoriteLocations();
  }
}, [user]);


  useEffect(() => {
    if (!mapElement.current) return;
    if (!API_KEY) {
      setMapError('API key is missing. Please set VITE_TOMTOM_API_KEY in your .env file.');
      return;
    }

    const style = getMapStyle();

    try {
      const map = tt.map({
        key: API_KEY,
        container: mapElement.current,
        center: [userLoc.lng, userLoc.lat],
        zoom: 13,
        pitch: mapPerspective === '3d' ? 60 : 0,
        style: {
          map: style.map as any,
          poi: style.poi as any,
          trafficIncidents: 'incidents_day' as any,
          trafficFlow: 'flow_relative0' as any
        }
      });

      map.on('load', () => {
        setMapLoaded(true);
        setMapError(null);
        drawUserMarker(userLoc);

        map.on('click', async (e: any) => {
          const lngLat = e.lngLat;
          const lat = lngLat.lat;
          const lng = lngLat.lng;
          cancelNavigation();
          setStats(null);

          try {
            const response = await fetch(
              `https://api.tomtom.com/search/2/nearbySearch/.json?key=${API_KEY}&lat=${lat}&lon=${lng}&radius=50&openingHours=nextSevenDays`
            );
            const data = await response.json();
            const place = data.results?.[0];
            if (!place) return;
            const name = place.poi?.name ?? "Unknown";
            const category = place.poi?.categories ?? [];
            const address = place.address?.freeformAddress ?? "";
            const imageUrl = buildStaticMapImage(lng, lat);
            const details = extractTomTomPoiDetails(place);
            const location: Business = {
              name: name,
              address: address,
              latitude: lat,
              longitude: lng,
              distance_meters: 0,
              category: category,
              score: 0,
              classifications: [],
              imageUrl: imageUrl,
              ...details
            };
            setSelectedLocation(location);
          } catch (error) {
            console.error('Error fetching location details:', error);
            setSelectedLocation({
              name: 'Selected Location',
              address: 'Unknown Location',
              latitude: lat,
              longitude: lng,
              distance_meters: 0,
              category: ['Other'],
              score: 0,
              classifications: [],
              imageUrl: buildStaticMapImage(lng, lat)
            });

          }
        });
      });

      map.on('error', (e: any) => {
        console.error('Map error:', e);
        setMapError('Failed to load map. Please check your API key.');
      });

      mapRef.current = map;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLoc(coords);
          map.setCenter([coords.lng, coords.lat]);
        }, () => {});
      }
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setMapError('Failed to initialize map. Please check your API key.');
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [user]);

  const drawUserMarker = (loc: {lat: number, lng: number}) => {
    if (!mapRef.current || !mapLoaded) return;
    if (userMarkerRef.current) userMarkerRef.current.remove();
    
    const el = document.createElement('div');
    el.className = 'user-dot';
    el.innerHTML = '<div class="w-5 h-5 bg-[#00d4ff] border-[4px] border-white rounded-full shadow-[0_0_15px_#00d4ff]"></div>';
    
    userMarkerRef.current = new tt.Marker({ element: el })
      .setLngLat([loc.lng, loc.lat])
      .addTo(mapRef.current);
    displayedUserLocRef.current = loc;
  };

  const animateUserMarkerTo = (target: { lat: number; lng: number }, durationMs = 900) => {
    if (!userMarkerRef.current) return;
    if (markerAnimationRef.current) {
      cancelAnimationFrame(markerAnimationRef.current);
    }

    const start = displayedUserLocRef.current ?? target;
    const startAt = performance.now();

    const frame = (now: number) => {
      const t = Math.min((now - startAt) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const lat = start.lat + (target.lat - start.lat) * eased;
      const lng = start.lng + (target.lng - start.lng) * eased;
      displayedUserLocRef.current = { lat, lng };
      userMarkerRef.current.setLngLat([lng, lat]);
      if (t < 1) {
        markerAnimationRef.current = requestAnimationFrame(frame);
      }
    };

    markerAnimationRef.current = requestAnimationFrame(frame);
  };

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const pitch = mapPerspective === '3d' ? 60 : 0;
    
    try {
      const center = mapRef.current.getCenter();
      mapRef.current.flyTo({
        center: [center.lng, center.lat],
        pitch: pitch,
        zoom: mapRef.current.getZoom(),
        duration: 1000
      });
    } catch (e) {
      console.error('Could not set pitch:', e);
    }
  }, [mapPerspective, mapLoaded]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;


    const style = getMapStyle();
    
    try {
      mapRef.current.setStyle({
        map: style.map,
        poi: style.poi,
        trafficIncidents: 'incidents_day',
        trafficFlow: 'flow_relative0'
      });
      

      mapRef.current.once('styledata', () => {
        drawUserMarker(userLoc);
      });
    } catch (e) {
      console.error('Could not set style:', e);
    }
  }, [mapStyle, mapLoaded]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    geolocationWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const nextLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const heading = pos.coords.heading;
        if (heading !== null && !isNaN(heading) && heading >= 0) {
          userHeadingRef.current = heading;
        }

        setUserLoc(nextLoc);

        if (userMarkerRef.current) {
          animateUserMarkerTo(nextLoc);
        } else if (mapRef.current && mapLoaded) {
          drawUserMarker(nextLoc);
        }

        if (isNavigatingRef.current && mapRef.current) {
          mapRef.current.easeTo({
            center: [nextLoc.lng, nextLoc.lat],
            bearing: getDirectionBearing(activeRouteRef.current || undefined),
            pitch: 60,
            duration: 900
          });
        }
      },
      (err) => {
        console.error('Geolocation watch error:', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000
      }
    );

    return () => {
      if (geolocationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(geolocationWatchRef.current);
        geolocationWatchRef.current = null;
      }
      if (markerAnimationRef.current) {
        cancelAnimationFrame(markerAnimationRef.current);
        markerAnimationRef.current = null;
      }
    };
  }, [mapLoaded]);

  useEffect(() => {
    if (inputValue.length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await services.fuzzySearch({
          key: API_KEY,
          query: inputValue,
          center: [userLoc.lng, userLoc.lat],
          typeahead: true,
          limit: 6,
          openingHours: 'nextSevenDays'
        } as any);
        setSuggestions(res.results || []);
      } catch (e) { 
        console.error('Autocomplete error:', e); 
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [inputValue, userLoc]);

  const clearMap = (preservePoi = false) => {

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    

    if (mapRef.current && mapRef.current.getLayer('route-arrows')) {
      try { mapRef.current.removeLayer('route-arrows'); } catch (e) {}
    }
    if (mapRef.current && mapRef.current.getLayer('route')) {
      try { mapRef.current.removeLayer('route'); } catch (e) {}
    }
    if (mapRef.current && mapRef.current.getSource('route')) {
      try { mapRef.current.removeSource('route'); } catch (e) {}
    }
    

    if (!preservePoi) {
      poiMarkers.forEach(m => m.remove());
      setPoiMarkers([]);
      setActivePoiType(null);
      setPoiResults([]);
      setShowPoiSidebar(false);
      poiMarkerEntriesRef.current = [];
    }
  };

  const cancelNavigation = (clearRoute = false) => {
    if (isVoiceSupported) {
      window.speechSynthesis.cancel();
    }
    setIsNavigating(false);
    setNavStep(0);
    setShowFullDirections(false);
    if (clearRoute) {
      setStats(null);
    }
  };

  const recordVisitedLocation = async (location: Business) => {
    try {
      const response = await fetch('http://localhost:5173/loc/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: location.name,
          address: location.address || location.name,
          longitude: location.longitude,
          latitude: location.latitude,
          type: 1,
          categories: location.category || [],
          phone: location.phone,
          email: location.email,
          website: location.website,
          businessHours: location.businessHours,
          socials: location.socials
        })
      });
      if (response.ok) {
        showToastNotice('New location visited.');
      } else {
        showToastNotice('Failed to log visited location.', true);
      }
    } catch (e) {
      console.error('Error logging visited location:', e);
      showToastNotice('Failed to log visited location.', true);
    }
  };

  const startNavigationWithRoute = (route: RouteInfo) => {
    setShowSidebar(false);
    setShowPoiSidebar(false);
    const locationForVisit: Business = routeFavoriteLocation ?? {
      name: route.name || 'Selected Location',
      address: route.name || 'Unknown Location',
      latitude: route.lat,
      longitude: route.lng,
      distance_meters: 0,
      category: [],
      score: 0,
      classifications: []
    };
    void recordVisitedLocation(locationForVisit);

    setStats(route);
    setIsNavigating(true);
    setNavStep(0);
    setShowFullDirections(false);
    

    poiMarkersRef.current.forEach(m => {
      try { m.remove(); } catch (e) {}
    });
    poiMarkersRef.current = [];
    setPoiMarkers([]);
    setActivePoiType(null);
    
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [userLoc.lng, userLoc.lat],
        zoom: 17,
        pitch: 60,
        bearing: getDirectionBearing(route),
        duration: 900
      });
    }
  };
  const startNavigation = () => {
    if (!stats) return;
    startNavigationWithRoute(stats);
  };

  const nextNavStep = () => {
    if (!stats || !stats.instructions) return;
    if (navStep < stats.instructions.length - 1) {
      const newStep = navStep + 1;
      setNavStep(newStep);
      const step = stats.instructions[newStep];
      if (step?.point && !isNaN(step.point.lng) && !isNaN(step.point.lat) && mapRef.current) {
        mapRef.current.flyTo({
          center: [step.point.lng, step.point.lat],
          zoom: 17,
          pitch: 60,
          bearing: 0
        });
      }
    }
  };

  const prevNavStep = () => {
    if (navStep > 0) {
      const newStep = navStep - 1;
      setNavStep(newStep);
      const step = stats?.instructions?.[newStep];
      if (step?.point && !isNaN(step.point.lng) && !isNaN(step.point.lat) && mapRef.current) {
        mapRef.current.flyTo({
          center: [step.point.lng, step.point.lat],
          zoom: 17,
          pitch: 60,
          bearing: 0
        });
      }
    }
  };

  const jumpToStep = (index: number) => {
    if (!stats?.instructions?.[index]) return;
    setNavStep(index);
    const step = stats.instructions[index];
    if (step.point && !isNaN(step.point.lng) && !isNaN(step.point.lat) && mapRef.current) {
      mapRef.current.flyTo({
        center: [step.point.lng, step.point.lat],
        zoom: 17,
        pitch: 60,
        bearing: 0
      });
    }
  };

  const buildVoiceInstruction = (
    instruction: RouteInstruction | undefined,
    destinationName: string | undefined,
    stepIndex: number,
    totalSteps: number
  ): string | null => {
    if (!instruction) return null;
    const stepLabel = `Step ${stepIndex + 1} of ${totalSteps}.`;
    const distanceRaw = formatDistance(instruction.distance || 0);
    const distance = distanceRaw
      .replace('mi', ' miles')
      .replace(/(\d+)m$/, '$1 meters');
    const cleanedMessage = (instruction.message || instruction.streetName || 'Continue')
      .replace(/[•]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const speechFriendlyMessage = cleanedMessage
      .replace(/\bdr\.\b/gi, 'Drive')
      .replace(/\bdr\b/gi, 'Drive');
    if (instruction.maneuverType?.toLowerCase() === 'arrive') {
      return `${stepLabel} You have arrived at ${destinationName || 'your destination'}.`;
    }
    return `${stepLabel} ${speechFriendlyMessage}. Continue for ${distance}.`;
  };

  const pickBestVoice = (): SpeechSynthesisVoice | null => {
    if (!isVoiceSupported) return null;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;
    const preferredNames = [
      'Google US English',
      'Microsoft Aria Online (Natural) - English (United States)',
      'Samantha',
      'Alex',
    ];
    const preferred =
      voices.find((voice) => preferredNames.includes(voice.name)) ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith('en-us')) ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith('en'));
    return preferred || voices[0];
  };

  useEffect(() => {
    if (!voiceGuidanceEnabled || !isNavigating || !stats || !isVoiceSupported) return;
    const text = buildVoiceInstruction(
      stats.instructions[navStep],
      stats.name,
      navStep,
      stats.instructions.length
    );
    if (!text) return;
    if (lastSpokenInstructionRef.current === text) return;
    lastSpokenInstructionRef.current = text;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickBestVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = 'en-US';
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }, [voiceGuidanceEnabled, isNavigating, stats, navStep, isVoiceSupported]);

  useEffect(() => {
    return () => {
      if (isVoiceSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isVoiceSupported]);

  useEffect(() => {
    if (!isVoiceSupported) return;
    window.speechSynthesis.getVoices();
    const handleVoicesChanged = () => {
      window.speechSynthesis.getVoices();
    };
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    };
  }, [isVoiceSupported]);
  
  const addToFavorites = async (business: Business) => {
    if (isSavingRef.current) {
      showToastNotice('Saving in progress...', true);
      return;
    }
    isSavingRef.current = true;
    
    try {
        const createResponse = await fetch('http://localhost:5173/loc/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                name: business.name,
                address: business.address,
                longitude: business.longitude,
                latitude: business.latitude,
                type: 1,
                categories: business.category,
                phone: business.phone,
                email: business.email,
                website: business.website,
                businessHours: business.businessHours,
                socials: business.socials,
            })
        });

        const createData = await createResponse.json().catch(() => null);
        if (createResponse.ok) {
            const locationData = createData;
            const locationId = locationData?.location_id;
            if (!locationId) {
              showToastNotice('Failed to resolve location id', true);
              return;
            }
            const favoriteResponse = await fetch(`http://localhost:5173/loc/${locationId}/favorite`, {
                method: 'POST',
                credentials: 'include'
            });
            const favoriteData = await favoriteResponse.json().catch(() => null);
            if (favoriteResponse.ok) {
                showToastNotice("Location saved to favorites");
                fetchFavoriteLocations();
            } else {
                const message = favoriteData?.message || '';
                if (message.toLowerCase().includes('already')) {
                  showToastNotice('Location already in favorites', true);
                } else {
                  console.error('Failed to add to favorites');
                  showToastNotice('Failed to save location', true);
                }
            }
        } else {
            console.error('Failed to create location');
            showToastNotice(createData?.message || 'Failed to create location', true);
        }
    } catch (error) {
        console.error('Error adding to favorites:', error);
        showToastNotice('Error saving location', true);
    } finally {
        isSavingRef.current = false;
    }
};

  const searchPoi = async (categoryId: string, type: string, icon: string, colorClass: string) => {
    if (!mapRef.current) return;

    clearMap();
    cancelNavigation();

    if (activePoiType === type) {
      setActivePoiType(null);
      setPoiResults([]);
      setShowPoiSidebar(false);
      return;
    }

    setActivePoiType(type);
    setIsPoiDropdownOpen(false);

    try {
      const res = await services.poiSearch({
        key: API_KEY,
        center: [userLoc.lng, userLoc.lat],
        radius: 50000,
        categorySet: categoryId,
        limit: 100,
        openingHours: 'nextSevenDays' as any
      });


      const newMarkers: any[] = [];
      const newMarkerEntries: Array<{ marker: any; distanceMeters: number }> = [];
      const nextPoiResults: PoiListItem[] = [];
      const bounds = new tt.LngLatBounds();

      (res.results || []).forEach((poi: any) => {
        if (hasValidPosition(poi.position)) {
          const lng = getLng(poi.position)!;
          const lat = getLat(poi.position)!;
          const poiName = poi.poi?.name || type;
          const poiAddress = poi.address?.freeformAddress || 'Unknown Address';
          const poiCategories = poi.poi?.categories || [];
          const details = extractTomTomPoiDetails(poi);
          
          const el = document.createElement('div');
          const innerEl = document.createElement('div');
          
          innerEl.className = `flex items-center justify-center w-8 h-8 ${colorClass} border-[3px] border-white rounded-full text-sm cursor-pointer shadow-md transition-transform hover:scale-125`;
          innerEl.innerHTML = icon;
          el.appendChild(innerEl);

          const marker = new tt.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(mapRef.current);

          marker.getElement().addEventListener('click', () => {
            setShowSidebar(false);
            setShowPoiSidebar(false);
            const mappedLocation: Business = {
              name: poiName,
              address: poiAddress,
              latitude: lat,
              longitude: lng,
              distance_meters: poi.dist || 0,
              category: poiCategories,
              score: 0,
              classifications: [],
              ...details
            };
            calculateRoute(lat, lng, poiName, false, mappedLocation);
          });

          newMarkerEntries.push({ marker, distanceMeters: poi.dist || 0 });
          nextPoiResults.push({
            id: poi.id || `${type}-${lat}-${lng}`,
            name: poiName,
            address: poiAddress,
            lat,
            lng,
            icon,
            type,
            categories: poiCategories,
            distanceMeters: poi.dist || 0,
            ...details
          });
          newMarkers.push(marker);
          bounds.extend([lng, lat]);
        }
      });

      // Update both state and ref
      poiMarkersRef.current = newMarkers;
      poiMarkerEntriesRef.current = newMarkerEntries;
      setPoiMarkers(newMarkers);
      setPoiResults(nextPoiResults);
      applyPoiRadiusToMarkers();
      if (nextPoiResults.length > 0) {
        setShowSidebar(false);
        setShowPoiSidebar(true);
      }

      if (newMarkers.length > 0 && mapRef.current) {
        mapRef.current.setZoom(10);
        mapRef.current.fitBounds(bounds, { padding: 50 });
      }
    } catch (e) {
      console.error('POI search failed:', e);
    }
  };

  useEffect(() => {
    applyPoiRadiusToMarkers();
  }, [poiRadiusFilter, poiResults]);

  const handlePoiResultClick = (poi: PoiListItem) => {
    setShowSidebar(false);
    setShowPoiSidebar(false);
    const mappedLocation: Business = {
      name: poi.name,
      address: poi.address,
      latitude: poi.lat,
      longitude: poi.lng,
      distance_meters: 0,
      category: poi.categories,
      score: 0,
      classifications: [],
      imageUrl: buildStaticMapImage(poi.lng, poi.lat),
      phone: poi.phone,
      email: poi.email,
      website: poi.website,
      businessHours: poi.businessHours,
      socials: poi.socials,
    };
    calculateRoute(poi.lat, poi.lng, poi.name, false, mappedLocation);
  };

  const handleSelectSuggestion = (poi: any) => {
    if (!hasValidPosition(poi.position)) return;

    const lng = getLng(poi.position)!;
    const lat = getLat(poi.position)!;
    const poiName = poi.poi?.name || poi.address?.freeformAddress || 'Destination';
    const poiAddress = poi.address?.freeformAddress || poiName;
    const details = extractTomTomPoiDetails(poi);
    
    setInputValue(poiName);
    setSuggestions([]);

    clearMap();
    cancelNavigation();

    const destLngLat: [number, number] = [lng, lat];
    
    const el = document.createElement('div');
    el.className = 'flex items-center justify-center text-4xl';
    el.innerHTML = '📍';
    
    const marker = new tt.Marker({ element: el })
      .setLngLat(destLngLat)
      .addTo(mapRef.current);
    
    markersRef.current.push(marker);

    if (mapRef.current) {
      mapRef.current.flyTo({ center: destLngLat, zoom: 15
       });
    }

    calculateRoute(lat, lng, poiName, false, {
      name: poiName,
      address: poiAddress,
      latitude: lat,
      longitude: lng,
      distance_meters: poi.dist || 0,
      category: poi.poi?.categories || [],
      score: 0,
      classifications: poi.poi?.classifications || [],
      imageUrl: buildStaticMapImage(lng, lat),
      ...details
    });
  };

  const handleSearch = async () => {
    if (!inputValue.trim()) return;

    try {
      const res = await services.fuzzySearch({
        key: API_KEY,
        query: inputValue,
        center: [userLoc.lng, userLoc.lat],
        limit: 1,
        openingHours: 'nextSevenDays'
      } as any);

      if (res.results && res.results.length > 0) {
        handleSelectSuggestion(res.results[0]);
      } else {
        alert('No locations found for: ' + inputValue);
      }
    } catch (e) {
      console.error('Search failed:', e);
      alert('Search failed. Please try again.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const navigateToSelectedLocation = async () => {
    if (!selectedLocation) return;
    setShowSidebar(false);
    setShowPoiSidebar(false);
    const routeName = selectedLocation.name || selectedLocation.address || 'Destination';
    await calculateRoute(selectedLocation.latitude, selectedLocation.longitude, routeName, true, selectedLocation);
    setSelectedLocation(null);
  };
  const addSelectedLocationToFavorites = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!selectedLocation) return;
    const locationSnapshot = selectedLocation;
    await addToFavorites(locationSnapshot);
  };
  const closeSelectedLocationPopup = () => {
    setSelectedLocation(null);
    setStats(null);
    setRouteFavoriteLocation(null);
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
    const serializedHours = serializeBusinessHours(loc.businessHours);
    if (serializedHours) params.set('businessHours', serializedHours);
    const serializedSocials = serializeSocials(loc.socials);
    if (serializedSocials) params.set('socials', serializedSocials);
    return `/map?${params.toString()}`;
  };
  const addRouteLocationToFavorites = async () => {
    if (!stats) return;
    const locationForFavorite: Business = routeFavoriteLocation ?? {
      name: stats.name || 'Selected Location',
      address: stats.name || 'Unknown Location',
      latitude: stats.lat,
      longitude: stats.lng,
      distance_meters: 0,
      category: [],
      score: 0,
      classifications: []
    };
    await addToFavorites(locationForFavorite);
  };

  const calculateRoute = async (
    dLat: number,
    dLng: number,
    name: string,
    autoStart = false,
    favoriteLocation?: Business
  ): Promise<RouteInfo | null> => {
    if (!mapRef.current) return null;

    const markersToRemove = [...poiMarkersRef.current];
    markersToRemove.forEach((m) => {
      try {
        m.remove();
      } catch (e) {
        console.error('Error removing POI marker:', e);
      }
    });
    
    const destMarkers = [...markersRef.current];
    destMarkers.forEach((m) => {
      try {
        m.remove();
      } catch (e) {
        console.error('Error removing destination marker:', e);
      }
    });
    
    poiMarkersRef.current = [];
    setPoiMarkers([]);
    setActivePoiType(null);
    markersRef.current = [];

    // Remove route layers and source
    if (mapRef.current && mapRef.current.getLayer('route-arrows')) {
      try { mapRef.current.removeLayer('route-arrows'); } catch (e) {}
    }
    if (mapRef.current && mapRef.current.getLayer('route')) {
      try { mapRef.current.removeLayer('route'); } catch (e) {}
    }
    if (mapRef.current && mapRef.current.getSource('route')) {
      try { mapRef.current.removeSource('route'); } catch (e) {}
    }

    try {
      const route = await services.calculateRoute({
        key: API_KEY,
        locations: `${userLoc.lng},${userLoc.lat}:${dLng},${dLat}`,
        instructionsType: 'text',
        traffic: true
      });

      const geojson = route.toGeoJson();

      // Safely remove existing source and layers with try/catch
      if (mapRef.current.getLayer('route-arrows')) {
        try { mapRef.current.removeLayer('route-arrows'); } catch (e) {}
      }
      if (mapRef.current.getLayer('route')) {
        try { mapRef.current.removeLayer('route'); } catch (e) {}
      }
      if (mapRef.current.getSource('route')) {
        try { mapRef.current.removeSource('route'); } catch (e) {}
      }

      // Add route source and layer
      mapRef.current.addSource('route', {
        type: 'geojson',
        data: geojson
      });

      mapRef.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        paint: { 'line-color': '#B794F4', 'line-width': 8, 'line-opacity': 0.9 }
      });

      // Build instructions array from guidance
      const rawInstructions = route.routes?.[0]?.guidance?.instructions || [];
      const instructions: RouteInstruction[] = [];

      // Process instructions from TomTom response
      if (rawInstructions.length > 0) {
        rawInstructions.forEach((inst: any) => {
          instructions.push({
            maneuverType: inst.maneuverType || 'straight',
            streetName: inst.streetName || '',
            message: inst.message || '',
            distance: inst.distance || 0,
            time: inst.travelTimeInSeconds || 0,
            point: inst.point || { lng: dLng, lat: dLat }
          });
        });
      }

      // If no instructions from guidance, create basic start/end instructions
      if (instructions.length === 0) {
        instructions.push({
          maneuverType: 'depart',
          streetName: 'Start at your location',
          message: 'Head towards ' + name,
          distance: 0,
          time: 0,
          point: { lng: userLoc.lng, lat: userLoc.lat }
        });
        instructions.push({
          maneuverType: 'arrive',
          streetName: name,
          message: 'You have arrived at ' + name,
          distance: 0,
          time: 0,
          point: { lng: dLng, lat: dLat }
        });
      }

      const summary = route.routes?.[0]?.summary || {};
      const totalDistance = summary.lengthInMeters || 0;
      const totalTime = summary.travelTimeInSeconds || 0;

      const routeInfo: RouteInfo = {
        name,
        lat: dLat,
        lng: dLng,
        miles: totalDistance > 0 ? (totalDistance * 0.000621371).toFixed(1) : '0',
        mins: totalTime > 0 ? Math.round(totalTime / 60) : 0,
        instructions,
        currentInstruction: 0
      };
      setStats(routeInfo);
      setRouteFavoriteLocation(
        {
          ...(favoriteLocation ?? {
            name: name || 'Selected Location',
            address: name || 'Unknown Location',
            latitude: dLat,
            longitude: dLng,
            distance_meters: 0,
            category: [],
            score: 0,
            classifications: []
          }),
          imageUrl: favoriteLocation?.imageUrl || buildStaticMapImage(dLng, dLat),
        }
      );
      if (autoStart) {
        startNavigationWithRoute(routeInfo);
      }
      return routeInfo;
    } catch (e) {
      console.error('Route calculation failed:', e);
      // Set fallback stats
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
            message: 'Navigate to ' + name,
            distance: 0,
            time: 0,
            point: { lng: dLng, lat: dLat }
          }
        ],
        currentInstruction: 0
      };
      setStats(fallbackRoute);
      setRouteFavoriteLocation(
        {
          ...(favoriteLocation ?? {
            name: name || 'Selected Location',
            address: name || 'Unknown Location',
            latitude: dLat,
            longitude: dLng,
            distance_meters: 0,
            category: [],
            score: 0,
            classifications: []
          }),
          imageUrl: favoriteLocation?.imageUrl || buildStaticMapImage(dLng, dLat),
        }
      );
      if (autoStart) {
        startNavigationWithRoute(fallbackRoute);
      }
      return fallbackRoute;
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1609.34).toFixed(1)}mi`;
  };

  if (!user) return <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">Loading...</div>;

  return (
    <div className="fixed inset-0 bg-neutral-900">
        <div ref={mapElement} className="w-full h-full relative [&_.tt-attribution]:hidden">

          {/*hiding sidebar*/}
          <Navbar page={`Map`}> 
            <Links link="tinder" className="text-[15px]">
              Findr <Heart size={18}/>
            </Links>
            <Links link="dashboard" className="text-[15px]">
              Dashboard <House size={18} />
            </Links>
            <Links link="reviews" className="text-[15px]">
              Reviews
            </Links>
          </Navbar>        
          {/*Animation for loading map*/}
          {!mapLoaded && !mapError && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#00d4ff] text-lg flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-[3px] border-neutral-800 border-t-[#00d4ff] rounded-full animate-spin"></div>
              <span>Loading Map...</span>
            </div>
          )}

          {/*Display for error*/}
          {mapError && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-neutral-900/98 border border-red-500 rounded-xl p-8 max-w-[400px] text-center z-[3000]">
              <div className="text-[40px] mb-4">⚠️</div>
              <h3 className="text-red-500 m-0 mb-2.5">Map Error</h3>
              <p className="text-gray-300 m-0 mb-5 leading-relaxed">{mapError}</p>
              <div className="text-xs text-gray-400 text-left bg-neutral-900 p-4 rounded-lg">
                <strong>To fix this:</strong><br/>
                1. Get a TomTom API key from <a href="https://developer.tomtom.com/" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff]">developer.tomtom.com</a><br/>
                2. Create a .env file in the frontend directory<br/>
                3. Add: VITE_TOMTOM_API_KEY=your_api_key<br/>
                4. Restart the dev server
              </div>
            </div>
          )}

          {/* Navigation Popup */}
          {isNavigating && stats && stats.instructions && stats.instructions.length > 0 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-neutral-900/98 border border-neutral-800 rounded-2xl w-80 z-[2000] shadow-2xl max-h-[50vh] overflow-hidden">
              <div className="flex justify-between items-center p-3 px-4 border-b border-neutral-800">
                <div className="flex items-center text-white gap-2.5 text-sm">
                  <span className="text-2xl">📍</span>
                  <div>
                    <h4 className="m-0 text-[#00d4ff] text-md">{stats.name}</h4>
                    <p className="m-0 mt-0.5 text-gray-400 text-[11px]">{stats.miles} mi • {stats.mins} min</p>
                    <LocationDetailBlock details={routeFavoriteLocation || undefined} />
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
                        showToastNotice('Voice guidance is not supported on this browser', true);
                        return;
                      }
                      setVoiceGuidanceEnabled((prev) => {
                        const next = !prev;
                        if (!next) {
                          window.speechSynthesis.cancel();
                        }
                        lastSpokenInstructionRef.current = null;
                        return next;
                      });
                    }}
                    title="Toggle live voice instructions"
                  >
                    {voiceGuidanceEnabled ? 'Voice On' : 'Voice Off'}
                  </button>
                  <button className="border-none text-[#00d4ff] w-7 h-7 rounded-full cursor-pointer text-sm hover:bg-white/5" onClick={() => cancelNavigation(true)}>✕</button>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-[#00d4ff1a] to-[#0096c80d]"> 
                <div className="rounded-lg border border-cyan-400/20 bg-black/20 px-3 py-2">
                  <p className="m-0 text-cyan-300 text-xs font-semibold">Step {navStep + 1}</p>
                  <p className="m-0 mt-1 text-white text-sm font-bold">{stats.instructions[navStep]?.streetName || stats.instructions[navStep]?.message || 'Unknown Address'}</p>
                </div>
              </div>

              <div className="flex justify-between items-center p-2.5 px-4 border-t border-neutral-800">
                <button className="bg-neutral-800 border-none text-white py-2 px-4 rounded-lg cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-700" onClick={prevNavStep} disabled={navStep === 0}>◀</button>
                <span className="text-gray-400 text-xs">{navStep + 1} / {stats.instructions.length}</span>
                <button className="bg-neutral-800 border-none text-white py-2 px-4 rounded-lg cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-700" onClick={nextNavStep} disabled={navStep >= stats.instructions.length - 1}>▶</button>
              </div>

              <div className="text-center p-2.5 text-[#00d4ff] cursor-pointer text-xs border-t border-neutral-800 hover:bg-white/5" onClick={() => setShowFullDirections(!showFullDirections)}>
                {showFullDirections ? '▲ Hide all steps' : '▼ Show all steps'}
              </div>

              {showFullDirections && (
                <div className="max-h-[150px] overflow-y-auto border-t border-neutral-800">
                  {stats.instructions.map((inst, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2.5 px-4 cursor-pointer border-b border-neutral-800 hover:bg-white/5 ${idx === navStep ? 'bg-[#00d4ff26] border-l-[3px] border-l-[#00d4ff]' : ''} ${idx < navStep ? 'opacity-50' : ''}`}
                      onClick={() => jumpToStep(idx)}
                    >
                      <p className="m-0 text-white text-xs">
                        <span className="text-cyan-300 font-semibold mr-2">#{idx + 1}</span>
                        {inst.streetName || inst.message || 'Unknown Address'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search Overlay */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 translate-y-20 w-[90%] max-w-[300px] duration-200 transition-all ease-in-out md:max-w-[500px] z-[1000]">
            <div className="bg-neutral-900/95 border border-neutral-800 rounded-xl overflow-hidden shadow-lg">
              <div className="flex items-center p-2 px-3 gap-2">
                <input
                  className="flex-1 border-none bg-transparent text-white text-sm outline-none placeholder-neutral-500"
                  placeholder="Search location..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                {inputValue && (
                  <button className="bg-transparent border-none text-slate-400 cursor-pointer text-lg p-1 px-2 hover:text-white" onClick={() => setInputValue('')}>x</button>
                )}
                <button className="bg-[#00d4ff] border-none text-black p-2 px-3 rounded-lg cursor-pointer text-sm font-bold hover:bg-[#00b7db]" onClick={handleSearch}>🔍</button>
              </div>

              {suggestions.length > 0 && (
                <div className="bg-neutral-900/95 border-t border-neutral-800 max-h-[180px] overflow-y-auto scrollbar-hide">
                  {suggestions.map((s, i) => (
                   <div key={i} className="p-3 border-b border-neutral-800 hover:bg-neutral-800" onClick={() => handleSelectSuggestion(s)}>
                   <strong className="text-white block text-sm">{s.poi?.name || s.address?.freeformAddress || 'Unknown'}</strong>
                   <span className="text-gray-400 text-sm">{s.address?.municipality || ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative mt-2.5 text-[14px]">
              <button
                onClick={() => setIsPoiDropdownOpen(!isPoiDropdownOpen)}
                className="w-full bg-neutral-900/95 text-white border border-neutral-800 p-3 rounded-xl flex justify-between items-center hover:border-[#00d4ff] transition-colors"
              >
                <span className="font-large">{activePoiType ? `Selected: ${activePoiType.replace('_', ' ')}` : 'Select Category'}</span>
                <span className={`transition-transform duration-200 ${isPoiDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>
              
              <AnimatePresence>
                {isPoiDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 w-full mt-2 bg-neutral-900/98 border border-neutral-800 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto z-[2000] shadow-xl scrollbar-hide"
                  >
                    {POI_GROUPS.map((group) => (
                      <div key={group.name}>
                        <div className={`px-3 py-2 text-xs font-bold text-white ${group.color} bg-opacity-20 border-b border-white/5`}>
                          {group.name}
                        </div>
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => searchPoi(item.id, item.type, item.icon, group.color)}
                            className={`w-full text-left px-4 py-3 text-gray-300 hover:bg-white/10 flex items-center gap-3 transition-colors border-b border-neutral-800 last:border-none ${activePoiType === item.type ? 'bg-white/5 text-[#00d4ff]' : ''}`}
                          >
                            <span className="text-xl">{item.icon}</span>
                            <span className="text-sm">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/*Favorite Location Sidebar*/}
          <AnimatePresence>
                    {showSidebar && (
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ duration: 0.3 }}
                            className="fixed top-20 bottom-3 right-2 z-[1500] w-[360px] rounded-2xl border border-cyan-500/30 bg-neutral-900/90 p-4 shadow-2xl backdrop-blur-xl"
                        >
                            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                                <h3 className="text-cyan-300 text-lg font-semibold">All Favorited Locations</h3>
                                <button
                                    onClick={() => setShowSidebar(false)}
                                    className="h-7 w-7 rounded-full bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="h-[calc(100%-48px)] overflow-y-auto pr-1">
                                {loadingFavorites ? (
                                    <p className="text-gray-400 text-center py-4">Loading favorite locations...</p>
                                ) : favoriteLocations.length === 0 && likedLocations.length===0? (
                                    <p className="text-gray-400 text-center py-4">No favorite locations yet. Visit the map to add some!</p>
                                ) : (
                                    favoriteLocations.map((loc, i) => (
                                        <div key={i} className="mb-3 rounded-xl border border-white/10 bg-neutral-800/55 p-3 hover:bg-neutral-800/80 transition-colors">
                                            <div className="flex-1 cursor-pointer " onClick={() => { setShowSidebar(false); setShowPoiSidebar(false); navigate(buildMapRouteUrl(loc)); }}>
                                                <h4 className="text-cyan-300 text-lg font-semibold">{loc.name}</h4>
                                                <p className="text-gray-400 text-sm">{loc.address}</p>
                                                <LocationDetailBlock details={loc} />
                                            </div>
                                        </div> 
                                    ))
                                )}
                                {likedLocations.length!==0&&(<p className="text-gray-400 text-center py-4">New Locations Liked</p>)}
                                {likedLocations.map((loc, index) => (
                                    <div
                                        key={index}
                                        className="mb-3 rounded-xl border border-white/10 bg-neutral-800/55 p-3 cursor-pointer hover:bg-neutral-800/80 transition-colors"
                                        onClick={() => { setShowSidebar(false); setShowPoiSidebar(false); navigate(buildMapRouteUrl(loc)); }}
                                    >
                                        <h4 className="text-cyan-300 text-lg font-semibold">{loc.name}</h4>
                                        <p className="text-gray-400 text-sm">{loc.address}</p>
                                        <LocationDetailBlock details={loc} />
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

          {/* POI Results Sidebar */}
          <AnimatePresence>
            {showPoiSidebar && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.3 }}
                style={{
                  marginTop,
                  marginBottom,
                  right,
                  backgroundColor: bgColor,
                  borderTopLeftRadius: borderRadius,
                  borderBottomLeftRadius: borderRadius,
                }}
                className="fixed top-20 bottom-3 right-2 z-[1500] w-[400px] rounded-2xl border border-cyan-500/30 bg-neutral-900/90 p-4 shadow-2xl backdrop-blur-xl flex flex-col"
              >
                <div className="mb-3 flex justify-between items-center border-b border-white/10 pb-2">
                  <h2 className="text-cyan-300 text-lg font-semibold">POI Locations</h2>
                  <button
                    onClick={() => setShowPoiSidebar(false)}
                    className="h-7 w-7 rounded-full bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="px-1 py-2 border-b border-white/10">
                  <div className="grid grid-cols-3 gap-2">
                    {(['5', '10', '20'] as const).map((radius) => (
                      <button
                        key={`sidebar-${radius}`}
                        onClick={() => setPoiRadiusFilter(radius)}
                        className={`text-xs py-1.5 px-2 rounded-md border transition-colors ${
                          poiRadiusFilter === radius
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/60'
                            : 'bg-neutral-800/60 text-neutral-300 border-neutral-700 hover:border-cyan-500/50'
                        }`}
                      >
                        {`${radius}mi`}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto pt-3 pr-1">
                  {filteredPoiResults.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No POI locations in this radius.</p>
                  ) : (
                    filteredPoiResults.map((poi) => (
                      <div
                        key={poi.id}
                        className="mb-3 rounded-xl border border-white/10 bg-neutral-800/50 p-4 cursor-pointer hover:bg-neutral-800/80 transition-colors"
                        onClick={() => { setShowPoiSidebar(false); handlePoiResultClick(poi); }}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{poi.icon}</span>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-cyan-400/80">{poi.name}</h3>
                            <p className="text-gray-400 text-sm">{poi.address}</p>
                            <p className="text-gray-500 text-xs mt-1">{metersToMiles(poi.distanceMeters).toFixed(1)} mi away</p>
                            {poi.categories.length > 0 && (
                              <p className="text-gray-500 text-xs mt-2">
                                {poi.categories.join(', ')}
                              </p>
                            )}
                            <LocationDetailBlock details={poi} />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {poiResults.length > 0 && !showSidebar && !showPoiSidebar && (
            <div className="absolute bottom-6 left-4 z-[1100] bg-neutral-900/95 border border-neutral-800 rounded-xl p-2 shadow-lg">
              <button
                onClick={() => setShowPoiSidebar(true)}
                className="w-full mb-2 text-xs py-1.5 px-2 rounded-md border border-neutral-700 bg-neutral-800/70 text-cyan-300 hover:border-cyan-500/50 transition-colors"
              >
                Open POI Sidebar
              </button>
              <div className="grid grid-cols-3 gap-2">
                {(['5', '10', '20'] as const).map((radius) => (
                  <button
                    key={radius}
                    onClick={() => setPoiRadiusFilter(radius)}
                    className={`text-xs py-1.5 px-2 rounded-md border transition-colors ${
                      poiRadiusFilter === radius
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/60'
                        : 'bg-neutral-800/60 text-neutral-300 border-neutral-700 hover:border-cyan-500/50'
                    }`}
                  >
                    {`${radius}mi`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Route Card */}
          {stats && !isNavigating && !selectedLocation && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-neutral-900/95 border border-neutral-800 p-4 rounded-2xl w-[300px] z-[1000] shadow-xl">
              <div className="mb-3">
                <h3 className="m-0 mb-1 text-[#00d4ff] text-sm">{stats.name}</h3>
                <p className="m-0 mb-3 text-gray-400 text-sm">{stats.miles} mi • {stats.mins} min</p>
                <LocationDetailBlock details={routeFavoriteLocation || undefined} />
              </div>
              <div className="flex gap-2.5">
                <button className="flex-[2] bg-[#00d4ff] text-black border-none p-2.5 rounded-lg font-bold cursor-pointer hover:bg-[#00b7db]" onClick={startNavigation}>Start Navigation</button>                
                <button className="flex-1 bg-neutral-800 text-white border-none p-2.5 rounded-lg cursor-pointer hover:bg-neutral-700" onClick={() => { setStats(null); clearMap(); }}>Close</button>
                <button className="flex items-center justify-center bg-neutral-800 border-none w-8 h-8 text-white rounded-full cursor-pointer text-sm hover:bg-neutral-700" onClick={addRouteLocationToFavorites}><HeartPlus className="justify-center items-center text-green-500 drop-shadow-lg"/></button>
              </div>
            </div>
          )}
          {/* Location Info Popup */}
          {showImageLocationPopup && selectedLocation && (
            <div className="absolute top-[58%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-neutral-900/98 border border-neutral-800 rounded-2xl w-80 z-[3000] shadow-2xl max-h-[72vh] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-neutral-800">
                <h3 className="m-0 text-[#00d4ff] text-lg">Location Details</h3> 
                <div className="flex items-center gap-2">
                <button className="flex items-center justify-center bg-neutral-800 border-none w-8 h-8 text-white rounded-full cursor-pointer text-sm hover:bg-neutral-700" onClick={addSelectedLocationToFavorites}><HeartPlus className="justify-center items-center text-green-500 drop-shadow-lg"/></button>
                <button className="bg-neutral-800 border-none w-8 h-8 rounded-full cursor-pointer text-sm hover:bg-neutral-700 text-red-500/80" onClick={closeSelectedLocationPopup}>✕</button>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <h4 className="text-cyan-300 text-base m-0">{selectedLocation.name}</h4>
                {selectedLocation.imageUrl && (
                  <div className="w-full h-[180px] bg-neutral-900 rounded-lg overflow-hidden flex items-center justify-center border border-neutral-800">
                    <img
                      src={selectedLocation.imageUrl} 
                      alt="Location" 
                      className="w-full h-full object-cover block"
                      onError={() => {
                        setSelectedLocation(prev => prev ? { ...prev, imageUrl: undefined } : prev);
                      }}
                    />
                  </div>
                )}
                <p className="text-white text-sm leading-relaxed p-2.5 bg-white/5 rounded-lg m-0">📍 {selectedLocation?.address}</p>
                <LocationDetailBlock details={selectedLocation} />
                <div className="flex justify-center pt-1">
                  <button className="bg-gradient-to-br from-[#6fe7ff] to-[#0099cc] text-black border-none p-3 px-6 rounded-lg font-bold cursor-pointer text-sm w-full transition-transform hover:scale-[1.02]" onClick={navigateToSelectedLocation}>Navigate ➤</button>
                </div>
              </div>
            </div>
          )}
          {/* Side Bar */}
          <div className={`absolute translate-y-92 items-center left-4 flex flex-col gap-3 z-[1000] text-[14px]`}>
            <button 
              onClick={() => { 
                if (!mapRef.current) return;
                if (trafficOn) {
                  mapRef.current.hideTrafficFlow();
                  mapRef.current.hideTrafficIncidents();
                } else {
                  mapRef.current.showTrafficFlow();
                  mapRef.current.showTrafficIncidents();
                }
                setTrafficOn(!trafficOn);
              }} 
              className={`w-[55px] h-[40px] md:w-[60px] md:h-[50px] bg-neutral-900/95 text-white border border-neutral-800 rounded-xl cursor-pointer text-[22px] flex flex-col items-center justify-center shadow-lg transition-all hover:scale-105 hover:border-[#00d4ff] ${trafficOn ? 'border-[#00d4ff] text-[#00d4ff] bg-[#00d4ff1a]' : ''}`} 
              title={trafficOn ? 'Hide Traffic' : 'Show Traffic'}
            >
              🚦
            </button> 
            <button 
              onClick={() => {
                if (mapRef.current) {
                  mapRef.current.flyTo({ center: [userLoc.lng, userLoc.lat], zoom: 15 });
                }
              }}
              className="text-[14px] w-[55px] h-[40px] md:w-[60px] md:h-[50px] bg-neutral-900/95 text-white border border-neutral-800 rounded-xl cursor-pointer text-[22px] flex flex-col items-center justify-center shadow-lg transition-all hover:scale-105 hover:border-[#00d4ff]"
              title="My Location"
            >
              📍
            </button>
            <button 
              onClick={() => {
                setMapPerspective(prev => prev === '2d' ? '3d' : '2d');
              }}
              className={`text-[14px] w-[55px] h-[40px] md:w-[60px] md:h-[50px] bg-neutral-900/95 text-white border border-neutral-800 rounded-xl cursor-pointer text-sm flex flex-col items-center justify-center shadow-lg transition-all hover:scale-105 hover:border-[#00d4ff] ${mapPerspective === '3d' ? 'border-[#00d4ff] text-[#00d4ff] bg-[#00d4ff1a]' : ''}`}
              title={mapPerspective === '2d' ? 'Switch to 3D View' : 'Switch to 2D View'}
            >
              <span className="text-[14px] font-bold tracking-wide">{mapPerspective === '2d' ? '2D' : '3D'}</span>
            </button>
            <button
              onClick={() => {
                setMapStyle(prev => {
                  const styles = ['regular', 'satellite', 'dark', 'hybrid'];
                  const currentIndex = styles.indexOf(prev);
                  const nextIndex = (currentIndex + 1) % styles.length;
                  return styles[nextIndex] as 'regular' | 'satellite' | 'dark' | 'hybrid';
                });
              }}
              className={`w-[55px] h-[40px] md:w-[60px] md:h-[50px] bg-neutral-900/95 text-white border border-neutral-800 rounded-xl cursor-pointer text-sm flex flex-col items-center justify-center shadow-lg transition-all hover:scale-105 hover:border-[#00d4ff] ${mapStyle !== 'regular' ? 'border-[#00d4ff] text-[#00d4ff] bg-[#00d4ff1a]' : ''}`}
              title={`Current: ${mapStyle}`}
            > 
              <span className="text-sm font-bold tracking-wide">{mapStyle.charAt(0).toUpperCase() + mapStyle.slice(1)}</span>
            </button>
            <button
              onClick={() => {
                setShowSidebar(!showSidebar);
                setShowPoiSidebar(false);
                fetchFavoriteLocations();
              }}
              className={`w-[55px] h-[40px] md:w-[60px] md:h-[50px] bg-neutral-900/95 text-white border border-neutral-800 rounded-xl cursor-pointer text-sm flex flex-col items-center justify-center shadow-lg transition-all hover:scale-105 hover:border-[#00d4ff]`}
              title={'Favorite Locations'}
            > 
              <span className="text-xs font-bold -tracking-wide">{`${showSidebar?'Close Sidebar':'Favorite Locations'}`}</span>
            </button>
          </div>
          <LocalAiChatPopup
            userName={user.username}
            activePage="map"
            currentLocation={userLoc}
            favoriteLocations={favoriteLocations.map((loc) => ({
              name: loc.name,
              address: loc.address,
              latitude: loc.latitude,
              longitude: loc.longitude,
            }))}
            visitedLocations={[]}
            likedLocations={likedLocations.map((loc) => ({
              name: loc.name,
              address: loc.address,
              latitude: loc.latitude,
              longitude: loc.longitude,
            }))}
            selectedPois={filteredPoiResults.map((poi) => ({
              name: poi.name,
              address: poi.address,
              latitude: poi.lat,
              longitude: poi.lng,
            }))}
            activeSelectionLabel={selectedLocation?.name || stats?.name || activePoiType || undefined}
          />
        </div>
      </div>
  );
};
 
export default Map;
