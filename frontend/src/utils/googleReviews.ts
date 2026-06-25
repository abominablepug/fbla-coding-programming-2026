import googleSampleReviews from '../data/googleSampleReviews.json';

export interface SampleGoogleReview {
  name: string;
  star_rating: number;
  content: string;
  relative_time: string;
}

interface LocationSeed {
  name: string;
  address?: string;
  lid?: number;
}

// Select deterministic sample reviews using a stable location-based seed.
export const getSampleGoogleReviewsForLocation = (
  location: LocationSeed,
  count = 4
): SampleGoogleReview[] => {
  const base = googleSampleReviews as SampleGoogleReview[];
  if (!Array.isArray(base) || base.length === 0) return [];

  const seedSource = `${location.name || ''}|${location.address || ''}|${location.lid || 0}`;
  const seed = seedSource.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const selectedCount = Math.max(1, Math.min(count, base.length));
  const selected: SampleGoogleReview[] = [];

  for (let i = 0; i < selectedCount; i++) {
    const idx = (seed + i * 3) % base.length;
    const item = base[idx];
    const variation = ((seed + i) % 3) - 1;
    selected.push({
      ...item,
      star_rating: Math.max(3, Math.min(5, item.star_rating + variation)),
    });
  }

  return selected;
};
