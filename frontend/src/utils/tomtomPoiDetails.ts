// SocialLink: Interface for social media platform and URL pair
export interface SocialLink {
  platform: string;
  url: string;
}

// PoiDetails: Interface for Point of Interest contact and hours information
export interface PoiDetails {
  phone?: string;
  email?: string;
  website?: string;
  businessHours?: string[];
  socials?: SocialLink[];
}

// Handles to text logic and updates related state transitions safely.
const toText = (value: any): string | undefined => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (value && typeof value === 'object') {
    if (typeof value.hour === 'number') {
      const hour = String(value.hour).padStart(2, '0');
      const minute = String(typeof value.minute === 'number' ? value.minute : 0).padStart(2, '0');
      return `${hour}:${minute}`;
    }
    const nested =
      value.value ||
      value.text ||
      value.name ||
      value.label ||
      value.date ||
      value.day ||
      value.dayOfWeek ||
      value.time;
    if (typeof nested === 'string' && nested.trim()) return nested.trim();
  }
  return undefined;
};

// Handles normalize hour entry logic and updates related state transitions safely.
const normalizeHourEntry = (entry: any): string | undefined => {
  if (typeof entry === 'string') return entry.trim() || undefined;
  if (!entry || typeof entry !== 'object') return undefined;

  const day = toText(entry.dayOfWeek || entry.day || entry.startDate || entry.date || entry.dayName);
  const start = toText(entry.startTime || entry.start || entry.open || entry.openTime || entry.from);
  const end = toText(entry.endTime || entry.end || entry.close || entry.closeTime || entry.to);

  if (start && end) {
    return day ? `${day}: ${start}-${end}` : `${start}-${end}`;
  }

  return toText(entry.text || entry.label || entry.value);
};

// Handles format clock time logic and updates related state transitions safely.
const formatClockTime = (value: string): string => {
  const normalized = value
    .replace(/^\d{4}-\d{2}-\d{2}T/, '')
    .replace(/Z$/, '')
    .replace(/[+-]\d{2}:?\d{2}$/, '')
    .replace(/\.\d+$/, '');
  const match = normalized.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return value;
  const hours24 = Number(match[1]);
  const mins = match[2];
  if (Number.isNaN(hours24) || hours24 < 0 || hours24 > 23) return value;
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${mins} ${suffix}`;
};

// Handles normalize business hour row logic and updates related state transitions safely.
const normalizeBusinessHourRow = (row: unknown): string => {
  const source = normalizeHourEntry(row) || '';
  if (!source) return '';

  const withoutDates = source
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '')
    .replace(/^:\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const normalizedRanges = withoutDates.replace(
    /(\d{1,2}:\d{2})(?::\d{2})?\s*-\s*(\d{1,2}:\d{2})(?::\d{2})?/g,
    (_, start: string, end: string) => `${formatClockTime(start)} - ${formatClockTime(end)}`
  );

  return normalizedRanges || source;
};

export const formatBusinessHoursForDisplay = (hours?: string[], maxRows = 2): string[] => {
  if (!Array.isArray(hours) || hours.length === 0) return [];
  return hours
    .map((row) => normalizeBusinessHourRow(row))
    .filter((row) => row.trim())
    .slice(0, maxRows);
};

// BasicLocation: Interface for name, address and coordinates of a location
interface BasicLocation {
  name?: string;
  address?: string;
  latitude: number;
  longitude: number;
}

// SOCIAL_DOMAINS: Record mapping social platform domains to display names
const SOCIAL_DOMAINS: Record<string, string> = {
  'facebook.com': 'Facebook',
  'instagram.com': 'Instagram',
  'x.com': 'X',
  'twitter.com': 'X',
  'linkedin.com': 'LinkedIn',
  'tiktok.com': 'TikTok',
  'youtube.com': 'YouTube',
  'pinterest.com': 'Pinterest',
};

// Handles normalize url logic and updates related state transitions safely.
const normalizeUrl = (url?: string): string | undefined => {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('mailto:')) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

// Manages parse email behavior for this page and linked UI flows.
const parseEmail = (value?: string): string | undefined => {
  if (!value || typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('mailto:')) {
    return trimmed.replace(/^mailto:/i, '').trim() || undefined;
  }
  if (trimmed.includes('@')) return trimmed;
  return undefined;
};

// Handles parse social from url logic and updates related state transitions safely.
const parseSocialFromUrl = (value?: string): SocialLink[] => {
  const normalized = normalizeUrl(value);
  if (!normalized || normalized.startsWith('mailto:')) return [];

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    const domain = Object.keys(SOCIAL_DOMAINS).find((candidate) => host.includes(candidate));
    if (!domain) return [];
    return [{ platform: SOCIAL_DOMAINS[domain], url: normalized }];
  } catch {
    return [];
  }
};

// Handles parse business hours logic and updates related state transitions safely.
const parseBusinessHours = (openingHours: any): string[] => {
  if (!openingHours) return [];

  if (Array.isArray(openingHours)) {
    return openingHours
      .map((entry) => normalizeHourEntry(entry))
      .filter((entry): entry is string => Boolean(entry));
  }

  if (typeof openingHours === 'string' && openingHours.trim()) {
    return [openingHours.trim()];
  }

  if (Array.isArray(openingHours.text)) {
    return openingHours.text
      .map((entry: any) => normalizeHourEntry(entry))
      .filter((entry: string | undefined): entry is string => Boolean(entry));
  }

  if (Array.isArray(openingHours.timeRanges)) {
    return openingHours.timeRanges
      .map((range: any) => normalizeHourEntry(range))
      .filter((entry: string | undefined): entry is string => Boolean(entry));
  }

  return [];
};

export const extractTomTomPoiDetails = (result: any): PoiDetails => {
  const poi = result?.poi || {};
  const dataSources = result?.dataSources || {};

  const website = normalizeUrl(poi.url || poi.website || result?.url);
  const email =
    parseEmail(poi.email) ||
    parseEmail(result?.email) ||
    parseEmail(website?.startsWith('mailto:') ? website : undefined);

  const socialCandidates = [
    poi.socialMedia,
    poi.socials,
    poi.facebook,
    poi.instagram,
    poi.twitter,
    poi.linkedin,
    dataSources?.socialMedia,
    website,
  ];

  const socials = socialCandidates
    .flatMap((candidate: any) => {
      if (!candidate) return [];
      if (Array.isArray(candidate)) {
        return candidate.flatMap((item) => parseSocialFromUrl(typeof item === 'string' ? item : item?.url));
      }
      if (typeof candidate === 'object') {
        return Object.values(candidate).flatMap((item) =>
          parseSocialFromUrl(typeof item === 'string' ? item : (item as any)?.url)
        );
      }
      return parseSocialFromUrl(candidate);
    })
    .filter((item, index, arr) => arr.findIndex((v) => v.url === item.url) === index);

  const hours = parseBusinessHours(poi.openingHours || result?.openingHours);

  return {
    phone: poi.phone || poi.contact?.phone,
    email,
    website: website?.startsWith('mailto:') ? undefined : website,
    businessHours: hours.length > 0 ? hours : undefined,
    socials: socials.length > 0 ? socials : undefined,
  };
};

export const serializeBusinessHours = (hours?: string[]): string | undefined => {
  if (!hours || hours.length === 0) return undefined;
  return JSON.stringify(hours);
};

export const parseBusinessHoursQuery = (hoursParam?: string | null): string[] | undefined => {
  if (!hoursParam) return undefined;
  try {
    const parsed = JSON.parse(hoursParam);
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => normalizeHourEntry(entry))
        .filter((entry: string | undefined): entry is string => Boolean(entry));
    }
  } catch {
    return undefined;
  }
  return undefined;
};

export const serializeSocials = (socials?: SocialLink[]): string | undefined => {
  if (!socials || socials.length === 0) return undefined;
  return JSON.stringify(socials);
};

export const parseSocialsQuery = (socialsParam?: string | null): SocialLink[] | undefined => {
  if (!socialsParam) return undefined;
  try {
    const parsed = JSON.parse(socialsParam);
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => ({
          platform: typeof entry?.platform === 'string' ? entry.platform : 'Social',
          url: typeof entry?.url === 'string' ? entry.url : '',
        }))
        .filter((entry) => entry.url.trim());
    }
  } catch {
    return undefined;
  }
  return undefined;
};

export const fetchTomTomPoiDetailsForLocation = async (
  apiKey: string | undefined,
  loc: BasicLocation
): Promise<PoiDetails | undefined> => {
  if (!apiKey) return undefined;

  try {
    const normalizedName = (loc.name || '').toLowerCase();
    const normalizedAddress = (loc.address || '').toLowerCase();

    const pickBestCandidate = (candidates: any[]) =>
      candidates.find((candidate: any) => {
        const candidateName = (candidate?.poi?.name || '').toLowerCase();
        const candidateAddress = (candidate?.address?.freeformAddress || '').toLowerCase();

        if (normalizedName && candidateName && (candidateName.includes(normalizedName) || normalizedName.includes(candidateName))) {
          return true;
        }
        if (
          normalizedAddress &&
          candidateAddress &&
          (candidateAddress.includes(normalizedAddress) || normalizedAddress.includes(candidateAddress))
        ) {
          return true;
        }
        return false;
      }) || candidates[0];

    const nearbyUrl = `https://api.tomtom.com/search/2/nearbySearch/.json?key=${encodeURIComponent(apiKey)}&lat=${encodeURIComponent(String(loc.latitude))}&lon=${encodeURIComponent(String(loc.longitude))}&radius=300&limit=10&openingHours=nextSevenDays`;
    const nearbyRes = await fetch(nearbyUrl);
    if (nearbyRes.ok) {
      const nearbyData = await nearbyRes.json();
      const nearbyCandidates = Array.isArray(nearbyData?.results) ? nearbyData.results : [];
      const nearbyBest = pickBestCandidate(nearbyCandidates);
      if (nearbyBest) {
        const details = extractTomTomPoiDetails(nearbyBest);
        if (details.businessHours?.length || details.website || details.phone || details.email) {
          return details;
        }
      }
    }

    const query = `${loc.name || ''} ${loc.address || ''}`.trim() || 'point of interest';
    const searchUrl = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${encodeURIComponent(apiKey)}&lat=${encodeURIComponent(String(loc.latitude))}&lon=${encodeURIComponent(String(loc.longitude))}&limit=10&typeahead=true&openingHours=nextSevenDays`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return undefined;
    const searchData = await searchRes.json();
    const searchCandidates = Array.isArray(searchData?.results) ? searchData.results : [];
    const searchBest = pickBestCandidate(searchCandidates);
    if (!searchBest) return undefined;
    return extractTomTomPoiDetails(searchBest);
  } catch {
    return undefined;
  }
};
