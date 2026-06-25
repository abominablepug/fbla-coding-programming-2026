import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bookmark, BookmarkCheck, Heart, MapPin, Star, TicketPercent } from 'lucide-react';
import Body from '../components/body';
import Navbar from '../components/navbar';
import Links from '../components/links';
import Card from '../components/card';
import LocalAiChatPopup from '../components/localAiChatPopup';
import { enqueueAlert } from '../components/alerts';
import { getSampleGoogleReviewsForLocation } from '../utils/googleReviews';
import { resolveLocationId } from '../utils/locationResolver';

interface Location {
  lid: number;
  name: string;
  longitude: number;
  latitude: number;
  type: number;
  address?: string;
  categories?: string[];
  visited_at?: string;
}

interface BackendReview {
  user_id: number;
  username: string;
  star_rating: number;
  content: string;
}

interface CouponSuggestion {
  location: Location;
  sourceType: 'personal' | 'nearby';
  title: string;
  code: string;
  discountLabel: string;
  expiresAt: string;
  reason: string;
  sourceNote: string;
  rating: number | null;
  tipPreview: string | null;
}

interface FsqSnapshot {
  rating: number | null;
  tipCount: number;
  topTip: string | null;
}

interface SavedCouponMeta {
  key: string;
  name: string;
  title: string;
  discountLabel: string;
  code: string;
  lid: number;
  sourceType: 'personal' | 'nearby';
  address?: string;
}

interface ReviewModalLocation {
  lid: number;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  categories?: string[];
}

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5173';
const FOURSQUARE_API_KEY =
  import.meta.env.VITE_FOURSQUARE_API_KEY || import.meta.env.PUBLIC_FOURSQUARE_API_KEY;
const TOMTOM_API_KEY =
  import.meta.env.VITE_TOMTOM_API_KEY || import.meta.env.PUBLIC_TOMTOM_API_KEY || import.meta.env.TOMTOM_API_KEY;

// Computes normalize category output used by downstream rendering and actions.
const normalizeCategory = (location: Location): string => {
  const first = location.categories?.[0]?.toLowerCase() || '';
  if (/(restaurant|food|cafe|coffee|pizza|bar|nightlife)/.test(first)) return 'dining';
  if (/(shopping|store|retail|mall)/.test(first)) return 'shopping';
  if (/(outdoor|park|activity|fitness|sports)/.test(first)) return 'activities';
  return 'local';
};

// Manages build map route url behavior for this page and linked UI flows.
const buildMapRouteUrl = (loc: Location) => {
  const params = new URLSearchParams({
    lat: String(loc.latitude),
    lon: String(loc.longitude),
    name: loc.name || '',
    address: loc.address || '',
  });
  return `/map?${params.toString()}`;
};

// Manages format date behavior for this page and linked UI flows.
const formatDate = (iso?: string) => {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleString();
};

// Computes clamp output used by downstream rendering and actions.
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
// Computes stars output used by downstream rendering and actions.
const stars = (rating: number) => '★'.repeat(Math.max(1, Math.min(5, Math.round(rating))));

// Handles dedupe locations logic and updates related state transitions safely.
const dedupeLocations = (locations: Location[]): Location[] => {
  const seen = new Set<string>();
  return locations.filter((loc) => {
    const key = loc.lid > 0
      ? `lid:${loc.lid}`
      : `${(loc.name || '').trim().toLowerCase()}|${(loc.address || '').trim().toLowerCase()}|${loc.latitude}|${loc.longitude}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Manages dedupe strings behavior for this page and linked UI flows.
const dedupeStrings = (values: string[]): string[] => Array.from(new Set(values));

// Manages dedupe coupons behavior for this page and linked UI flows.
const dedupeCoupons = (coupons: CouponSuggestion[]): CouponSuggestion[] => {
  const seen = new Set<string>();
  return coupons.filter((coupon) => {
    const key = `${coupon.sourceType}|${coupon.location.lid}|${coupon.code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Manages coupons behavior for this page and linked UI flows.
const Coupons = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { from?: string; locationId?: number } | null;

  const [user, setUser] = useState<{ uid: number; username: string } | null>(null);
  const [favoriteLocations, setFavoriteLocations] = useState<Location[]>([]);
  const [visitedLocations, setVisitedLocations] = useState<Location[]>([]);
  const [nearbyLocations, setNearbyLocations] = useState<Location[]>([]);

  const [personalCoupons, setPersonalCoupons] = useState<CouponSuggestion[]>([]);
  const [nearbyCoupons, setNearbyCoupons] = useState<CouponSuggestion[]>([]);

  const [showPersonalCoupons, setShowPersonalCoupons] = useState(true);
  const [showNearbyCoupons, setShowNearbyCoupons] = useState(true);
  const [showSavedCouponsSidebar, setShowSavedCouponsSidebar] = useState(false);
  const [savedCouponKeys, setSavedCouponKeys] = useState<string[]>([]);
  const [savedCouponMeta, setSavedCouponMeta] = useState<Record<string, SavedCouponMeta>>({});
  const [loading, setLoading] = useState(true);
  const [reviewModalLocation, setReviewModalLocation] = useState<ReviewModalLocation | null>(null);
  const [reviewModalLoading, setReviewModalLoading] = useState(false);
  const [reviewModalReviews, setReviewModalReviews] = useState<BackendReview[]>([]);
  const [reviewModalResolvedLid, setReviewModalResolvedLid] = useState<number | null>(null);
  const nearbySectionRef = useRef<HTMLDivElement | null>(null);
  const personalSectionRef = useRef<HTMLDivElement | null>(null);

  const requestedLocationId = typeof routeState?.locationId === 'number' ? routeState.locationId : null;
  // Handles scroll to section logic and updates related state transitions safely.
  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const reviewModalGoogleReviews = useMemo(
    () =>
      reviewModalLocation
        ? getSampleGoogleReviewsForLocation({
            lid: reviewModalLocation.lid,
            name: reviewModalLocation.name,
            address: reviewModalLocation.address,
          })
        : [],
    [reviewModalLocation]
  );

  // Computes fetch foursquare snapshot output used by downstream rendering and actions.
  const fetchFoursquareSnapshot = async (loc: Location): Promise<FsqSnapshot> => {
    if (!FOURSQUARE_API_KEY) return { rating: null, tipCount: 0, topTip: null };
    try {
      const headers = {
        Authorization: FOURSQUARE_API_KEY,
        Accept: 'application/json',
      };
      const searchRes = await fetch(
        `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(
          loc.name
        )}&ll=${loc.latitude},${loc.longitude}&radius=1800&limit=3`,
        { headers }
      );
      if (!searchRes.ok) return { rating: null, tipCount: 0, topTip: null };
      const searchData = await searchRes.json();
      const best = Array.isArray(searchData?.results) ? searchData.results[0] : null;
      const fsqId = best?.fsq_id;
      if (!fsqId) return { rating: null, tipCount: 0, topTip: null };

      const [detailsRes, tipsRes] = await Promise.all([
        fetch(`https://api.foursquare.com/v3/places/${fsqId}?fields=rating`, { headers }),
        fetch(`https://api.foursquare.com/v3/places/${fsqId}/tips?limit=5`, { headers }),
      ]);

      const detailsData = detailsRes.ok ? await detailsRes.json() : null;
      const tipsData = tipsRes.ok ? await tipsRes.json() : null;
      const tips = Array.isArray(tipsData?.results)
        ? tipsData.results
        : Array.isArray(tipsData)
        ? tipsData
        : [];
      const topTip = typeof tips?.[0]?.text === 'string' ? tips[0].text : null;
      return {
        rating: typeof detailsData?.rating === 'number' ? detailsData.rating : null,
        tipCount: tips.length,
        topTip,
      };
    } catch {
      return { rating: null, tipCount: 0, topTip: null };
    }
  };

  // Handles fetch community reviews logic and updates related state transitions safely.
  const fetchCommunityReviews = async (locationId: number): Promise<BackendReview[]> => {
    if (locationId <= 0) return [];
    try {
      const res = await fetch(`http://localhost:5173/rate/loc/${locationId}/reviews`, {
        credentials: 'include',
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data?.reviews) ? data.reviews : [];
    } catch {
      return [];
    }
  };

  // Manages open community reviews modal behavior for this page and linked UI flows.
  const openCommunityReviewsModal = async (loc: ReviewModalLocation) => {
    setReviewModalLocation(loc);
    setReviewModalReviews([]);
    setReviewModalLoading(true);
    setReviewModalResolvedLid(null);
    try {
      let resolvedLid = loc.lid > 0 ? loc.lid : null;
      if (!resolvedLid) {
        resolvedLid = await resolveLocationId({
          lid: loc.lid,
          name: loc.name,
          address: loc.address,
          latitude: loc.latitude,
          longitude: loc.longitude,
          type: 1,
          categories: loc.categories || [],
        });
      }

      setReviewModalResolvedLid(resolvedLid);
      if (!resolvedLid) {
        setReviewModalReviews([]);
        return;
      }

      const reviews = await fetchCommunityReviews(resolvedLid);
      const cleaned = reviews
        .filter(
          (review) =>
            review &&
            Number.isFinite(Number(review.user_id)) &&
            typeof review.username === 'string' &&
            Number.isFinite(Number(review.star_rating)) &&
            typeof review.content === 'string'
        )
        .map((review) => ({
          user_id: Number(review.user_id),
          username: review.username.trim() || 'Unknown user',
          star_rating: clamp(Math.round(Number(review.star_rating) || 1), 1, 5),
          content: review.content.trim(),
        }))
        .filter((review) => review.content.length > 0);
      setReviewModalReviews(cleaned);
    } finally {
      setReviewModalLoading(false);
    }
  };

  // Computes fetch nearby tom tom locations output used by downstream rendering and actions.
  const fetchNearbyTomTomLocations = async (
    current: { lat: number; lng: number },
    limitPerQuery = 4
  ): Promise<Location[]> => {
    if (!TOMTOM_API_KEY) return [];
    const queries = ['restaurant', 'coffee', 'shopping center', 'park'];

    const grouped = await Promise.all(
      queries.map(async (query, queryIndex) => {
        try {
          const res = await fetch(
            `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${encodeURIComponent(
              TOMTOM_API_KEY
            )}&lat=${encodeURIComponent(String(current.lat))}&lon=${encodeURIComponent(
              String(current.lng)
            )}&radius=12000&limit=${limitPerQuery}&openingHours=nextSevenDays`
          );
          if (!res.ok) return [] as Location[];
          const data = await res.json();
          const results = Array.isArray(data?.results) ? data.results : [];
          return results
            .filter((r: any) => r?.position && Number.isFinite(r.position.lat) && Number.isFinite(r.position.lon))
            .map((r: any, idx: number) => ({
              lid: -((queryIndex + 1) * 1000 + idx + 1),
              name: r?.poi?.name || r?.address?.freeformAddress || 'Nearby place',
              address: r?.address?.freeformAddress || 'Address unavailable',
              latitude: Number(r.position.lat),
              longitude: Number(r.position.lon),
              type: 1,
              categories: [query],
            }));
        } catch {
          return [] as Location[];
        }
      })
    );

    return dedupeLocations(grouped.flat()).slice(0, 10);
  };

  // Computes build coupon output used by downstream rendering and actions.
  const buildCoupon = async (
    loc: Location,
    idx: number,
    sourceType: 'personal' | 'nearby'
  ): Promise<CouponSuggestion> => {
    const category = normalizeCategory(loc);
    const reviews = sourceType === 'personal' ? await fetchCommunityReviews(loc.lid) : [];
    const reviewCount = reviews.length;
    const reviewAvg =
      reviewCount > 0
        ? reviews.reduce((sum, r) => sum + (Number(r.star_rating) || 0), 0) / reviewCount
        : null;

    const fsq = reviewCount > 0 ? { rating: null, tipCount: 0, topTip: null } : await fetchFoursquareSnapshot(loc);
    const qualitySignal = reviewAvg ?? (typeof fsq.rating === 'number' ? fsq.rating / 2 : 3);

    const baseDiscount =
      category === 'dining' ? 18 : category === 'shopping' ? 14 : category === 'activities' ? 12 : 10;
    const bonus = clamp(Math.round((qualitySignal - 3) * 3), 0, 10);
    const discount = clamp(baseDiscount + bonus, 10, 30);

    const now = new Date();
    const expires = new Date(now.getTime() + (7 + idx) * 24 * 60 * 60 * 1000);
    const codePrefix = loc.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5) || 'LOCAL';
    const code = `${codePrefix}${String(discount)}OFF`;

    const title =
      category === 'dining'
        ? `${discount}% Off Your Next Meal`
        : category === 'shopping'
        ? `${discount}% Off In-Store Purchase`
        : category === 'activities'
        ? `${discount}% Off Activity Booking`
        : `${discount}% Local Discount`;

    const reason =
      reviewCount > 0
        ? `Built from your favorites/recent visits and ${reviewCount} community review${reviewCount > 1 ? 's' : ''}.`
        : sourceType === 'nearby'
        ? 'Built from nearby local businesses in your current vicinity.'
        : fsq.tipCount > 0
        ? `No local review data yet, using ${fsq.tipCount} Foursquare tip${fsq.tipCount > 1 ? 's' : ''} as signal.`
        : 'Built from your personal location history and local category fit.';

    const sourceNote =
      reviewCount > 0
        ? `Community rating: ${(reviewAvg || 0).toFixed(1)} / 5`
        : typeof fsq.rating === 'number'
        ? `Foursquare rating: ${fsq.rating.toFixed(1)} / 10`
        : sourceType === 'nearby'
        ? 'Vicinity + category signal used'
        : 'Local fallback signal used';

    return {
      location: loc,
      sourceType,
      title,
      code,
      discountLabel: `${discount}% OFF`,
      expiresAt: expires.toLocaleDateString(),
      reason,
      sourceNote,
      rating: reviewAvg,
      tipPreview: fsq.topTip,
    };
  };

  // Handles get coupon key logic and updates related state transitions safely.
  const getCouponKey = (coupon: CouponSuggestion): string =>
    `${coupon.sourceType}|${coupon.location.lid}|${coupon.code}`;

  // Computes toggle saved coupon output used by downstream rendering and actions.
  const toggleSavedCoupon = (coupon: CouponSuggestion) => {
    const key = getCouponKey(coupon);
    const meta: SavedCouponMeta = {
      key,
      name: coupon.location.name,
      title: coupon.title,
      discountLabel: coupon.discountLabel,
      code: coupon.code,
      lid: coupon.location.lid,
      sourceType: coupon.sourceType,
      address: coupon.location.address,
    };
    setSavedCouponKeys((prev) => {
      const isSaved = prev.includes(key);
      if (isSaved) {
        setSavedCouponMeta((curr) => {
          const next = { ...curr };
          delete next[key];
          return next;
        });
        enqueueAlert({ message: 'Coupon unsaved.', textColor: 'text-red-300' });
        return prev.filter((k) => k !== key);
      }
      setSavedCouponMeta((curr) => ({ ...curr, [key]: meta }));
      enqueueAlert({ message: 'Coupon saved.', textColor: 'text-green-300' });
      return dedupeStrings([...prev, key]);
    });
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const profileRes = await fetch(`${AUTH_BASE_URL}/auth/dashboard`, { credentials: 'include' });
        if (!profileRes.ok) {
          navigate('/login');
          return;
        }
        const profileData = await profileRes.json();
        setUser({ uid: Number(profileData.uid), username: profileData.username });
        try {
          const storageKey = `bizmatch_saved_coupons_${Number(profileData.uid)}`;
          const raw = window.localStorage.getItem(storageKey);
          const parsed = raw ? JSON.parse(raw) : [];
          setSavedCouponKeys(Array.isArray(parsed) ? dedupeStrings(parsed.filter((v): v is string => typeof v === 'string')) : []);
        } catch {
          setSavedCouponKeys([]);
        }
        try {
          const metaStorageKey = `bizmatch_saved_coupon_meta_${Number(profileData.uid)}`;
          const rawMeta = window.localStorage.getItem(metaStorageKey);
          const parsedMeta = rawMeta ? JSON.parse(rawMeta) : {};
          setSavedCouponMeta(parsedMeta && typeof parsedMeta === 'object' ? parsedMeta : {});
        } catch {
          setSavedCouponMeta({});
        }
        const [visitedRes, favoritesRes] = await Promise.all([
          fetch('http://localhost:5173/loc/visited', { credentials: 'include' }),
          fetch('http://localhost:5173/loc/favorites', { credentials: 'include' }),
        ]);

        const visitedRaw: Location[] = visitedRes.ok ? await visitedRes.json() : [];
        const favoritesRaw: Location[] = favoritesRes.ok ? await favoritesRes.json() : [];

        const uniqueVisited = dedupeLocations(visitedRaw);
        const uniqueFavorites = dedupeLocations(favoritesRaw);

        setVisitedLocations(uniqueVisited);
        setFavoriteLocations(uniqueFavorites);

        let nearby: Location[] = [];
        try {
          const geoloc = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
            if (!navigator.geolocation) {
              resolve(null);
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => resolve(null),
              { timeout: 8000 }
            );
          });

          if (geoloc) {
            nearby = await fetchNearbyTomTomLocations(geoloc, 4);
          }
        } catch {
          nearby = [];
        }

        setNearbyLocations(nearby);

        const personalBase = dedupeLocations([...uniqueFavorites, ...uniqueVisited]).slice(0, 12);
        const [generatedPersonalRaw, generatedNearbyRaw] = await Promise.all([
          Promise.all(personalBase.map((loc, idx) => buildCoupon(loc, idx, 'personal'))),
          Promise.all(nearby.slice(0, 10).map((loc, idx) => buildCoupon(loc, idx, 'nearby'))),
        ]);
        const generatedPersonal = dedupeCoupons(generatedPersonalRaw);
        const generatedNearby = dedupeCoupons(
          generatedNearbyRaw.filter(
            (coupon) =>
              !generatedPersonal.some(
                (personalCoupon) =>
                  personalCoupon.location.lid === coupon.location.lid &&
                  personalCoupon.location.lid > 0
              )
          )
        );

        generatedPersonal.sort((a, b) => {
          if (requestedLocationId) {
            if (a.location.lid === requestedLocationId) return -1;
            if (b.location.lid === requestedLocationId) return 1;
          }
          return 0;
        });

        setPersonalCoupons(generatedPersonal);
        setNearbyCoupons(generatedNearby);

      } catch (error) {
        console.error('Failed to load coupons page:', error);
        setVisitedLocations([]);
        setFavoriteLocations([]);
        setNearbyLocations([]);
        setPersonalCoupons([]);
        setNearbyCoupons([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [navigate, requestedLocationId]);

  useEffect(() => {
    if (!user) return;
    try {
      const storageKey = `bizmatch_saved_coupons_${user.uid}`;
      window.localStorage.setItem(storageKey, JSON.stringify(savedCouponKeys));
    } catch {
      // ignore storage errors
    }
  }, [savedCouponKeys, user]);

  useEffect(() => {
    if (!user) return;
    try {
      const metaStorageKey = `bizmatch_saved_coupon_meta_${user.uid}`;
      window.localStorage.setItem(metaStorageKey, JSON.stringify(savedCouponMeta));
    } catch {
      // ignore storage errors
    }
  }, [savedCouponMeta, user]);

  const motionInitial =
    routeState?.from === 'dashboard' ? { opacity: 0, y: 20, scale: 0.98 } : { opacity: 0, y: 8 };

  const allCoupons = useMemo(() => [...personalCoupons, ...nearbyCoupons], [personalCoupons, nearbyCoupons]);

  const couponByKey = useMemo(() => {
    const map = new Map<string, CouponSuggestion>();
    allCoupons.forEach((coupon) => {
      map.set(getCouponKey(coupon), coupon);
    });
    return map;
  }, [allCoupons]);

  const savedCoupons = useMemo(
    () => dedupeCoupons(savedCouponKeys.map((key) => couponByKey.get(key)).filter(Boolean) as CouponSuggestion[]),
    [savedCouponKeys, couponByKey]
  );

  const summaryText = useMemo(() => {
    const personalCount = dedupeLocations([...favoriteLocations, ...visitedLocations]).length;
    const nearbyCount = nearbyLocations.length;
    if (personalCount === 0 && nearbyCount === 0) {
      return 'No eligible locations found yet. Visit places or enable location for nearby coupon suggestions.';
    }
    return `${personalCount} from favorites/recent visits + ${nearbyCount} in current vicinity.`;
  }, [favoriteLocations, visitedLocations, nearbyLocations]);

  // Computes render coupon cards output used by downstream rendering and actions.
  const renderCouponCards = (coupons: CouponSuggestion[]) => {
    const uniqueCoupons = dedupeCoupons(coupons);
    if (uniqueCoupons.length === 0) {
      return <p className="text-gray-400 text-sm">No coupons available in this group right now.</p>;
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {uniqueCoupons.map((coupon) => (
          <Card
            key={`coupon-${coupon.location.lid}-${coupon.code}`}
            cardClassName={`w-full border ${
              requestedLocationId === coupon.location.lid
                ? 'border-cyan-400/70'
                : 'border-white/10'
            }`}
            title={
              <div className="flex items-center justify-between gap-3">
                <h1 style={{ fontFamily: 'var(--font-heading)' }} className="text-2xl font-bold text-cyan-500 line-clamp-2">
                  {coupon.location.name}
                </h1>
                <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-200">
                  {coupon.discountLabel}
                </span>
              </div>
            }
          >
            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-neutral-800/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-cyan-200 font-semibold flex items-center gap-2">
                    <TicketPercent size={16} />
                    {coupon.title}
                  </p>
                  <button
                    onClick={() => toggleSavedCoupon(coupon)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/35 bg-cyan-500/12 text-cyan-200 hover:bg-cyan-500/22 transition-colors"
                    aria-label="Save coupon"
                    title={savedCouponKeys.includes(getCouponKey(coupon)) ? 'Saved coupon' : 'Save coupon'}
                  >
                    {savedCouponKeys.includes(getCouponKey(coupon)) ? (
                      <BookmarkCheck size={16} className="text-cyan-200" />
                    ) : (
                      <Bookmark size={16} className="text-cyan-200" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-300 mt-2">Code: <span className="font-semibold text-cyan-200">{coupon.code}</span></p>
                <p className="text-xs text-gray-400 mt-1">Expires: {coupon.expiresAt}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-neutral-800/55 p-3 text-sm text-gray-300 space-y-2">
                <p>{coupon.reason}</p>
                <p className="text-xs text-gray-400">Address: {coupon.location.address || 'N/A'}</p>
                {coupon.sourceType === 'personal' && coupon.location.visited_at && (
                  <p className="text-xs text-gray-500">Last visited: {formatDate(coupon.location.visited_at)}</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate(buildMapRouteUrl(coupon.location))}
                  className="rounded-md border border-cyan-400/40 bg-cyan-500/15 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/25"
                >
                  Route to Location
                </button>
                <button
                  onClick={() =>
                    void openCommunityReviewsModal({
                      lid: coupon.location.lid,
                      name: coupon.location.name,
                      address: coupon.location.address,
                      latitude: coupon.location.latitude,
                      longitude: coupon.location.longitude,
                      categories: coupon.location.categories,
                    })
                  }
                  className="rounded-md border border-white/20 bg-white/5 px-3 py-2 text-xs text-gray-200 hover:bg-white/10"
                >
                  Review
                </button>
                {coupon.location.lid > 0 && (
                  <button
                    onClick={() => navigate(`/reviews?locationId=${encodeURIComponent(String(coupon.location.lid))}`)}
                    className="rounded-md border border-white/20 bg-white/5 px-3 py-2 text-xs text-gray-200 hover:bg-white/10"
                  >
                    View Reviews
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  if (!user) {
    return <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">Loading...</div>;
  }

  return (
    <Body>
      <Navbar page="Coupons">
        <Links link="/map">Map <MapPin size={18} /></Links>
        <Links link="/tinder">Findr <Heart size={18} /></Links>
        <Links link="/reviews">Reviews <Star size={18} /></Links>
      </Navbar>

      <motion.div
        initial={motionInitial}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
        className="pt-28 pb-16 mx-auto w-[96%] max-w-7xl space-y-5"
      >
        <Card title="Coupons" cardClassName="w-full border border-cyan-500/20">
          <div className="space-y-3">
            <div className="rounded-lg border border-cyan-400/35 bg-cyan-500/12 px-4 py-3 text-sm text-cyan-50">
              {summaryText}
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-2.5">
              <p className="text-sm text-gray-200">
                Saved Coupons: <span className="font-semibold text-cyan-200">{savedCouponKeys.length}</span>
              </p>
              <button
                onClick={() => setShowSavedCouponsSidebar((prev) => !prev)}
                className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/25 transition-colors"
              >
                {showSavedCouponsSidebar ? 'Hide Sidebar' : 'View Saved'}
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => scrollToSection(nearbySectionRef)}
                className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/25 transition-colors"
              >
                Nearby You
              </button>
              <button
                onClick={() => scrollToSection(personalSectionRef)}
                className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/25 transition-colors"
              >
                Favorites + Recently Visited
              </button>
            </div>
          </div>
        </Card>

        {loading ? (
          <Card title="Loading Coupons" cardClassName="w-full">
            <p className="text-gray-300">Building coupon offers from your nearby and personal locations...</p>
          </Card>
        ) : (
          <div className="space-y-5">
            <div ref={nearbySectionRef}>
            <Card
              title={
                <div className="flex items-center justify-between gap-3">
                  <span style={{ fontFamily: 'var(--font-heading)' }} className="text-2xl font-bold text-cyan-500">Nearby You</span>
                  <button
                    onClick={() => setShowNearbyCoupons((prev) => !prev)}
                    className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/25 transition-colors"
                  >
                    {showNearbyCoupons ? 'Collapse' : 'Expand'}
                  </button>
                </div>
              }
              cardClassName="w-full border border-white/10"
            >
              {showNearbyCoupons && renderCouponCards(nearbyCoupons)}
            </Card>
            </div>

            <div ref={personalSectionRef}>
            <Card
              title={
                <div className="flex items-center justify-between gap-3">
                  <span style={{ fontFamily: 'var(--font-heading)' }} className="text-2xl font-bold text-cyan-500">Your Favorites + Recently Visited</span>
                  <button
                    onClick={() => setShowPersonalCoupons((prev) => !prev)}
                    className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/25 transition-colors"
                  >
                    {showPersonalCoupons ? 'Collapse' : 'Expand'}
                  </button>
                </div>
              }
              cardClassName="w-full border border-white/10"
            >
              {showPersonalCoupons && renderCouponCards(personalCoupons)}
            </Card>
            </div>
          </div>
        )}
      </motion.div>
      {showSavedCouponsSidebar && (
        <div className="fixed top-20 bottom-3 right-2 z-[1500] w-[360px] rounded-2xl border border-cyan-500/30 bg-neutral-900/90 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="text-cyan-300 text-lg font-semibold">Saved Coupons</h3>
            <button
              onClick={() => setShowSavedCouponsSidebar(false)}
              className="h-7 w-7 rounded-full bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10"
            >
              ✕
            </button>
          </div>
          <div className="h-[calc(100%-48px)] overflow-y-auto pr-1">
            {savedCoupons.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No saved coupons yet.</p>
            ) : (
              savedCoupons.map((coupon) => (
                <div
                  key={`saved-coupon-sidebar-${getCouponKey(coupon)}`}
                  className="mb-3 rounded-xl border border-white/10 bg-neutral-800/55 p-3 hover:bg-neutral-800/80 transition-colors"
                >
                  <div className="space-y-1.5">
                    <p className="text-cyan-300 text-base font-semibold">{coupon.location.name}</p>
                    <p className="text-xs text-gray-300">{coupon.title} • {coupon.discountLabel}</p>
                    <p className="text-xs text-gray-400">Code: {coupon.code}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => navigate(buildMapRouteUrl(coupon.location))}
                      className="rounded-md border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs text-gray-200 hover:bg-white/10"
                    >
                      Route
                    </button>
                    <button
                      onClick={() =>
                        void openCommunityReviewsModal({
                          lid: coupon.location.lid,
                          name: coupon.location.name,
                          address: coupon.location.address,
                          latitude: coupon.location.latitude,
                          longitude: coupon.location.longitude,
                          categories: coupon.location.categories,
                        })
                      }
                      className="rounded-md border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs text-gray-200 hover:bg-white/10"
                    >
                      Review
                    </button>
                    <button
                      onClick={() => toggleSavedCoupon(coupon)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/35 bg-cyan-500/12 text-cyan-200 hover:bg-cyan-500/22 transition-colors"
                      aria-label="Toggle saved coupon"
                      title={savedCouponKeys.includes(getCouponKey(coupon)) ? 'Saved coupon' : 'Save coupon'}
                    >
                      {savedCouponKeys.includes(getCouponKey(coupon)) ? (
                        <BookmarkCheck size={16} className="text-cyan-200" />
                      ) : (
                        <Bookmark size={16} className="text-cyan-200" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {reviewModalLocation && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1700] px-4">
          <Card
            title={(
              <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-cyan-500 line-clamp-2">Location Reviews</h1>
                  <p className="mt-1 text-sm text-cyan-200 line-clamp-1">{reviewModalLocation.name}</p>
                  <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">{reviewModalLocation.address || 'Address unavailable'}</p>
                </div>
                <button
                  className="px-3 py-1 w-fit rounded-full text-white hover:bg-neutral-900 transition-colors"
                  onClick={() => {
                    setReviewModalLocation(null);
                    setReviewModalResolvedLid(null);
                  }}
                >
                  X
                </button>
              </div>
            )}
            cardClassName="w-full max-w-2xl"
          >
            <div className="space-y-4 max-h-[62vh] overflow-y-auto pr-1">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-cyan-300">Google Reviews</h3>
                {reviewModalGoogleReviews.length === 0 ? (
                  <p className="text-sm text-gray-300">No Google reviews for this location yet.</p>
                ) : (
                  <div className="space-y-3">
                    {reviewModalGoogleReviews.map((review, idx) => (
                      <div key={`google-${review.name}-${idx}`} className="rounded-xl border border-white/10 bg-neutral-800/60 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-cyan-200">{review.name}</p>
                          <p className="text-xs text-gray-400">{review.relative_time}</p>
                        </div>
                        <p className="mt-1 text-xs text-amber-300">{stars(review.star_rating)}</p>
                        <p className="mt-2 text-sm text-gray-200">{review.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-cyan-300">Community Reviews</h3>
                {reviewModalLoading ? (
                  <p className="text-sm text-gray-300">Loading location reviews...</p>
                ) : !reviewModalResolvedLid ? (
                  <p className="text-sm text-gray-300">This location is not yet stored in the database.</p>
                ) : reviewModalReviews.length === 0 ? (
                  <p className="text-sm text-gray-300">No reviews for this location yet.</p>
                ) : (
                  <div className="space-y-3">
                    {reviewModalReviews.map((review, idx) => (
                      <div key={`${review.user_id}-${idx}-${review.content}`} className="rounded-xl border border-white/10 bg-neutral-800/60 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-cyan-200">{review.username}</p>
                          <p className="text-xs text-gray-400">User #{review.user_id}</p>
                        </div>
                        <p className="mt-1 text-xs text-amber-300">{stars(review.star_rating)}</p>
                        <p className="mt-2 text-sm text-gray-200">{review.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      <LocalAiChatPopup
        userName={user.username}
        activePage="coupons"
        favoriteLocations={favoriteLocations}
        visitedLocations={visitedLocations}
        selectedPois={nearbyLocations}
      />
    </Body>
  );
};

export default Coupons;
