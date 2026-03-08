import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Card from './card';
import { getSampleGoogleReviewsForLocation } from '../utils/googleReviews';
import { resolveLocationId } from '../utils/locationResolver';

interface BackendReview {
  user_id: number;
  username: string;
  star_rating: number;
  content: string;
}

interface LocationRef {
  lid?: number;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  categories?: string[];
  phone?: string;
  email?: string;
  website?: string;
  businessHours?: string[];
}

interface LocationReviewsPopupProps {
  location: LocationRef;
  buttonLabel?: string;
  buttonClassName?: string;
  onOpen?: () => void;
  popupVariant?: 'dropdown' | 'card';
}

const stars = (rating: number) => '★'.repeat(Math.max(1, Math.min(5, Math.round(rating))));

const LocationReviewsPopup = ({
  location,
  buttonLabel = 'Reviews',
  buttonClassName = 'rounded-md border border-white/20 bg-white/5 px-3 py-2 text-xs text-gray-200 hover:bg-white/10',
  onOpen,
}: LocationReviewsPopupProps) => {
  const [open, setOpen] = useState(false);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [communityReviews, setCommunityReviews] = useState<BackendReview[]>([]);
  const [resolvedLocationId, setResolvedLocationId] = useState<number | null>(location.lid && location.lid > 0 ? location.lid : null);
  const [communityError, setCommunityError] = useState<string>('');

  const googleReviews = useMemo(
    () => getSampleGoogleReviewsForLocation({ name: location.name, address: location.address, lid: location.lid }),
    [location.name, location.address, location.lid]
  );

  useEffect(() => {
    setResolvedLocationId(location.lid && location.lid > 0 ? location.lid : null);
    setCommunityError('');
  }, [location.lid, location.name, location.address]);

  const loadCommunityReviews = async () => {
    setLoadingCommunity(true);
    setCommunityError('');
    try {
      let targetLocationId = resolvedLocationId && resolvedLocationId > 0 ? resolvedLocationId : null;

      if (!targetLocationId) {
        const resolvedId = await resolveLocationId({
          lid: location.lid,
          name: location.name,
          address: location.address,
          latitude: location.latitude,
          longitude: location.longitude,
          type: 1,
          categories: location.categories || [],
        });
        if (resolvedId) {
          targetLocationId = resolvedId;
          setResolvedLocationId(resolvedId);
        }
      }

      if (!targetLocationId) {
        setCommunityReviews([]);
        setCommunityError('Unable to resolve this location in the database yet.');
        return;
      }

      const res = await fetch(`http://localhost:5173/rate/loc/${targetLocationId}/reviews`, {
        credentials: 'include',
      });
      if (!res.ok) {
        setCommunityReviews([]);
        setCommunityError('Unable to load community reviews right now.');
        return;
      }
      const data = await res.json();
      const reviews = Array.isArray(data?.reviews) ? data.reviews : [];
      setCommunityReviews(
        reviews
          .filter(
            (review: any) =>
              review &&
              typeof review.username === 'string' &&
              Number.isFinite(Number(review.star_rating)) &&
              typeof review.content === 'string'
          )
          .map((review: any) => ({
            user_id: Number(review.user_id) || 0,
            username: review.username.trim() || 'Unknown user',
            star_rating: Math.max(1, Math.min(5, Number(review.star_rating) || 1)),
            content: review.content.trim(),
          }))
          .filter((review: BackendReview) => review.content.length > 0)
      );
    } catch {
      setCommunityReviews([]);
      setCommunityError('Unable to load community reviews right now.');
    } finally {
      setLoadingCommunity(false);
    }
  };

  const handleOpen = () => {
    setOpen((prev) => {
      const nextOpen = !prev;
      if (nextOpen) {
        onOpen?.();
        void loadCommunityReviews();
      }
      return nextOpen;
    });
  };

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          void handleOpen();
        }}
        className={buttonClassName}
      >
        {buttonLabel}
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[5600] px-4" onClick={() => setOpen(false)}>
            <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <Card
                title={(
                  <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                    <div>
                      <h1 className="text-2xl font-bold text-cyan-500 line-clamp-2">Location Reviews</h1>
                      <p className="mt-1 text-sm text-cyan-200 line-clamp-1">{location.name}</p>
                      <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">{location.address || 'Address unavailable'}</p>
                    </div>
                    <button
                      className="px-3 py-1 w-fit rounded-full text-white hover:bg-neutral-900 transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      X
                    </button>
                  </div>
                )}
                cardClassName="w-full max-w-2xl"
              >
                <div className="max-h-[62vh] overflow-y-auto space-y-4 pr-1">
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-cyan-300">Google Reviews</h3>
                    {googleReviews.length === 0 ? (
                      <p className="text-sm text-gray-300">No Google reviews for this location yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {googleReviews.map((review, idx) => (
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
                    {loadingCommunity ? (
                      <p className="text-sm text-gray-300">Loading location reviews...</p>
                    ) : communityError ? (
                      <p className="text-sm text-gray-300">{communityError}</p>
                    ) : communityReviews.length === 0 ? (
                      <p className="text-sm text-gray-300">No reviews for this location yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {communityReviews.map((review, idx) => (
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
          </div>,
          document.body
        )}
    </div>
  );
};

export default LocationReviewsPopup;
