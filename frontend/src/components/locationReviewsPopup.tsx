import { useEffect, useMemo, useRef, useState } from 'react';
import googleSampleReviews from '../data/googleSampleReviews.json';

interface SampleGoogleReview {
  name: string;
  star_rating: number;
  content: string;
  relative_time: string;
}

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
  popupVariant = 'dropdown',
}: LocationReviewsPopupProps) => {
  const [open, setOpen] = useState(false);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [communityReviews, setCommunityReviews] = useState<BackendReview[]>([]);
  const popupRef = useRef<HTMLDivElement | null>(null);

  const sampleGoogleReviews = useMemo(() => {
    const base = googleSampleReviews as SampleGoogleReview[];
    if (!Array.isArray(base) || base.length === 0) return [];

    const seedSource = `${location.name}|${location.address || ''}|${location.lid || 0}`;
    const seed = seedSource.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const count = Math.min(4, base.length);

    return Array.from({ length: count }).map((_, i) => {
      const idx = (seed + i * 3) % base.length;
      const item = base[idx];
      const variation = ((seed + i) % 3) - 1;
      return {
        ...item,
        star_rating: Math.max(3, Math.min(5, item.star_rating + variation)),
      };
    });
  }, [location.name, location.address, location.lid]);

  const loadCommunityReviews = async () => {
    if (!location.lid || location.lid <= 0) {
      setCommunityReviews([]);
      return;
    }
    setLoadingCommunity(true);
    try {
      const res = await fetch(`http://localhost:5173/rate/loc/${location.lid}/reviews`, {
        credentials: 'include',
      });
      if (!res.ok) {
        setCommunityReviews([]);
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
      );
    } catch {
      setCommunityReviews([]);
    } finally {
      setLoadingCommunity(false);
    }
  };

  const featuredReview = useMemo(() => {
    if (communityReviews.length > 0) {
      const review = communityReviews[0];
      return {
        source: 'Community Review',
        author: review.username,
        rating: review.star_rating,
        content: review.content,
        meta: null as string | null,
      };
    }
    if (sampleGoogleReviews.length > 0) {
      const review = sampleGoogleReviews[0];
      return {
        source: 'Google Review',
        author: review.name,
        rating: review.star_rating,
        content: review.content,
        meta: review.relative_time,
      };
    }
    return null;
  }, [communityReviews, sampleGoogleReviews]);

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

  useEffect(() => {
    if (!open || popupVariant !== 'dropdown') return;
    const onDocumentClick = (event: MouseEvent) => {
      if (!popupRef.current) return;
      if (!popupRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, [open, popupVariant]);

  return (
    <div className="relative" ref={popupRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          void handleOpen();
        }}
        className={buttonClassName}
      >
        {buttonLabel}
      </button>
      {open && popupVariant === 'dropdown' && (
        <div
          className="absolute right-0 bottom-full mb-2 w-[360px] max-w-[80vw] z-[5200] rounded-2xl border border-cyan-500/30 bg-neutral-900/98 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
            <span className="text-cyan-300 text-sm font-semibold line-clamp-1">{location.name} Reviews</span>
            <button
              onClick={() => setOpen(false)}
              className="h-7 w-7 rounded-full bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3 max-h-[320px] overflow-y-auto p-3">
            <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2">
              <p className="text-xs text-cyan-100">{location.address || 'Address unavailable'}</p>
            </div>

            <div>
              <h4 className="text-cyan-300 font-semibold mb-2 text-xs">Google Reviews</h4>
              <div className="space-y-2">
                {sampleGoogleReviews.map((review, idx) => (
                  <div key={`sample-${idx}`} className="rounded-lg border border-white/10 bg-neutral-800/55 p-2.5">
                    <p className="text-xs text-cyan-200 font-medium">{review.name}</p>
                    <p className="text-[11px] text-amber-300">{stars(review.star_rating)}</p>
                    <p className="text-xs text-gray-200 mt-1">{review.content}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{review.relative_time}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-cyan-300 font-semibold mb-2 text-xs">Community Reviews</h4>
              {loadingCommunity ? (
                <p className="text-xs text-gray-400">Loading community reviews...</p>
              ) : communityReviews.length === 0 ? (
                <p className="text-xs text-gray-400">No community reviews available yet.</p>
              ) : (
                <div className="space-y-2">
                  {communityReviews.map((review, idx) => (
                    <div key={`community-${idx}`} className="rounded-lg border border-white/10 bg-neutral-800/55 p-2.5">
                      <p className="text-xs text-cyan-200 font-medium">{review.username}</p>
                      <p className="text-[11px] text-amber-300">{stars(review.star_rating)}</p>
                      <p className="text-xs text-gray-200 mt-1">{review.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {open && popupVariant === 'card' && (
        <div
          className="fixed inset-0 z-[5600] flex items-center justify-center bg-black/60 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-cyan-500/35 bg-neutral-900 p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-cyan-300/85">
                  {featuredReview?.source || 'Review'}
                </p>
                <h4 className="mt-1 text-base font-semibold text-cyan-200">{location.name}</h4>
                <p className="mt-1 text-xs text-gray-400">{location.address || 'Address unavailable'}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 rounded-full bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-neutral-800/65 p-3">
              {loadingCommunity ? (
                <p className="text-sm text-gray-300">Loading review...</p>
              ) : featuredReview ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-cyan-200">{featuredReview.author}</p>
                    <p className="text-xs text-amber-300">{stars(featuredReview.rating)}</p>
                  </div>
                  <p className="mt-2 text-sm text-gray-200">{featuredReview.content}</p>
                  {featuredReview.meta && <p className="mt-2 text-[11px] text-gray-400">{featuredReview.meta}</p>}
                </>
              ) : (
                <p className="text-sm text-gray-300">No reviews available yet for this location.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationReviewsPopup;
