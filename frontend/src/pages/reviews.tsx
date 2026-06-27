import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, MapPin, TicketPercent } from 'lucide-react';
import Navbar from '../components/navbar';
import Links from '../components/links';
import Body from '../components/body';
import Card from '../components/card';
import { enqueueAlert } from '../components/alerts';
import LocalAiChatPopup from '../components/localAiChatPopup';
import { POST as getAiChatResponse } from '../utils/aiChatResponse';
import googleSampleReviews from '../data/googleSampleReviews.json';
import {
  fetchGooglePlaceDetails,
  formatBusinessHoursForDisplay,
  serializeBusinessHours,
  serializeSocials,
  type SocialLink,
} from '../utils/googlePlaceDetails';

interface Location {
  lid: number;
  name: string;
  longitude: number;
  latitude: number;
  type: number;
  address?: string;
  categories?: string[];
  phone?: string;
  email?: string;
  website?: string;
  businessHours?: string[];
  socials?: SocialLink[];
}

interface BackendReview {
  user_id: number;
  username: string;
  star_rating: number;
  content: string;
}

interface BackendReviewsResponse {
  location?: string;
  reviews?: BackendReview[];
}

interface SampleGoogleReview {
  name: string;
  star_rating: number;
  content: string;
  relative_time: string;
}

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  import.meta.env.PUBLIC_GOOGLE_MAPS_API_KEY ||
  import.meta.env.GOOGLE_MAPS_API_KEY;
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5173';

const LocationDetailBlock = ({ loc }: { loc: Location }) => {
  const formattedHours = formatBusinessHoursForDisplay(loc.businessHours, 2);
  const details: Array<{ label: string; value: React.ReactNode }> = [];

  if (loc.phone) details.push({ label: 'Phone', value: loc.phone });
  if (loc.email) details.push({ label: 'Email', value: loc.email });
  if (loc.website) {
    details.push({
      label: 'Website',
      value: (
        <a
          href={loc.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-300 hover:text-cyan-200 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          Open
        </a>
      ),
    });
  }
  if (formattedHours.length > 0) details.push({ label: 'Hours', value: formattedHours.join(' | ') });
  if (loc.categories && loc.categories.length > 0) {
    details.push({
      label: 'Categories',
      value: loc.categories.map((cat) => cat.charAt(0).toUpperCase() + cat.slice(1)).join(', '),
    });
  }

  return (
    <div className="mt-2 space-y-1 text-xs">
      {details.length === 0 ? (
        <p className="text-gray-400">Other Details: N/A</p>
      ) : (
        details.map((detail) => (
          <p key={detail.label} className="text-gray-300">
            {detail.label}: {detail.value}
          </p>
        ))
      )}
    </div>
  );
};

const getStarFillPercent = (value: number, star: number): number => {
  const raw = value - (star - 1);
  if (raw <= 0) return 0;
  if (raw >= 1) return 100;
  return raw * 100;
};

const StarRatingDisplay = ({ value, sizeClass = 'text-[14px]' }: { value: number; sizeClass?: string }) => (
  <span className="inline-flex items-center gap-0.5 align-middle">
    {[1, 2, 3, 4, 5].map((star) => (
      <span key={`display-star-${star}`} className={`relative block h-4 w-4 leading-none ${sizeClass}`}>
        <span className="absolute inset-0 text-neutral-600">★</span>
        <span
          className="absolute inset-0 overflow-hidden text-amber-300"
          style={{ width: `${getStarFillPercent(value, star)}%` }}
        >
          ★
        </span>
      </span>
    ))}
  </span>
);

const ReviewsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<{ uid: number; username: string } | null>(null);
  const [favoriteLocations, setFavoriteLocations] = useState<Location[]>([]);
  const [recentlyViewedLocations, setRecentlyViewedLocations] = useState<Location[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [loadingRecentlyViewed, setLoadingRecentlyViewed] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [favoritesCollapsed, setFavoritesCollapsed] = useState(false);
  const [recentCollapsed, setRecentCollapsed] = useState(false);

  const [loadingReviews, setLoadingReviews] = useState(false);
  const [backendReviews, setBackendReviews] = useState<BackendReview[]>([]);

  const [myRating, setMyRating] = useState<number>(5);
  const [myReviewText, setMyReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [reviewPrompt, setReviewPrompt] = useState('');
  const [generatingReview, setGeneratingReview] = useState(false);

  const allReviewableLocations = useMemo(() => {
    const merged = [...favoriteLocations, ...recentlyViewedLocations];
    const seen = new Set<number>();
    return merged.filter((loc) => {
      if (seen.has(loc.lid)) return false;
      seen.add(loc.lid);
      return true;
    });
  }, [favoriteLocations, recentlyViewedLocations]);

  const selectedLocation = useMemo(
    () => allReviewableLocations.find((loc) => loc.lid === selectedLocationId) || null,
    [allReviewableLocations, selectedLocationId]
  );
  const sampleGoogleReviewsForSelected = useMemo(() => {
    if (!selectedLocation) return [] as SampleGoogleReview[];
    const base = googleSampleReviews as SampleGoogleReview[];
    if (!Array.isArray(base) || base.length === 0) return [];

    const seedSource = `${selectedLocation.name}|${selectedLocation.address || ''}|${selectedLocation.lid}`;
    const seed = seedSource.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const count = Math.min(4, base.length);
    const selected: SampleGoogleReview[] = [];

    for (let i = 0; i < count; i++) {
      const idx = (seed + i * 3) % base.length;
      const item = base[idx];
      const variation = ((seed + i) % 3) - 1;
      selected.push({
        ...item,
        star_rating: Math.max(3, Math.min(5, item.star_rating + variation)),
      });
    }

    return selected;
  }, [selectedLocation]);
  const sampleGoogleRating = useMemo(() => {
    if (sampleGoogleReviewsForSelected.length === 0) return null;
    const avg =
      sampleGoogleReviewsForSelected.reduce((sum, row) => sum + row.star_rating, 0) /
      sampleGoogleReviewsForSelected.length;
    return avg;
  }, [sampleGoogleReviewsForSelected]);
  const communityAverageRating = useMemo(() => {
    if (backendReviews.length === 0) return null;
    const avg = backendReviews.reduce((sum, review) => sum + review.star_rating, 0) / backendReviews.length;
    return avg;
  }, [backendReviews]);
  const requestedLocationId = useMemo(() => {
    const raw = searchParams.get('locationId');
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, [searchParams]);

  const enrichWithTomTomDetails = async (locations: Location[]): Promise<Location[]> => {
    if (!GOOGLE_MAPS_API_KEY) return locations;
    return Promise.all(
      locations.map(async (loc) => {
        const details = await fetchGooglePlaceDetails(GOOGLE_MAPS_API_KEY, {
          name: loc.name,
          address: loc.address,
          lat: loc.latitude,
          lng: loc.longitude,
        });
        return { ...loc, ...details };
      })
    );
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/auth/dashboard`, { credentials: 'include' });
      if (!response.ok) {
        navigate('/login');
        return;
      }
      const data = await response.json();
      setUser({ uid: data.uid, username: data.username });
    } catch (error) {
      console.error('Error loading profile:', error);
      navigate('/login');
    }
  };

  const fetchFavorites = async () => {
    setLoadingFavorites(true);
    try {
      const response = await fetch('http://localhost:5173/loc/favorites', { credentials: 'include' });
      if (!response.ok) {
        setFavoriteLocations([]);
        return;
      }
      const data: Location[] = await response.json();
      const enriched = await enrichWithTomTomDetails(data);
      setFavoriteLocations(enriched);
      if (enriched.length > 0 && !selectedLocationId) {
        setSelectedLocationId(enriched[0].lid);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      setFavoriteLocations([]);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const fetchRecentlyViewed = async () => {
    setLoadingRecentlyViewed(true);
    try {
      const response = await fetch('http://localhost:5173/loc/visited', { credentials: 'include' });
      if (!response.ok) {
        setRecentlyViewedLocations([]);
        return;
      }
      const data: Location[] = await response.json();
      const unique: Location[] = [];
      const seen = new Set<number>();
      for (const loc of data) {
        if (seen.has(loc.lid)) continue;
        seen.add(loc.lid);
        unique.push(loc);
      }
      const enriched = await enrichWithTomTomDetails(unique);
      setRecentlyViewedLocations(enriched);
      if (!selectedLocationId && enriched.length > 0) {
        setSelectedLocationId(enriched[0].lid);
      }
    } catch (error) {
      console.error('Error loading recently viewed locations:', error);
      setRecentlyViewedLocations([]);
    } finally {
      setLoadingRecentlyViewed(false);
    }
  };

  const buildMapRouteUrl = (loc: Location) => {
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

  const fetchBackendReviews = async (locationId: number, currentUser?: { uid: number; username: string } | null) => {
    setLoadingReviews(true);
    if (currentUser) {
      setMyRating(5);
      setMyReviewText('');
    }
    try {
      const response = await fetch(`http://localhost:5173/rate/loc/${locationId}/reviews`, {
        credentials: 'include',
      });
      if (!response.ok) {
        setBackendReviews([]);
        return;
      }

      const data: BackendReviewsResponse = await response.json();
      const reviews = Array.isArray(data?.reviews)
        ? data.reviews
            .filter((review) =>
              review &&
              Number.isFinite(Number(review.user_id)) &&
              typeof review.username === 'string' &&
              Number.isFinite(Number(review.star_rating)) &&
              typeof review.content === 'string'
            )
            .map((review) => ({
              user_id: Number(review.user_id),
              username: review.username.trim() || 'Unknown user',
              star_rating: Math.max(1, Math.min(5, Number(review.star_rating) || 1)),
              content: review.content.trim(),
            }))
        : [];

      setBackendReviews(reviews);

      if (currentUser) {
        const mine = [...reviews].reverse().find((r: BackendReview) => r.user_id === currentUser.uid);
        if (mine) {
          setMyRating(Math.max(1, Math.min(5, Number(mine.star_rating) || 5)));
          setMyReviewText(mine.content || '');
        }
      }
    } catch (error) {
      console.error('Error loading backend reviews:', error);
      setBackendReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    void fetchProfile();
    void fetchFavorites();
    void fetchRecentlyViewed();
  }, [AUTH_BASE_URL]);

  useEffect(() => {
    if (!selectedLocation) return;
    void fetchBackendReviews(selectedLocation.lid, user);
  }, [selectedLocation?.lid, user?.uid]);

  useEffect(() => {
    if (!requestedLocationId) return;
    const match = allReviewableLocations.find((loc) => loc.lid === requestedLocationId);
    if (match) {
      setSelectedLocationId(match.lid);
    }
  }, [allReviewableLocations, requestedLocationId]);

  const submitReview = async () => {
    if (!selectedLocation || !user) return;
    setSubmittingReview(true);
    try {
      const submitPayload = async (ratingValue: number) =>
        fetch('http://localhost:5173/rate/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            user_id: user.uid,
            location_id: selectedLocation.lid,
            star_rating: ratingValue,
            content: myReviewText,
          }),
        });

      let response = await submitPayload(myRating);
      if (!response.ok && Math.round(myRating) !== myRating) {
        response = await submitPayload(Math.round(myRating));
      }

      if (!response.ok) {
        enqueueAlert({ message: 'Failed to submit review.', textColor: 'text-red-300' });
        return;
      }

      enqueueAlert({ message: 'Review submitted.', textColor: 'text-green-300' });
      await fetchBackendReviews(selectedLocation.lid, user);
    } catch (error) {
      console.error('Error submitting review:', error);
      enqueueAlert({ message: 'Error submitting review.', textColor: 'text-red-300' });
    } finally {
      setSubmittingReview(false);
    }
  };

  const generateAiReview = async () => {
    if (!selectedLocation || !reviewPrompt.trim()) return;
    setGeneratingReview(true);
    try {
      const request = new Request('http://localhost/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Write a realistic review for this location.\nLocation: ${selectedLocation.name}\nAddress: ${selectedLocation.address || 'Unknown'}\nRating: ${myRating} stars\nStyle request: ${reviewPrompt}\nKeep it concise and natural.`,
            },
          ],
        }),
      });

      const response = await getAiChatResponse(request);
      const data = await response.json();
      if (!response.ok) {
        const detail = data?.error?.message || data?.error || data?.message || `AI request failed (${response.status})`;
        throw new Error(detail);
      }

      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === 'string' && content.trim()) {
        setMyReviewText(content.trim());
      } else {
        enqueueAlert({ message: 'AI could not generate review text.', textColor: 'text-red-300' });
      }
    } catch (error) {
      console.error('AI review generation failed:', error);
      enqueueAlert({ message: 'Error generating AI review.', textColor: 'text-red-300' });
    } finally {
      setGeneratingReview(false);
    }
  };

  const handleMyRatingClick = (star: number, event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const isHalf = clickX <= rect.width / 2;
    const next = Math.max(0.5, Math.min(5, star - (isHalf ? 0.5 : 0)));
    setMyRating(next);
  };

  if (!user) {
    return <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">Loading...</div>;
  }

  return (
    <Body>
      <Navbar page="Reviews">
        <Links link="/map">Map <MapPin size={18} /></Links>
        <Links link="/tinder">Findr <Heart size={18} /></Links>
        <Links link="/discount">Coupons <TicketPercent size={18} /></Links>
      </Navbar>

      <div className="pt-28 pb-16 mx-auto w-[96%] max-w-7xl space-y-6">
        <Card
          title="Review"
          cardClassName="w-full border border-cyan-500/20 shadow-[0_12px_40px_rgba(0,0,0,0.28)]"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-sky-400/40 bg-cyan-500/16 px-4 py-3">
              <p className="text-sm leading-relaxed text-cyan-50">
                Review flow: pick a place, check live details and community feedback, then submit your rating.
              </p>
            </div>
            <p className="text-sm leading-relaxed text-neutral-200">
              Pick a location from Favorites or Recently Viewed, check available details and community feedback, then submit your rating and review.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg border border-sky-400/40 bg-cyan-500/16 px-3 py-2 text-sky-50 font-medium">1. Select location</div>
              <div className="rounded-lg border border-cyan-400/40 bg-cyan-500/16 px-3 py-2 text-cyan-50 font-medium">2. Review tips and comments</div>
              <div className="rounded-lg border border-teal-400/40 bg-teal-500/16 px-3 py-2 text-teal-50 font-medium">3. Submit your review</div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-[460px_1fr] gap-5">
          <div className="space-y-5">
            <Card
              title={(
                <div className="relative min-w-0 pr-32">
                  <h1
                    style={{ fontFamily: 'var(--font-heading)' }}
                    className="text-2xl md:text-3xl font-bold text-[#FD8973] whitespace-nowrap"
                  >
                    Favorited Locations
                  </h1>
                  <button
                    onClick={() => setFavoritesCollapsed((prev) => !prev)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full border border-[#FD8973]/40 bg-[#FD8973]/12 px-3 py-1 text-xs font-semibold text-[#FD8973] hover:bg-[#FD8973]/22"
                  >
                    {favoritesCollapsed ? 'Expand' : 'Collapse'}
                  </button>
                </div>
              )}
              cardClassName="w-full border border-white/10 shadow-[0_10px_34px_rgba(0,0,0,0.24)]"
              contentClassName="space-y-3 min-h-[48vh]"
            >
              {!favoritesCollapsed && (loadingFavorites ? (
                <p className="text-gray-400">Loading favorites...</p>
              ) : favoriteLocations.length === 0 ? (
                <p className="text-gray-400">No favorite locations yet.</p>
              ) : (
                <div className="space-y-3 max-h-[44vh] overflow-y-auto pr-1">
                  {favoriteLocations.map((loc) => (
                    <button
                      key={`fav-${loc.lid}`}
                      onClick={() => setSelectedLocationId(loc.lid)}
                      className={`w-full text-left rounded-xl border p-3 transition-colors ${
                        selectedLocationId === loc.lid
                          ? 'border-cyan-400/60 bg-cyan-500/15'
                          : 'border-white/10 bg-neutral-800/55 hover:bg-neutral-800/80'
                      }`}
                    >
                      <h3 className="text-cyan-300 font-semibold">{loc.name}</h3>
                      <p className="text-xs text-gray-400 mt-1">{loc.address}</p>
                    </button>
                  ))}
                </div>
              ))}
            </Card>

            <Card
              title={(
                <div className="relative min-w-0 pr-32">
                  <h1
                    style={{ fontFamily: 'var(--font-heading)' }}
                    className="text-2xl md:text-3xl font-bold text-[#CCD5DA] whitespace-nowrap"
                  >
                    Recently Viewed
                  </h1>
                  <button
                    onClick={() => setRecentCollapsed((prev) => !prev)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full border border-[#CCD5DA]/40 bg-[#CCD5DA]/12 px-3 py-1 text-xs font-semibold text-[#CCD5DA] hover:bg-[#CCD5DA]/22"
                  >
                    {recentCollapsed ? 'Expand' : 'Collapse'}
                  </button>
                </div>
              )}
              cardClassName="w-full border border-white/10 shadow-[0_10px_34px_rgba(0,0,0,0.24)]"
              contentClassName="space-y-3 min-h-[48vh]"
            >
              {!recentCollapsed && (loadingRecentlyViewed ? (
                <p className="text-gray-400">Loading recently viewed...</p>
              ) : recentlyViewedLocations.length === 0 ? (
                <p className="text-gray-400">No recently viewed locations yet.</p>
              ) : (
                <div className="space-y-3 max-h-[44vh] overflow-y-auto pr-1">
                  {recentlyViewedLocations.map((loc) => (
                    <button
                      key={`recent-${loc.lid}`}
                      onClick={() => setSelectedLocationId(loc.lid)}
                      className={`w-full text-left rounded-xl border p-3 transition-colors ${
                        selectedLocationId === loc.lid
                          ? 'border-cyan-400/60 bg-cyan-500/15'
                          : 'border-white/10 bg-neutral-800/55 hover:bg-neutral-800/80'
                      }`}
                    >
                      <h3 className="text-cyan-300 font-semibold">{loc.name}</h3>
                      <p className="text-xs text-gray-400 mt-1">{loc.address}</p>
                    </button>
                  ))}
                </div>
              ))}
            </Card>
          </div>

          <div className="space-y-5">
            <Card
              title={
                selectedLocation ? (
                  <div className="space-y-3">
                    <h1
                      style={{ fontFamily: 'var(--font-heading)' }}
                      className="text-3xl font-bold text-cyan-500 line-clamp-2"
                    >
                      {selectedLocation.name}
                    </h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-gray-300">
                        Address: {selectedLocation.address || 'N/A'}
                      </div>
                      <div className="rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-gray-300">
                        Google Rating: {sampleGoogleRating != null ? `${sampleGoogleRating.toFixed(1)} ★` : 'N/A'}
                      </div>
                      <div className="rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-gray-300">
                        Phone: {selectedLocation.phone || 'N/A'}
                      </div>
                      <div className="rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-gray-300">
                        Website: {selectedLocation.website ? 'Available' : 'N/A'}
                      </div>
                    </div>
                  </div>
                ) : (
                  'Select a Location'
                )
              }
              cardClassName="w-full border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.28)]"
            >
              {!selectedLocation ? (
                <p className="text-gray-400">Choose a location from your favorites list.</p>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/10 bg-neutral-800/55 p-4">
                    <h3 className="text-cyan-300 font-semibold">Location Details</h3>
                    <LocationDetailBlock loc={selectedLocation} />
                  </div>

                  <div className="rounded-xl border border-white/10 bg-neutral-800/55 p-4">
                    <h3 className="text-cyan-300 font-semibold">Google Reviews</h3>
                    {sampleGoogleReviewsForSelected.length === 0 ? (
                      <p className="text-gray-400 text-sm mt-2">No sample Google reviews available.</p>
                    ) : (
                      <div className="mt-2 space-y-2 max-h-[260px] overflow-y-auto pr-1">
                        {sampleGoogleReviewsForSelected.map((review, idx) => (
                          <div key={`${review.name}-${idx}`} className="rounded-lg border border-white/10 p-3">
                            <p className="text-sm text-cyan-200">
                              {review.name}
                              {' • '}
                              <StarRatingDisplay value={review.star_rating} sizeClass="text-[13px]" />
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{review.relative_time}</p>
                            <p className="text-sm text-gray-300 mt-1">{review.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-neutral-800/55 p-4">
                    <h3 className="text-cyan-300 font-semibold">Community Reviews</h3>
                    <p className="mt-1 text-xs text-gray-400">
                      {backendReviews.length} review{backendReviews.length === 1 ? '' : 's'}
                      {communityAverageRating != null ? ` • ${communityAverageRating.toFixed(1)} ★ avg` : ''}
                    </p>
                    {loadingReviews ? (
                      <p className="text-gray-400 text-sm mt-2">Loading reviews...</p>
                    ) : backendReviews.length === 0 ? (
                      <p className="text-gray-400 text-sm mt-2">No backend reviews yet.</p>
                    ) : (
                      <div className="mt-2 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {backendReviews.map((review, idx) => (
                          <div key={`${review.user_id}-${idx}-${review.content}`} className="rounded-lg border border-white/10 p-3">
                            <p className="text-sm text-cyan-200">
                              {review.username}
                              {review.user_id === user.uid ? ' (you)' : ''}
                              {' • '}
                              <StarRatingDisplay value={review.star_rating} sizeClass="text-[13px]" />
                            </p>
                            <p className="text-sm text-gray-300 mt-1">{review.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {selectedLocation && (
              <Card
                title="Leave Your Review"
                cardClassName="w-full border border-cyan-500/20 shadow-[0_10px_34px_rgba(0,0,0,0.24)]"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={(e) => handleMyRatingClick(star, e)}
                        className="rounded-sm p-0.5 hover:bg-white/10 transition-colors"
                        aria-label={`Set rating ${star}`}
                      >
                        <span className="relative block h-7 w-7 leading-none text-[28px]">
                          <span className="absolute inset-0 text-neutral-600">★</span>
                          <span
                            className="absolute inset-0 overflow-hidden text-amber-300"
                            style={{ width: `${getStarFillPercent(myRating, star)}%` }}
                          >
                            ★
                          </span>
                        </span>
                      </button>
                    ))}
                    <p className="ml-2 text-sm text-cyan-200">{myRating.toFixed(1)} / 5.0</p>
                  </div>
                  <p className="text-xs text-gray-400">Click the left half of a star for `.5` ratings.</p>

                  <textarea
                    value={myReviewText}
                    onChange={(e) => setMyReviewText(e.target.value)}
                    className="w-full min-h-[120px] rounded-xl border border-white/10 bg-neutral-800/55 p-3 text-sm text-white"
                    placeholder="Write your review..."
                  />

                  <div className="rounded-xl border border-white/10 bg-neutral-800/55 p-3 space-y-2">
                    <p className="text-sm text-cyan-200">AI Review Builder</p>
                    <input
                      value={reviewPrompt}
                      onChange={(e) => setReviewPrompt(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-neutral-900/70 px-3 py-2 text-sm text-white"
                      placeholder="Example: short, friendly, and food-focused"
                    />
                    <button
                      onClick={generateAiReview}
                      disabled={generatingReview || !reviewPrompt.trim()}
                      className="rounded-md bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-cyan-400 disabled:opacity-60"
                    >
                      {generatingReview ? 'Generating...' : 'Generate AI Review'}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={submitReview}
                      disabled={submittingReview}
                      className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-400 disabled:opacity-60"
                    >
                      {submittingReview ? 'Submitting...' : 'Submit Rating & Review'}
                    </button>
                    <button
                      onClick={() => navigate(buildMapRouteUrl(selectedLocation))}
                      className="rounded-md border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-500/25"
                    >
                      Route to Location
                    </button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <LocalAiChatPopup
        userName={user.username}
        activePage="reviews"
        favoriteLocations={favoriteLocations}
        visitedLocations={recentlyViewedLocations}
        selectedPois={selectedLocation ? [{
          name: selectedLocation.name,
          address: selectedLocation.address,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        }] : []}
        activeSelectionLabel={selectedLocation?.name}
      />
    </Body>
  );
};

export default ReviewsPage;
