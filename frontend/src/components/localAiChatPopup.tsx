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

const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY;
const AI_API_KEY =
  import.meta.env.PUBLIC_AI_API_KEY ||
  import.meta.env.VITE_AI_API_KEY ||
  import.meta.env.VITE_GOOGLE_API_KEY;

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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Ask me about local locations, routes, and nearby businesses.\n\n• Example: Build a 1-day local food route.\n• Example: What should I visit within 5 miles?',
    },
  ]);
  const [fetchedVisitedLocations, setFetchedVisitedLocations] = useState<LocalPlace[]>([]);
  const [detectedLocation, setDetectedLocation] = useState<{ lat: number; lng: number } | null>(null);

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

  const effectiveVisitedLocations = useMemo(
    () => (fetchedVisitedLocations.length > 0 ? fetchedVisitedLocations : visitedLocations),
    [fetchedVisitedLocations, visitedLocations]
  );
  const effectiveLocation = useMemo(() => {
    if (currentLocation && Number.isFinite(currentLocation.lat) && Number.isFinite(currentLocation.lng)) {
      return currentLocation;
    }
    return detectedLocation;
  }, [currentLocation, detectedLocation]);
  const allKnownPlaces = useMemo(
    () => [...favoriteLocations, ...effectiveVisitedLocations, ...likedLocations, ...selectedPois],
    [favoriteLocations, effectiveVisitedLocations, likedLocations, selectedPois]
  );

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

  const buildLocalContext = () => {
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
      `Current highlighted selection: ${activeSelectionLabel || 'None'}.`,
      nearestAndFarthestSummary(),
      'You must answer only about local locations, routes, navigation, POIs, and local business recommendations.',
      'Prioritize places in the user vicinity. Prefer options within roughly 10 miles of current location when possible.',
      'Never ask the user for their location and never ask them to confirm their location.',
      'Use provided current location, selected POIs, and known map/popup locations directly.',
      'If asked for nearest/farthest, compute from provided context places.',
      'If user asks for routes, recommend route-relevant nearby places first.',
      'If asked anything unrelated, briefly refuse and redirect to local locations/routes.',
      'When suggesting places, use bullet points with • and put the place name first on each bullet.',
    ].join('\n');
  };

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

  const normalizeText = (value: string): string =>
    value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  const extractKnownPlaceCandidates = (text: string): string[] => {
    const haystack = normalizeText(text);
    if (!haystack) return [];

    const uniqueKnownPlaces: LocalPlace[] = [];
    const seen = new Set<string>();
    for (const place of allKnownPlaces) {
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

  const routeToKnownPlace = (query: string): boolean => {
    const q = normalizeText(query);
    if (!q) return false;
    const scored = allKnownPlaces
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

  const handleSendChat = async () => {
    const message = chatInput.trim();
    if (!message || chatLoading) return;
    if (!AI_API_KEY) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'AI key is missing. Add PUBLIC_AI_API_KEY in frontend/.env and restart the dev server.' },
      ]);
      return;
    }

    const nextMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: message }];
    setChatMessages(nextMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const aiMessages = [
        { role: 'user', content: `Context:\n${buildLocalContext()}` },
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
        ? assistantTextRaw.replace(/^- /gm, '• ')
        : 'I could not respond right now. Please try again.';
      setChatMessages((prev) => [...prev, { role: 'assistant', content: assistantText }]);
    } catch (error) {
      console.error('Chat error', error);
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: error instanceof Error ? error.message : 'I could not respond right now. Please try again.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[2000] w-[360px]">
      <div className="overflow-hidden rounded-2xl border border-cyan-500/30 bg-neutral-900/90 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-neutral-700 px-4 py-2.5">
          <p className="text-sm font-semibold tracking-wide text-cyan-300">BizMatch AI Assistant</p>
          <button
            className="rounded-md px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white"
            onClick={() => setChatOpen((prev) => !prev)}
          >
            {chatOpen ? 'Minimize' : 'Maximize'}
          </button>
        </div>

        {chatOpen && (
          <div className="flex h-[440px] flex-col">
            <div className="flex-1 space-y-2.5 overflow-y-auto bg-gradient-to-b from-neutral-900/30 to-transparent p-3.5">
              {chatMessages.map((msg, idx) => {
                const knownCandidates = msg.role === 'assistant' ? extractKnownPlaceCandidates(msg.content) : [];
                const fallbackCandidates =
                  msg.role === 'assistant' && knownCandidates.length === 0 ? extractLocationCandidates(msg.content) : [];
                const candidates = knownCandidates.length > 0 ? knownCandidates : fallbackCandidates;
                return (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[88%]">
                      <div
                        className={`whitespace-pre-wrap rounded-xl px-3 py-2.5 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-cyan-500 font-medium text-black'
                            : 'border border-neutral-700 bg-neutral-800 text-neutral-100'
                        }`}
                      >
                        {msg.content}
                      </div>
                      {candidates.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {candidates.map((candidate) => (
                            <button
                              key={`${idx}-${candidate}`}
                              onClick={() => routeToLocationFromText(candidate)}
                              disabled={routingTarget === candidate}
                              className="rounded-md border border-cyan-400/40 bg-cyan-500/15 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50"
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
                  <div className="max-w-[85%] rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-300">
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-end gap-2 border-t border-neutral-700 p-2.5">
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
                className="h-16 flex-1 resize-none rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-sm text-white outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleSendChat}
                disabled={chatLoading || !chatInput.trim()}
                className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
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
