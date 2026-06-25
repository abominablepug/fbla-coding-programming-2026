import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { POST as getAiChatResponse } from '../utils/aiChatResponse';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface LocalPlace {
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  isOpen?: boolean | null;
  rating?: number | null;
  tip?: string;
}

interface LocalAiChatPopupProps {
  userName?: string;
  activePage?: string;
  currentLocation?: { lat: number; lng: number };
  favoriteLocations?: LocalPlace[];
  visitedLocations?: LocalPlace[];
  likedLocations?: LocalPlace[];
  selectedPois?: LocalPlace[];
  activeSelectionLabel?: string;
}

const TOMTOM_API_KEY =
  import.meta.env.VITE_TOMTOM_API_KEY ||
  import.meta.env.PUBLIC_TOMTOM_API_KEY ||
  import.meta.env.TOMTOM_API_KEY;
const AI_API_KEY =
  import.meta.env.PUBLIC_AI_API_KEY ||
  import.meta.env.VITE_AI_API_KEY ||
  import.meta.env.VITE_GOOGLE_API_KEY;

// Local assistant popup combining context-aware chat and quick routing actions.
const LocalAiChatPopup = ({
  userName,
  activePage = 'app',
  currentLocation,
  favoriteLocations = [],
  visitedLocations = [],
  likedLocations = [],
  selectedPois = [],
  activeSelectionLabel,
}: LocalAiChatPopupProps) => {
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [routingTarget, setRoutingTarget] = useState<string | null>(null);
  const [latestTomTomPlaces, setLatestTomTomPlaces] = useState<LocalPlace[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Ask me about local locations, routes, and nearby businesses.\n\n• Example: Build a 1-day local food route.\n• Example: What should I visit within 5 miles?',
    },
  ]);
  const [fetchedVisitedLocations, setFetchedVisitedLocations] = useState<LocalPlace[]>([]);
  const [detectedLocation, setDetectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Infer practical search keywords from user intent for place lookup.
  const inferLocalSearchQuery = (message: string): string => {
    const q = message.toLowerCase();
    if (/(pizza|pizzeria)/.test(q)) return 'pizza';
    if (/(burger|burgers)/.test(q)) return 'burger';
    if (/(sushi)/.test(q)) return 'sushi';
    if (/(taco|tacos|mexican)/.test(q)) return 'tacos';
    if (/(ice cream|dessert|boba|bubble tea)/.test(q)) return 'dessert';
    if (/(food|eat|restaurant|dinner|lunch|breakfast|brunch)/.test(q)) return 'restaurant';
    if (/(coffee|cafe|tea)/.test(q)) return 'cafe';
    if (/(bar|nightlife|drink|club|pub)/.test(q)) return 'bar';
    if (/(gas|fuel)/.test(q)) return 'gas station';
    if (/(hotel|stay|lodging)/.test(q)) return 'hotel';
    if (/(park|outdoor|trail|hike)/.test(q)) return 'park';
    if (/(shopping|mall|store)/.test(q)) return 'shopping center';
    const cleaned = q
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(
        /\b(find|show|give|me|best|good|great|nice|places|place|near|nearby|around|local|for|to|with|the|a|an|please)\b/g,
        ' '
      )
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned || 'points of interest';
  };

  // Detect whether message asks for nearby discovery recommendations.
  const isLocalDiscoveryIntent = (message: string): boolean => {
    const q = message.toLowerCase();
    return /(near me|around me|nearby|current location|close by|closest|within \d+|local places|what.*near|pizza|restaurant|food|coffee|cafe|bar|hotel|gas|shopping|park|sushi|burger|taco)/.test(q);
  };

  // Fetch nearby TomTom places and format concise recommendation response.
  const getLocalRecommendations = async (rawMessage: string): Promise<string | null> => {
    if (!TOMTOM_API_KEY || !effectiveLocation) return null;
    const query = inferLocalSearchQuery(rawMessage);
    try {
      const res = await fetch(
        `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${encodeURIComponent(
          TOMTOM_API_KEY
        )}&lat=${encodeURIComponent(String(effectiveLocation.lat))}&lon=${encodeURIComponent(
          String(effectiveLocation.lng)
        )}&radius=16093&limit=5&openingHours=nextSevenDays`
      );
      if (!res.ok) return null;
      const data = await res.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      const places = results
        .filter((r: any) => r?.position && Number.isFinite(r.position.lat) && Number.isFinite(r.position.lon))
        .slice(0, 5)
        .map((r: any) => {
          const name = r?.poi?.name || r?.address?.freeformAddress || 'Unknown';
          const address = r?.address?.freeformAddress || 'Address unavailable';
          const distMiles = Number.isFinite(r?.dist) ? (r.dist * 0.000621371).toFixed(1) : '?';
          return `• ${name} - ${address} (${distMiles} mi)`;
        });

      if (places.length === 0) return null;
      return `Here are nearby "${query}" places from your location:\n${places.join('\n')}\n\nTap a Route button below to navigate.`;
    } catch (error) {
      console.error('Local recommendations lookup failed:', error);
      return null;
    }
  };

  // Load structured TomTom place objects for routing and context usage.
  const fetchTomTomPlaces = async (rawMessage: string, limit = 8): Promise<LocalPlace[]> => {
    if (!TOMTOM_API_KEY || !effectiveLocation) return [];
    const query = inferLocalSearchQuery(rawMessage);
    try {
      const res = await fetch(
        `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${encodeURIComponent(
          TOMTOM_API_KEY
        )}&lat=${encodeURIComponent(String(effectiveLocation.lat))}&lon=${encodeURIComponent(
          String(effectiveLocation.lng)
        )}&radius=16093&limit=${Math.max(1, Math.min(20, limit))}&openingHours=nextSevenDays`
      );
      if (!res.ok) return [];
      const data = await res.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      return results
        .filter((r: any) => r?.position && Number.isFinite(r.position.lat) && Number.isFinite(r.position.lon))
        .map((r: any) => ({
          name: r?.poi?.name || r?.address?.freeformAddress || 'Unknown',
          address: r?.address?.freeformAddress || 'Address unavailable',
          latitude: Number(r.position.lat),
          longitude: Number(r.position.lon),
          isOpen: typeof r?.poi?.openingHours?.openNow === 'boolean' ? r.poi.openingHours.openNow : null,
          rating: typeof r?.score === 'number' ? r.score : null,
        }))
        .slice(0, limit);
    } catch (error) {
      console.error('TomTom live place fetch failed:', error);
      return [];
    }
  };

  // Pull visited locations once to enrich assistant context memory.
  useEffect(() => {
    const fetchVisitedLocations = async () => {
      try {
        const response = await fetch('http://localhost:5173/loc/visited', {
          credentials: 'include',
        });
        if (!response.ok) return;
        const data = await response.json();
        const nextVisited: LocalPlace[] = Array.isArray(data)
          ? data.map((loc: any) => ({
              name: loc?.name || 'Unknown',
              address: loc?.address,
              latitude: Number(loc?.latitude) || 0,
              longitude: Number(loc?.longitude) || 0,
            }))
          : [];
        setFetchedVisitedLocations(nextVisited.filter((loc) => loc.latitude !== 0 || loc.longitude !== 0));
      } catch (error) {
        console.error('Error fetching visited locations for AI popup:', error);
      }
    };

    void fetchVisitedLocations();
  }, []);

  // Fall back to browser geolocation when map location is unavailable.
  useEffect(() => {
    if (currentLocation && Number.isFinite(currentLocation.lat) && Number.isFinite(currentLocation.lng)) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetectedLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setDetectedLocation(null);
      },
      { timeout: 8000 }
    );
  }, [currentLocation]);

  // Auto-open assistant once on dashboard for first-time visibility.
  useEffect(() => {
    const firstDashboardKey = 'bizmatch_ai_first_dashboard_opened';
    if (activePage !== 'dashboard') {
      setChatOpen(false);
      return;
    }

    try {
      const hasOpenedBefore = window.localStorage.getItem(firstDashboardKey) === '1';
      if (hasOpenedBefore) {
        setChatOpen(false);
        return;
      }

      setChatOpen(true);
      window.localStorage.setItem(firstDashboardKey, '1');
      const timer = window.setTimeout(() => {
        setChatOpen(false);
      }, 6000);
      return () => window.clearTimeout(timer);
    } catch (err) {
      setChatOpen(false);
    }
  }, [activePage]);

  // Prefer fetched history; otherwise use visited locations passed as props.
  const effectiveVisitedLocations = useMemo(
    () => (fetchedVisitedLocations.length > 0 ? fetchedVisitedLocations : visitedLocations),
    [fetchedVisitedLocations, visitedLocations]
  );
  // Choose best available coordinates for recommendations and route biasing.
  const effectiveLocation = useMemo(() => {
    if (currentLocation && Number.isFinite(currentLocation.lat) && Number.isFinite(currentLocation.lng)) {
      return currentLocation;
    }
    return detectedLocation;
  }, [currentLocation, detectedLocation]);
  // Merge all known places from favorites, visits, likes, and selections.
  const allKnownPlaces = useMemo(
    () => [...favoriteLocations, ...effectiveVisitedLocations, ...likedLocations, ...selectedPois],
    [favoriteLocations, effectiveVisitedLocations, likedLocations, selectedPois]
  );
  // De-duplicate routeable places so repeated results do not clutter actions.
  const allRouteablePlaces = useMemo(() => {
    const merged = [...allKnownPlaces, ...latestTomTomPlaces];
    const seen = new Set<string>();
    return merged.filter((place) => {
      const key = `${(place.name || '').trim().toLowerCase()}|${(place.address || '').trim().toLowerCase()}|${place.latitude}|${place.longitude}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allKnownPlaces, latestTomTomPlaces]);

  // Build concise context summaries consumed by the assistant prompt.
  const summarizePlaces = (title: string, places: LocalPlace[]) => {
    const summary = places
      .slice(0, 12)
      .map((loc) => {
        const openText =
          loc.isOpen === true ? 'Open now' : loc.isOpen === false ? 'Closed now' : 'Hours unknown';
        const ratingText = typeof loc.rating === 'number' ? `, rating ${loc.rating.toFixed(1)}/10` : '';
        const tipText = loc.tip ? `, tip: ${loc.tip}` : '';
        return `${loc.name} (${loc.address || 'No address'}) [${loc.latitude}, ${loc.longitude}] - ${openText}${ratingText}${tipText}`;
      })
      .join('; ');
    return `${title}: ${summary || 'None'}.`;
  };

  // Compute spherical distance in miles between two latitude-longitude points.
  const haversineMiles = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 3958.8;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };

  // Summarize nearest and farthest known places from current coordinates.
  const nearestAndFarthestSummary = () => {
    if (!effectiveLocation || allKnownPlaces.length === 0) {
      return 'Nearest/farthest places from current location: unavailable.';
    }
    const withDistance = allKnownPlaces
      .filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
      .map((place) => ({
        ...place,
        distance: haversineMiles(effectiveLocation.lat, effectiveLocation.lng, place.latitude, place.longitude),
      }))
      .sort((a, b) => a.distance - b.distance);

    if (withDistance.length === 0) {
      return 'Nearest/farthest places from current location: unavailable.';
    }

    const nearest = withDistance[0];
    const farthest = withDistance[withDistance.length - 1];
    return `Nearest place: ${nearest.name} (${nearest.distance.toFixed(2)} miles). Farthest place: ${farthest.name} (${farthest.distance.toFixed(2)} miles).`;
  };

  // Provide non-AI local response using currently loaded place context.
  const buildFallbackResponse = (message: string, livePlaces: LocalPlace[] = []): string => {
    const lower = message.toLowerCase();
    const sourcePlaces = livePlaces.length > 0 ? livePlaces : allKnownPlaces;
    const local = sourcePlaces
      .filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
      .slice(0, 5);
    if (local.length === 0) {
      return 'I can help with local places and routes, but I do not have enough nearby locations loaded yet. Open Map or Findr and try again.';
    }

    if (/(nearest|closest)/.test(lower) && effectiveLocation) {
      const ranked = [...local].sort((a, b) => {
        const da = haversineMiles(effectiveLocation.lat, effectiveLocation.lng, a.latitude, a.longitude);
        const db = haversineMiles(effectiveLocation.lat, effectiveLocation.lng, b.latitude, b.longitude);
        return da - db;
      });
      const top = ranked.slice(0, 3);
      return `Closest locations right now:\n${top
        .map((loc) => `• ${loc.name} - ${loc.address || 'No address'}`)
        .join('\n')}\n\nUse Route buttons below to navigate.`;
    }

    return `Here are local places from your current app context:\n${local
      .map((loc) => `• ${loc.name} - ${loc.address || 'No address'}`)
      .join('\n')}\n\nAsk for nearest, farthest, or route options and I can guide you.`;
  };

  // Construct detailed local-only system context for grounded assistant replies.
  const buildLocalContext = (liveTomTomPlaces: LocalPlace[] = []) => {
    const currentLocLine =
      effectiveLocation && Number.isFinite(effectiveLocation.lat) && Number.isFinite(effectiveLocation.lng)
        ? `Current user location: [${effectiveLocation.lat}, ${effectiveLocation.lng}].`
        : 'Current user location: Unknown.';

    return [
      `User: ${userName || 'Unknown'}.`,
      `Current page: ${activePage}.`,
      currentLocLine,
      summarizePlaces('Favorite locations', favoriteLocations),
      summarizePlaces('Visited locations', effectiveVisitedLocations),
      summarizePlaces('Newly liked locations', likedLocations),
      summarizePlaces('Selected POIs', selectedPois),
      summarizePlaces('All known map/popup locations', allKnownPlaces),
      summarizePlaces('Live TomTom places nearby (primary)', liveTomTomPlaces),
      `Current highlighted selection: ${activeSelectionLabel || 'None'}.`,
      nearestAndFarthestSummary(),
      'You must answer only about local locations, routes, navigation, POIs, and local business recommendations.',
      'Treat Live TomTom places nearby (primary) as the main source for recommendations when available.',
      'Prioritize places in the user vicinity. Prefer options within roughly 10 miles of current location when possible.',
      'Never ask the user for their location and never ask them to confirm their location.',
      'Use provided current location, selected POIs, and known map/popup locations directly.',
      'If asked for nearest/farthest, compute from provided context places.',
      'If user asks for routes, recommend route-relevant nearby places first.',
      'If asked anything unrelated, briefly refuse and redirect to local locations/routes.',
      'When suggesting places, use bullet points with • and put the place name first on each bullet.',
    ].join('\n');
  };

  // Parse candidate place names from assistant bullets and quoted phrases.
  const extractLocationCandidates = (text: string): string[] => {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const bulletCandidates = lines
      .filter((line) => /^([•\-*]|\d+\.)\s+/.test(line))
      .map((line) => line.replace(/^([•\-*]|\d+\.)\s+/, '').trim())
      .map((line) => line.split(' - ')[0].split(' — ')[0].split(': ')[0].trim())
      .filter((line) => line.length >= 3 && line.length <= 80);

    const quoted: string[] = [];
    const regex = /"([^"]{3,80})"/g;
    let match = regex.exec(text);
    while (match) {
      quoted.push(match[1].trim());
      match = regex.exec(text);
    }

    const all = [...bulletCandidates, ...quoted];
    const seen = new Set<string>();
    return all.filter((candidate) => {
      const key = candidate.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 5);
  };

  // Normalize text for fuzzy matching between user queries and place names.
  const normalizeText = (value: string): string =>
    value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  // Match assistant text against known places to expose route shortcuts.
  const extractKnownPlaceCandidates = (text: string): string[] => {
    const haystack = normalizeText(text);
    if (!haystack) return [];

    const uniqueKnownPlaces: LocalPlace[] = [];
    const seen = new Set<string>();
    for (const place of allRouteablePlaces) {
      const key = `${normalizeText(place.name || '')}|${normalizeText(place.address || '')}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      uniqueKnownPlaces.push(place);
    }

    const matched = uniqueKnownPlaces
      .filter((place) => {
        const name = normalizeText(place.name || '');
        return name.length > 2 && haystack.includes(name);
      })
      .map((place) => place.name)
      .filter(Boolean) as string[];

    return matched.slice(0, 5);
  };

  // Route directly when query matches an already known place confidently.
  const routeToKnownPlace = (query: string): boolean => {
    const q = normalizeText(query);
    if (!q) return false;
    const scored = allRouteablePlaces
      .map((place) => {
        const name = normalizeText(place.name || '');
        const address = normalizeText(place.address || '');
        let score = 0;
        if (name === q) score = 100;
        else if (address === q) score = 90;
        else if (name.startsWith(q)) score = 80;
        else if (q.startsWith(name) && name.length > 3) score = 70;
        else if (name.includes(q) && q.length >= 4) score = 60;
        else if (address.includes(q) && q.length >= 4) score = 50;
        return { place, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    const found = scored[0]?.place;
    if (!found || !Number.isFinite(found.latitude) || !Number.isFinite(found.longitude)) return false;

    const params = new URLSearchParams({
      lat: String(found.latitude),
      lon: String(found.longitude),
      name: found.name || query,
      address: found.address || found.name || query,
    });
    navigate(`/map?${params.toString()}`);
    return true;
  };

  // Resolve arbitrary text to coordinates, then navigate map route target.
  const routeToLocationFromText = async (query: string) => {
    const q = query.trim();
    if (!q) return;
    if (routeToKnownPlace(q)) return;
    if (!TOMTOM_API_KEY) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Routing needs VITE_TOMTOM_API_KEY for new location lookups.' },
      ]);
      return;
    }
    setRoutingTarget(q);
    try {
      const latBias =
        effectiveLocation && Number.isFinite(effectiveLocation.lat) && Number.isFinite(effectiveLocation.lng)
          ? `&lat=${effectiveLocation.lat}&lon=${effectiveLocation.lng}`
          : '';
      const res = await fetch(
        `https://api.tomtom.com/search/2/search/${encodeURIComponent(q)}.json?key=${encodeURIComponent(
          TOMTOM_API_KEY
        )}&limit=5&typeahead=true${latBias}`
      );
      const data = await res.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      const first = results
        .filter((r: any) => r?.position && Number.isFinite(r.position.lat) && Number.isFinite(r.position.lon))
        .sort((a: any, b: any) => {
          const da = Number.isFinite(a?.dist) ? a.dist : Number.MAX_SAFE_INTEGER;
          const db = Number.isFinite(b?.dist) ? b.dist : Number.MAX_SAFE_INTEGER;
          return da - db;
        })[0];
      const pos = first?.position;
      if (!pos || !Number.isFinite(pos.lat) || !Number.isFinite(pos.lon)) {
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `I could not find route coordinates for "${q}". Try a more specific place name.` },
        ]);
        return;
      }

      const name = first?.poi?.name || first?.address?.freeformAddress || q;
      const address = first?.address?.freeformAddress || name;
      const params = new URLSearchParams({
        lat: String(pos.lat),
        lon: String(pos.lon),
        name,
        address,
      });
      navigate(`/map?${params.toString()}`);
    } catch (error) {
      console.error('Route from chat failed:', error);
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Routing failed for "${q}". Please try again.` },
      ]);
    } finally {
      setRoutingTarget(null);
    }
  };

  // Remove markdown artifacts so assistant replies render cleanly in bubbles.
  const sanitizeAssistantResponse = (text: string): string => {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/```/g, '')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^>\s?/gm, '')
      .replace(/^\s*[-*]\s+/gm, '• ')
      .replace(/^\s*\d+\)\s+/gm, (m) => `${m.replace(')', '.').trimStart()}`)
      .replace(/\*\*/g, '')
      .replace(/__/g, '')
      .replace(/`/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  // Render multiline assistant text while preserving bullet formatting consistency.
  const renderAssistantText = (content: string) => {
    const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
    return (
      <div className="space-y-1">
        {lines.map((line, lineIdx) => {
          const isBullet = line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ');
          const normalizedLine = isBullet ? `• ${line.replace(/^[•\-*]\s*/, '')}` : line;
          return (
            <p key={`${lineIdx}-${normalizedLine}`} className="m-0">
              {normalizedLine}
            </p>
          );
        })}
      </div>
    );
  };

  // Send message, fetch recommendations, and append assistant response safely.
  const handleSendChat = async () => {
    const message = chatInput.trim();
    if (!message || chatLoading) return;
    if (!AI_API_KEY) {
      const liveTomTomPlaces = await fetchTomTomPlaces(message, 8);
      setLatestTomTomPlaces(liveTomTomPlaces);
      const localReply = await getLocalRecommendations(message);
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: localReply || buildFallbackResponse(message, liveTomTomPlaces) },
      ]);
      setChatInput('');
      return;
    }

    const nextMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: message }];
    setChatMessages(nextMessages);
    setChatInput('');
    setChatLoading(true);
    let liveTomTomPlacesForTurn: LocalPlace[] = [];

    try {
      liveTomTomPlacesForTurn = await fetchTomTomPlaces(message, 8);
      setLatestTomTomPlaces(liveTomTomPlacesForTurn);

      if (isLocalDiscoveryIntent(message)) {
        const localReply = await getLocalRecommendations(message);
        if (localReply) {
          setChatMessages((prev) => [...prev, { role: 'assistant', content: localReply }]);
          return;
        }
      }

      const aiMessages = [
        { role: 'user', content: `Context:\n${buildLocalContext(liveTomTomPlacesForTurn)}` },
        ...nextMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ];

      const request = new Request('http://localhost/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: aiMessages }),
      });

      const response = await getAiChatResponse(request);
      const data = await response.json();
      if (!response.ok) {
        const status = response.status;
        const detail = data?.error?.message || data?.error || data?.message || '';
        if (status === 401 || status === 403) {
          throw new Error('Authentication failed. Check PUBLIC_AI_API_KEY in frontend/.env and restart dev server.');
        }
        throw new Error(detail || `AI request failed with status ${status}`);
      }
      const assistantTextRaw = data?.choices?.[0]?.message?.content;
      const assistantText = typeof assistantTextRaw === 'string' && assistantTextRaw.trim()
        ? sanitizeAssistantResponse(assistantTextRaw)
        : 'I could not respond right now. Please try again.';
      setChatMessages((prev) => [...prev, { role: 'assistant', content: assistantText }]);
    } catch (error) {
      console.error('Chat error', error);
      const localReply = await getLocalRecommendations(message);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            (error instanceof Error ? error.message : 'AI error.') +
            '\n\n' +
            (localReply || buildFallbackResponse(message, liveTomTomPlacesForTurn)),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="fixed bottom-2 right-2 z-[2000] w-[calc(100vw-1rem)] max-w-[360px] max-[420px]:max-w-[300px] sm:bottom-5 sm:right-5">
      <div className="overflow-hidden rounded-2xl border border-cyan-500/30 bg-neutral-900/90 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-neutral-700 px-3 py-2 max-[420px]:px-2.5 max-[420px]:py-1.5 sm:px-4 sm:py-2.5">
          <p className="text-xs font-semibold tracking-wide text-cyan-300 max-[420px]:text-[11px] sm:text-sm">LuminX AI Assistant</p>
          <button
            className="rounded-md px-2 py-1 text-[11px] text-neutral-300 hover:bg-neutral-800 hover:text-white max-[420px]:px-1.5 max-[420px]:py-0.5 max-[420px]:text-[10px] sm:px-2.5 sm:text-xs"
            onClick={() => setChatOpen((prev) => !prev)}
          >
            {chatOpen ? 'Minimize' : 'Maximize'}
          </button>
        </div>

        {chatOpen && (
          <div className="flex h-[58vh] max-[420px]:h-[52vh] flex-col sm:h-[440px]">
            <div className="flex-1 space-y-2 overflow-y-auto bg-gradient-to-b from-neutral-900/30 to-transparent p-2.5 sm:space-y-2.5 sm:p-3.5">
              {chatMessages.map((msg, idx) => {
                const knownCandidates = msg.role === 'assistant' ? extractKnownPlaceCandidates(msg.content) : [];
                const fallbackCandidates =
                  msg.role === 'assistant' && knownCandidates.length === 0 ? extractLocationCandidates(msg.content) : [];
                const candidates = knownCandidates.length > 0 ? knownCandidates : fallbackCandidates;
                return (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[88%]">
                      <div
                        className={`whitespace-pre-wrap rounded-xl px-2.5 py-2 text-xs leading-relaxed sm:px-3 sm:py-2.5 sm:text-sm ${
                          msg.role === 'user'
                            ? 'bg-cyan-500 font-medium text-white'
                            : 'border border-neutral-700 bg-neutral-800 text-neutral-100'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          renderAssistantText(msg.content)
                        ) : (
                          msg.content
                        )}
                      </div>
                      {candidates.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {candidates.map((candidate) => (
                            <button
                              key={`${idx}-${candidate}`}
                              onClick={() => routeToLocationFromText(candidate)}
                              disabled={routingTarget === candidate}
                            className="rounded-md border border-cyan-400/40 bg-cyan-500/15 px-2 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50 sm:text-xs"
                          >
                            {routingTarget === candidate ? 'Routing...' : `Route: ${candidate}`}
                          </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-xs text-neutral-300 sm:text-sm">
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-end gap-2 border-t border-neutral-700 p-2 sm:p-2.5">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChat();
                  }
                }}
                placeholder="Ask about local places and routes..."
                className="h-14 flex-1 resize-none rounded-xl border border-neutral-700 bg-neutral-800 p-2 text-xs text-white outline-none focus:border-cyan-500 sm:h-16 sm:p-2.5 sm:text-sm"
              />
              <button
                onClick={handleSendChat}
                disabled={chatLoading || !chatInput.trim()}
                className="rounded-xl bg-cyan-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-2.5 sm:text-sm"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalAiChatPopup;
