import React, { useEffect, useRef, useState } from 'react';
import tt from '@tomtom-international/web-sdk-maps';
import { services } from '@tomtom-international/web-sdk-services';
import '@tomtom-international/web-sdk-maps/dist/maps.css';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/navbar';
import Links from '../components/links';
import {Heart, HeartPlus, Mic, MicOff, Star, TicketPercent} from 'lucide-react';
import { enqueueAlert } from '../components/alerts';
import LocalAiChatPopup from '../components/localAiChatPopup';
import LocationReviewsPopup from '../components/locationReviewsPopup';
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
  rating?: number;
  isOpenNow?: boolean;
  hasCoupon: boolean;
  phone?: string;
  email?: string;
  website?: string;
  businessHours?: string[];
  socials?: SocialLink[];
}

type PoiOpenFilter = 'all' | 'open' | 'closed';
type PoiCouponFilter = 'all' | 'with' | 'without';

const normalizePoiRating = (value: any): number | undefined => {
  if (!Number.isFinite(Number(value))) return undefined;
  const raw = Number(value);
  if (raw <= 0) return undefined;
  const mapped =
    raw <= 1 ? raw * 5 :
    raw <= 5 ? raw :
    raw <= 10 ? raw / 2 : 5;
  return Math.max(1, Math.min(5, Math.round(mapped * 10) / 10));
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

const dayIndexFromToken = (token: string): number | null => {
  const value = token.toLowerCase().replace(/\./g, '').trim();
  if (!value) return null;
  if (/^su(n(day)?)?$/.test(value)) return 0;
  if (/^mo(n(day)?)?$/.test(value)) return 1;
  if (/^tu(e(s(day)?)?)?$/.test(value)) return 2;
  if (/^we(d(nesday)?)?$/.test(value)) return 3;
  if (/^th(u(r(s(day)?)?)?)?$/.test(value)) return 4;
  if (/^fr(i(day)?)?$/.test(value)) return 5;
  if (/^sa(t(urday)?)?$/.test(value)) return 6;
  return null;
};

const expandDayRange = (start: number, end: number): number[] => {
  const days: number[] = [];
  let current = start;
  for (let i = 0; i < 7; i += 1) {
    days.push(current);
    if (current === end) break;
    current = (current + 1) % 7;
  }
  return days;
};

const parseDaySegment = (segment: string): number[] => {
  const value = segment
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/\./g, '')
    .trim();
  if (!value) return [];
  if (/(daily|every day|all days)/.test(value)) return [...ALL_DAYS];
  if (/weekdays?/.test(value)) return [1, 2, 3, 4, 5];
  if (/weekends?/.test(value)) return [0, 6];

  const rangeMatch = value.match(/^([a-z]+)\s*-\s*([a-z]+)$/);
  if (rangeMatch) {
    const start = dayIndexFromToken(rangeMatch[1]);
    const end = dayIndexFromToken(rangeMatch[2]);
    if (start !== null && end !== null) {
      return expandDayRange(start, end);
    }
  }

  const single = dayIndexFromToken(value);
  return single === null ? [] : [single];
};

const parseDaysFromRowPrefix = (prefix: string): number[] => {
  const cleaned = prefix
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/\b(open|hours?|closed)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];

  const daySet = new Set<number>();
  cleaned
    .split(/[,/&]+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .forEach((segment) => {
      parseDaySegment(segment).forEach((day) => daySet.add(day));
    });

  return [...daySet];
};

const parseTimeToMinutes = (raw: string): number | null => {
  const value = raw.toLowerCase().replace(/\./g, '').replace(/\s+/g, '').trim();
  if (!value) return null;
  if (value === 'noon') return 12 * 60;
  if (value === 'midnight') return 0;

  const ampm = value.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm)$/);
  if (ampm) {
    let hour = Number(ampm[1]);
    const minute = Number(ampm[2] || '0');
    const meridiem = ampm[3];
    if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 1 || hour > 12 || minute < 0 || minute > 59) {
      return null;
    }
    if (meridiem === 'am') {
      if (hour === 12) hour = 0;
    } else if (hour !== 12) {
      hour += 12;
    }
    return hour * 60 + minute;
  }

  const plain = value.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (plain) {
    const hour = Number(plain[1]);
    const minute = Number(plain[2] || '0');
    if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 24 || minute < 0 || minute > 59) {
      return null;
    }
    if (hour === 24 && minute !== 0) return null;
    return hour * 60 + minute;
  }

  const compact = value.match(/^(\d{2})(\d{2})$/);
  if (compact) {
    const hour = Number(compact[1]);
    const minute = Number(compact[2]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }
    return hour * 60 + minute;
  }

  return null;
};

const extractTimeRangesFromRow = (row: string): Array<[number, number]> => {
  const normalized = row
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/\bto\b/g, '-');
  const ranges: Array<[number, number]> = [];
  const timeRangeRegex =
    /(\d{1,2}(?::?\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?|\bnoon\b|\bmidnight\b)\s*-\s*(\d{1,2}(?::?\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?|\bnoon\b|\bmidnight\b)/gi;

  let match: RegExpExecArray | null;
  while ((match = timeRangeRegex.exec(normalized)) !== null) {
    const start = parseTimeToMinutes(match[1] || '');
    const end = parseTimeToMinutes(match[2] || '');
    if (start === null || end === null) continue;
    ranges.push([start, end]);
  }

  return ranges;
};

const inferOpenNowFromBusinessHours = (hours?: string[]): boolean | undefined => {
  if (!Array.isArray(hours) || hours.length === 0) return undefined;
  const intervalsByDay: Array<Array<[number, number]>> = Array.from({ length: 7 }, () => []);
  let parsedAnyRanges = false;

  for (const rawRow of hours) {
    if (typeof rawRow !== 'string') continue;
    const row = rawRow.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!row) continue;

    const firstTimeMatch = row.match(/\d{1,2}(?::?\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?|\bnoon\b|\bmidnight\b/i);
    const dayPrefix =
      firstTimeMatch && typeof firstTimeMatch.index === 'number'
        ? row.slice(0, firstTimeMatch.index)
        : row;
    let dayIndexes = parseDaysFromRowPrefix(dayPrefix);
    if (dayIndexes.length === 0) dayIndexes = [...ALL_DAYS];

    if (/24\s*hours?|open\s*24/.test(row)) {
      dayIndexes.forEach((day) => intervalsByDay[day].push([0, 24 * 60]));
      parsedAnyRanges = true;
      continue;
    }

    const ranges = extractTimeRangesFromRow(row);
    if (ranges.length === 0) continue;
    parsedAnyRanges = true;

    dayIndexes.forEach((day) => {
      ranges.forEach(([start, end]) => {
        if (start === end) {
          intervalsByDay[day].push([0, 24 * 60]);
          return;
        }
        if (end > start) {
          intervalsByDay[day].push([start, end]);
          return;
        }
        // Overnight window (example: 9:00 PM - 2:00 AM)
        intervalsByDay[day].push([start, 24 * 60]);
        intervalsByDay[(day + 1) % 7].push([0, end]);
      });
    });
  }

  if (!parsedAnyRanges) return undefined;
  const now = new Date(); // Uses the user's local timezone.
  const nowDay = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return intervalsByDay[nowDay].some(([start, end]) => nowMinutes >= start && nowMinutes < end);
};

const parseAbsoluteDateTime = (value: any): Date | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ts = value > 1e12 ? value : value * 1000;
    const date = new Date(ts);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value !== 'string') return null;
  const input = value.trim();
  if (!input) return null;
  const looksAbsolute =
    /\d{4}-\d{2}-\d{2}/.test(input) ||
    /T\d{1,2}:\d{2}/.test(input) ||
    /[+-]\d{2}:?\d{2}$/.test(input) ||
    /Z$/.test(input);
  if (!looksAbsolute) return null;
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
};

const inferOpenNowFromOpeningHoursObject = (openingHours: any): boolean | undefined => {
  if (!openingHours || typeof openingHours !== 'object') return undefined;

  const now = new Date();
  const nowMs = now.getTime();
  const nowDay = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let parsedAnyRanges = false;
  const intervalsByDay: Array<Array<[number, number]>> = Array.from({ length: 7 }, () => []);

  const allRanges = [
    ...(Array.isArray(openingHours?.timeRanges) ? openingHours.timeRanges : []),
    ...(Array.isArray(openingHours?.periods) ? openingHours.periods : []),
    ...(Array.isArray(openingHours?.ranges) ? openingHours.ranges : []),
  ];

  for (const range of allRanges) {
    if (!range || typeof range !== 'object') continue;

    const absoluteStart = parseAbsoluteDateTime(
      range.startDateTime || range.startDate || range.startTime || range.start
    );
    const absoluteEnd = parseAbsoluteDateTime(
      range.endDateTime || range.endDate || range.endTime || range.end
    );
    if (absoluteStart && absoluteEnd) {
      parsedAnyRanges = true;
      if (nowMs >= absoluteStart.getTime() && nowMs < absoluteEnd.getTime()) return true;
      continue;
    }

    const dayToken = `${range.dayOfWeek || range.day || range.weekday || ''}`.trim();
    const startRaw = `${range.startTime || range.open || range.from || range.start || ''}`.trim();
    const endRaw = `${range.endTime || range.close || range.to || range.end || ''}`.trim();
    const startMinutes = parseTimeToMinutes(startRaw);
    const endMinutes = parseTimeToMinutes(endRaw);
    if (startMinutes === null || endMinutes === null) continue;

    let dayIndexes = dayToken ? parseDaysFromRowPrefix(dayToken) : [];
    if (dayIndexes.length === 0) dayIndexes = [...ALL_DAYS];
    parsedAnyRanges = true;
    dayIndexes.forEach((day) => {
      if (startMinutes === endMinutes) {
        intervalsByDay[day].push([0, 24 * 60]);
        return;
      }
      if (endMinutes > startMinutes) {
        intervalsByDay[day].push([startMinutes, endMinutes]);
        return;
      }
      intervalsByDay[day].push([startMinutes, 24 * 60]);
      intervalsByDay[(day + 1) % 7].push([0, endMinutes]);
    });
  }

  if (parsedAnyRanges) {
    if (intervalsByDay[nowDay].some(([start, end]) => nowMinutes >= start && nowMinutes < end)) return true;
    return false;
  }

  const textRows: string[] = [];
  if (Array.isArray(openingHours?.text)) {
    textRows.push(...openingHours.text.map((entry: any) => `${entry ?? ''}`).filter(Boolean));
  }
  if (Array.isArray(openingHours?.weekdayText)) {
    textRows.push(...openingHours.weekdayText.map((entry: any) => `${entry ?? ''}`).filter(Boolean));
  }
  if (Array.isArray(openingHours?.hours)) {
    textRows.push(...openingHours.hours.map((entry: any) => `${entry ?? ''}`).filter(Boolean));
  }
  return inferOpenNowFromBusinessHours(textRows);
};

const normalizeCouponLookupValue = (value?: string): string => {
  if (!value || typeof value !== 'string') return '';
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
};

const buildCouponLocationKey = (name?: string, address?: string): string => {
  return `${normalizeCouponLookupValue(name)}|${normalizeCouponLookupValue(address)}`;
};

const NON_COUPON_CATEGORY_PATTERN =
  /\b(parking|garage|fuel|gas station|ev charging|hospital|clinic|doctor|dentist|pharmacy|urgent care|school|university|college|government|city hall|police|fire station|courthouse|library|post office|airport|train station|bus station|bank|atm|church|temple|mosque|synagogue|cemetery|warehouse|storage|repair|mechanic|tire|dmv)\b/i;
const COUPON_FRIENDLY_PATTERN =
  /\b(restaurant|food|cafe|coffee|bakery|pizza|bar|pub|grill|diner|shop|store|retail|mall|outlet|boutique|fashion|beauty|salon|spa|gym|fitness|cinema|movie|theater|hotel|resort|museum|arcade|bowling|amusement)\b/i;
const PROMO_HINT_PATTERN =
  /\b(coupon|promo|discount|deal|offer|special|sale|save|rewards?|loyalty|outlet)\b/i;

const inferPoiHasCoupon = (
  poi: { name: string; address?: string; categories: string[]; website?: string },
  savedCouponLocationKeys: Set<string>
): boolean => {
  const exactKey = buildCouponLocationKey(poi.name, poi.address);
  const nameOnlyKey = `${normalizeCouponLookupValue(poi.name)}|`;
  if (savedCouponLocationKeys.has(exactKey) || savedCouponLocationKeys.has(nameOnlyKey)) return true;

  const combined = `${(poi.categories || []).join(' ')} ${poi.name || ''} ${poi.address || ''} ${poi.website || ''}`
    .toLowerCase()
    .replace(/[_-]/g, ' ');

  if (NON_COUPON_CATEGORY_PATTERN.test(combined)) return false;
  if (PROMO_HINT_PATTERN.test(combined)) return true;
  return COUPON_FRIENDLY_PATTERN.test(combined);
};

const inferPoiOpenNow = (poi: any, businessHours?: string[]): boolean | undefined => {
  const openingHours = poi?.poi?.openingHours || poi?.openingHours;
  const objectOpenNow = inferOpenNowFromOpeningHoursObject(openingHours);
  if (typeof objectOpenNow === 'boolean') return objectOpenNow;

  const scheduleOpenNow = inferOpenNowFromBusinessHours(businessHours);
  if (typeof scheduleOpenNow === 'boolean') return scheduleOpenNow;

  const candidates = [
    openingHours?.isOpen,
    openingHours?.isOpenNow,
    openingHours?.openNow,
    poi?.isOpen,
    poi?.openNow,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'boolean') return candidate;
  }
  const status = `${openingHours?.status || openingHours?.state || ''}`.toLowerCase();
  if (status.includes('open')) return true;
  if (status.includes('closed')) return false;
  return undefined;
};

const getStarFillPercent = (value: number, star: number): number => {
  const raw = value - (star - 1);
  if (raw <= 0) return 0;
  if (raw >= 1) return 100;
  return raw * 100;
};

const getSpeechRecognitionCtor = (): any => {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

const extractSpeechFromEvent = (event: any): { finalText: string; interimText: string; combinedText: string } => {
  const results = event?.results;
  const total = typeof results?.length === 'number' ? results.length : 0;
  let finalText = '';
  let interimText = '';

  for (let i = 0; i < total; i += 1) {
    const result = results[i];
    if (!result || typeof result.length !== 'number') continue;
    const transcript = `${result[0]?.transcript || ''}`.trim();
    if (!transcript) continue;
    if (result.isFinal) {
      finalText = `${finalText} ${transcript}`.trim();
    } else {
      interimText = `${interimText} ${transcript}`.trim();
    }
  }

  const combinedText = finalText || interimText;
  return { finalText, interimText, combinedText };
};

const LocationDetailBlock = ({ details }: { details?: Pick<Business, 'phone' | 'businessHours'> }) => {
  const formattedHours = formatBusinessHoursForDisplay(details?.businessHours, 2);
  const hoursText = formattedHours.length > 0 ? formattedHours.join(' | ') : 'N/A';

  return (
    <div className="mt-2.5 space-y-1.5 text-[11px] leading-snug">
      <div className="grid grid-cols-[72px_1fr] items-start gap-2 rounded-md border border-cyan-400/20 bg-white/5 px-2.5 py-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-200/85">Phone</p>
        <p className="text-gray-200 break-words">{details?.phone || 'N/A'}</p>
      </div>
      <div className="grid grid-cols-[72px_1fr] items-start gap-2 rounded-md border border-cyan-400/20 bg-white/5 px-2.5 py-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-200/85">Hours</p>
        <p className="text-gray-300 break-words">{hoursText}</p>
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
  const [poiMinRating, setPoiMinRating] = useState<number>(0);
  const [poiOpenFilter, setPoiOpenFilter] = useState<PoiOpenFilter>('all');
  const [poiCouponFilter, setPoiCouponFilter] = useState<PoiCouponFilter>('all');
  const poiMarkerEntriesRef = useRef<Array<{ marker: any; poi: PoiListItem }>>([]);
  const {scrollY} = useScroll();
  const marginTop = useTransform(scrollY, [0, 100], ["0px", "12px"]);
  const marginBottom = useTransform(scrollY, [0, 100], ["0px", "12px"]);
	const right = useTransform(scrollY, [0, 100], ["0px", "1%"]);
	const bgColor = useTransform(scrollY, [0, 100], ["rgba(23, 23, 23, 1)", "rgba(30, 30, 30, 0.7)"]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [favoriteLocations, setFavoriteLocations] = useState<Location[]>([]);
  const [savedCouponLocationKeys, setSavedCouponLocationKeys] = useState<Set<string>>(new Set());
  const [likedLocations] = useState<Business[]>([]);
  const [speechToTextSupported, setSpeechToTextSupported] = useState(false);
  const [speechToTextListening, setSpeechToTextListening] = useState(false);
  const speechRecognitionRef = useRef<any>(null);
  const runSearchQueryRef = useRef<(query: string) => Promise<void>>(async () => {});
  const latestFinalSpeechRef = useRef('');
  const speechDraftRef = useRef('');
  const speechHadFinalRef = useRef(false);
  const geolocationWatchRef = useRef<number | null>(null);
  const markerAnimationRef = useRef<number | null>(null);
  const displayedUserLocRef = useRef<{ lat: number; lng: number } | null>(null);
  const userHeadingRef = useRef<number>(0);
  const isNavigatingRef = useRef(false);
  const activeRouteRef = useRef<RouteInfo | null>(null);
  const lastSpokenInstructionRef = useRef<string | null>(null);
  const voiceSpeakTimeoutRef = useRef<number | null>(null);
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

  useEffect(() => {
    if (!user?.uid) {
      setSavedCouponLocationKeys(new Set());
      return;
    }
    try {
      const storageKey = `bizmatch_saved_coupon_meta_${Number(user.uid)}`;
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      const nextKeys = new Set<string>();
      if (parsed && typeof parsed === 'object') {
        Object.values(parsed as Record<string, any>).forEach((entry: any) => {
          const name = typeof entry?.name === 'string' ? entry.name : '';
          const address = typeof entry?.address === 'string' ? entry.address : '';
          const fullKey = buildCouponLocationKey(name, address);
          const nameOnlyKey = `${normalizeCouponLookupValue(name)}|`;
          if (fullKey !== '|') nextKeys.add(fullKey);
          if (nameOnlyKey !== '|') nextKeys.add(nameOnlyKey);
        });
      }
      setSavedCouponLocationKeys(nextKeys);
    } catch {
      setSavedCouponLocationKeys(new Set());
    }
  }, [user?.uid]);

  useEffect(() => {
    setPoiResults((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const next = prev.map((poi) => {
        const hasCoupon = inferPoiHasCoupon(
          {
            name: poi.name,
            address: poi.address,
            categories: poi.categories || [],
            website: poi.website,
          },
          savedCouponLocationKeys
        );
        if (hasCoupon === poi.hasCoupon) return poi;
        changed = true;
        return { ...poi, hasCoupon };
      });
      return changed ? next : prev;
    });
  }, [savedCouponLocationKeys]);

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

  useEffect(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      setSpeechToTextSupported(false);
      return;
    }

    setSpeechToTextSupported(true);
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      latestFinalSpeechRef.current = '';
      speechDraftRef.current = '';
      speechHadFinalRef.current = false;
      setSpeechToTextListening(true);
    };
    recognition.onresult = (event: any) => {
      const { finalText, combinedText } = extractSpeechFromEvent(event);
      if (combinedText) {
        speechDraftRef.current = combinedText;
        setInputValue(combinedText);
      }
      if (finalText) {
        latestFinalSpeechRef.current = finalText;
        speechHadFinalRef.current = true;
        void runSearchQueryRef.current(finalText);
      }
    };
    recognition.onnomatch = () => {
      showToastNotice('Could not understand that voice input. Please try again.', true);
    };
    recognition.onerror = (event: any) => {
      setSpeechToTextListening(false);
      const code = `${event?.error || ''}`.toLowerCase();
      if (code === 'no-speech') {
        showToastNotice('No speech detected. Try again and speak closer to the microphone.', true);
      } else if (code === 'not-allowed' || code === 'service-not-allowed') {
        showToastNotice('Microphone permission is blocked. Enable mic permission for this site.', true);
      } else {
        showToastNotice('Voice input failed. Please try again.', true);
      }
    };
    recognition.onend = () => {
      setSpeechToTextListening(false);
      const draft = speechDraftRef.current.trim();
      if (!speechHadFinalRef.current && draft) {
        setInputValue(draft);
      }
    };

    speechRecognitionRef.current = recognition;
    return () => {
      try {
        recognition.stop();
      } catch {
        // ignore stop errors
      }
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onnomatch = null;
      recognition.onerror = null;
      recognition.onend = null;
      if (speechRecognitionRef.current === recognition) {
        speechRecognitionRef.current = null;
      }
    };
  }, []);

  const toggleSpeechToText = () => {
    if (!speechToTextSupported || !speechRecognitionRef.current) {
      showToastNotice('Speech-to-text is not supported on this browser.', true);
      return;
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      showToastNotice('Voice input requires HTTPS (or localhost) in this browser.', true);
      return;
    }

    if (speechToTextListening) {
      speechRecognitionRef.current.stop();
      return;
    }

    try {
      speechRecognitionRef.current.abort?.();
      speechRecognitionRef.current.start();
    } catch (error: any) {
      const code = `${error?.name || ''}`.toLowerCase();
      if (code.includes('notallowed')) {
        showToastNotice('Microphone permission is blocked. Enable mic permission and retry.', true);
      } else {
      showToastNotice('Unable to start microphone input right now.', true);
      }
    }
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
  const matchesPoiFilters = (poi: PoiListItem): boolean => {
    if (!isPoiWithinRadius(poi.distanceMeters)) return false;

    if (poiMinRating > 0) {
      if (typeof poi.rating !== 'number' || poi.rating < poiMinRating) return false;
    }

    if (poiOpenFilter === 'open' && poi.isOpenNow !== true) return false;
    if (poiOpenFilter === 'closed' && poi.isOpenNow !== false) return false;

    if (poiCouponFilter === 'with' && !poi.hasCoupon) return false;
    if (poiCouponFilter === 'without' && poi.hasCoupon) return false;

    return true;
  };

  const filteredPoiResults = poiResults.filter((poi) => {
    return matchesPoiFilters(poi);
  });
  const applyPoiFiltersToMarkers = () => {
    poiMarkerEntriesRef.current.forEach(({ marker, poi }) => {
      const markerEl = marker?.getElement?.();
      if (!markerEl) return;
      markerEl.style.display = matchesPoiFilters(poi) ? '' : 'none';
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
    el.innerHTML = '<div class="w-5 h-5 bg-[#3F92FF] border-[4px] border-white rounded-full shadow-[0_0_15px_#3F92FF]"></div>';
    
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
    if (voiceSpeakTimeoutRef.current !== null) {
      window.clearTimeout(voiceSpeakTimeoutRef.current);
      voiceSpeakTimeoutRef.current = null;
    }
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
      .replace(/\bdr\b/gi, 'Drive')
      .replace(/\bst\b/gi, 'Street')
      .replace(/\bave\b/gi, 'Avenue')
      .replace(/\brd\b/gi, 'Road')
      .replace(/\bblvd\b/gi, 'Boulevard')
      .replace(/\bhwy\b/gi, 'Highway');
    if (instruction.maneuverType?.toLowerCase() === 'arrive') {
      return `${stepLabel} You are arriving at ${destinationName || 'your destination'}.`;
    }
    return `${stepLabel} ${speechFriendlyMessage}. Continue for ${distance}.`;
  };

  const pickBestVoice = (): SpeechSynthesisVoice | null => {
    if (!isVoiceSupported) return null;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;
    const preferredNames = [
      'Google US English',
      'Microsoft Jenny Online (Natural) - English (United States)',
      'Microsoft Aria Online (Natural) - English (United States)',
      'Microsoft Guy Online (Natural) - English (United States)',
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

    if (voiceSpeakTimeoutRef.current !== null) {
      window.clearTimeout(voiceSpeakTimeoutRef.current);
      voiceSpeakTimeoutRef.current = null;
    }

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
      if (voiceSpeakTimeoutRef.current !== null) {
        window.clearTimeout(voiceSpeakTimeoutRef.current);
        voiceSpeakTimeoutRef.current = null;
      }
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
      const newMarkerEntries: Array<{ marker: any; poi: PoiListItem }> = [];
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
          const isOpenNow = inferPoiOpenNow(poi, details.businessHours);
          const hasCoupon = inferPoiHasCoupon(
            {
              name: poiName,
              address: poiAddress,
              categories: poiCategories,
              website: details.website,
            },
            savedCouponLocationKeys
          );
          const mappedPoi: PoiListItem = {
            id: poi.id || `${type}-${lat}-${lng}`,
            name: poiName,
            address: poiAddress,
            lat,
            lng,
            icon,
            type,
            categories: poiCategories,
            distanceMeters: poi.dist || 0,
            rating: normalizePoiRating(poi.poi?.rating ?? poi.rating ?? poi.score),
            isOpenNow,
            hasCoupon,
            ...details
          };
          
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

          newMarkerEntries.push({ marker, poi: mappedPoi });
          nextPoiResults.push(mappedPoi);
          newMarkers.push(marker);
          bounds.extend([lng, lat]);
        }
      });

      // Update both state and ref
      poiMarkersRef.current = newMarkers;
      poiMarkerEntriesRef.current = newMarkerEntries;
      setPoiMarkers(newMarkers);
      setPoiResults(nextPoiResults);
      applyPoiFiltersToMarkers();
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
    applyPoiFiltersToMarkers();
  }, [poiRadiusFilter, poiMinRating, poiOpenFilter, poiCouponFilter, poiResults]);

  const handlePoiRatingSelect = (star: number, event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const isHalf = clickX <= rect.width / 2;
    const next = Math.max(0.5, Math.min(5, star - (isHalf ? 0.5 : 0)));
    setPoiMinRating((prev) => (Math.abs(prev - next) < 0.001 ? 0 : next));
  };

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

  const runSearchByQuery = async (queryRaw: string) => {
    const query = queryRaw.trim();
    if (!query) return;

    try {
      const res = await services.fuzzySearch({
        key: API_KEY,
        query,
        center: [userLoc.lng, userLoc.lat],
        limit: 1,
        openingHours: 'nextSevenDays'
      } as any);

      if (res.results && res.results.length > 0) {
        handleSelectSuggestion(res.results[0]);
      } else {
        showToastNotice(`No locations found for: ${query}`, true);
      }
    } catch (e) {
      console.error('Search failed:', e);
      showToastNotice('Search failed. Please try again.', true);
    }
  };

  useEffect(() => {
    runSearchQueryRef.current = runSearchByQuery;
  }, [runSearchByQuery]);

  const handleSearch = async () => {
    await runSearchByQuery(inputValue);
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
        paint: { 'line-color': '#3F92FF', 'line-width': 8, 'line-opacity': 0.9 }
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
            <Links link="discount" className="text-[15px]">
              Coupons <TicketPercent size={18} />
            </Links>
            <Links link="reviews" className="text-[15px]">
              Reviews <Star size={18} />
            </Links>
          </Navbar>        
          {/*Animation for loading map*/}
          {!mapLoaded && !mapError && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-500 text-lg flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-[3px] border-neutral-800 border-t-[#3F92FF] rounded-full animate-spin"></div>
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
                1. Get a TomTom API key from <a href="https://developer.tomtom.com/" target="_blank" rel="noopener noreferrer" className="text-cyan-500">developer.tomtom.com</a><br/>
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
                    <h4 className="m-0 text-cyan-500 text-md">{stats.name}</h4>
                    <p className="m-0 mt-0.5 text-gray-400 text-[11px]">{stats.miles} mi • {stats.mins} min</p>
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
                          if (voiceSpeakTimeoutRef.current !== null) {
                            window.clearTimeout(voiceSpeakTimeoutRef.current);
                            voiceSpeakTimeoutRef.current = null;
                          }
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
                  <button className="border-none text-cyan-500 w-7 h-7 rounded-full cursor-pointer text-sm hover:bg-white/5" onClick={() => cancelNavigation(true)}>✕</button>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-[#3F92FF1A] to-[#2F75D90D]"> 
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

              <div className="text-center p-2.5 text-cyan-500 cursor-pointer text-xs border-t border-neutral-800 hover:bg-white/5" onClick={() => setShowFullDirections(!showFullDirections)}>
                {showFullDirections ? '▲ Hide all steps' : '▼ Show all steps'}
              </div>

              {showFullDirections && (
                <div className="max-h-[150px] overflow-y-auto border-t border-neutral-800">
                  {stats.instructions.map((inst, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2.5 px-4 cursor-pointer border-b border-neutral-800 hover:bg-white/5 ${idx === navStep ? 'bg-[#3F92FF26] border-l-[3px] border-l-[#3F92FF]' : ''} ${idx < navStep ? 'opacity-50' : ''}`}
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
                <button
                  className={`border-none p-2 rounded-lg cursor-pointer text-sm transition-colors ${
                    speechToTextListening
                      ? 'bg-red-500/30 text-red-200 hover:bg-red-500/40'
                      : speechToTextSupported
                      ? 'bg-neutral-800 text-cyan-300 hover:bg-neutral-700'
                      : 'bg-neutral-800/60 text-neutral-500 cursor-not-allowed'
                  }`}
                  onClick={toggleSpeechToText}
                  disabled={!speechToTextSupported}
                  title={speechToTextListening ? 'Stop voice input' : 'Start voice input'}
                >
                  {speechToTextListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <button className="bg-[#3F92FF] border-none text-white p-2 px-3 rounded-lg cursor-pointer text-sm font-bold hover:bg-[#2F75D9]" onClick={handleSearch}>🔍</button>
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

            <div className="mt-2.5 grid grid-cols-3 gap-2 text-[11px]">
              <label className="rounded-xl border border-neutral-800 bg-neutral-900/95 px-2 py-1.5">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-cyan-200/80">Rating</span>
                <div className="flex items-center justify-between gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={`poi-rating-${star}`}
                      onClick={(e) => handlePoiRatingSelect(star, e)}
                      className="rounded-sm p-0.5 hover:bg-white/10 transition-colors"
                      aria-label={`Set minimum rating ${star}`}
                    >
                      <span className="relative block h-4 w-4 leading-none">
                        <span className="absolute inset-0 text-[16px] text-neutral-600">★</span>
                        <span
                          className="absolute inset-0 overflow-hidden text-[16px] text-amber-300"
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
                  <button
                    onClick={() => setPoiMinRating(0)}
                    className="text-[10px] text-cyan-300 hover:text-cyan-200"
                  >
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

            <div className="relative mt-2.5 text-[14px]">
              <button
                onClick={() => setIsPoiDropdownOpen(!isPoiDropdownOpen)}
                className="w-full bg-neutral-900/95 text-white border border-neutral-800 p-3 rounded-xl flex justify-between items-center hover:border-[#3F92FF] transition-colors"
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
                            className={`w-full text-left px-4 py-3 text-gray-300 hover:bg-white/10 flex items-center gap-3 transition-colors border-b border-neutral-800 last:border-none ${activePoiType === item.type ? 'bg-white/5 text-cyan-500' : ''}`}
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
                            className="fixed top-20 bottom-3 right-2 z-[1500] w-[92vw] max-w-[360px] rounded-2xl border border-cyan-500/30 bg-neutral-900/90 p-3 sm:p-4 shadow-2xl backdrop-blur-xl"
                        >
                            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                                <h3 className="text-cyan-300 text-base sm:text-lg font-semibold">All Favorited Locations</h3>
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
                                        <div key={i} className="mb-3 rounded-xl border border-white/10 bg-neutral-800/55 p-2.5 sm:p-3 hover:bg-neutral-800/80 transition-colors">
                                            <div className="flex-1 cursor-pointer " onClick={() => { setShowSidebar(false); setShowPoiSidebar(false); navigate(buildMapRouteUrl(loc)); }}>
                                                <h4 className="text-cyan-300 text-base sm:text-lg font-semibold">{loc.name}</h4>
                                                <p className="text-gray-400 text-sm">{loc.address}</p>
                                                <LocationDetailBlock details={loc} />
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
                                {likedLocations.length!==0&&(<p className="text-gray-400 text-center py-4">New Locations Liked</p>)}
                                {likedLocations.map((loc, index) => (
                                    <div
                                        key={index}
                                        className="mb-3 rounded-xl border border-white/10 bg-neutral-800/55 p-2.5 sm:p-3 cursor-pointer hover:bg-neutral-800/80 transition-colors"
                                        onClick={() => { setShowSidebar(false); setShowPoiSidebar(false); navigate(buildMapRouteUrl(loc)); }}
                                    >
                                        <h4 className="text-cyan-300 text-base sm:text-lg font-semibold">{loc.name}</h4>
                                        <p className="text-gray-400 text-sm">{loc.address}</p>
                                        <LocationDetailBlock details={loc} />
                                        <div className="mt-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
                                          <LocationReviewsPopup
                                            location={{ lid: loc.lid, name: loc.name, address: loc.address }}
                                            buttonClassName="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-[11px] text-gray-200 hover:bg-white/10"
                                          />
                                        </div>
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
                }}
                className="fixed top-20 bottom-3 right-2 z-[1500] w-[94vw] max-w-[400px] rounded-2xl overflow-hidden border border-cyan-500/30 bg-neutral-900/90 p-3 sm:p-4 shadow-2xl backdrop-blur-xl flex flex-col"
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
                <div className="px-1 pb-2 border-b border-white/10">
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div className="rounded-lg border border-neutral-700 bg-neutral-800/60 px-2 py-1.5">
                      <p className="mb-1 font-semibold uppercase tracking-wide text-cyan-200/80">Rating</p>
                      <div className="flex items-center justify-between gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={`sidebar-poi-rating-${star}`}
                            onClick={(e) => handlePoiRatingSelect(star, e)}
                            className="rounded-sm p-0.5 hover:bg-white/10 transition-colors"
                            aria-label={`Set minimum rating ${star}`}
                          >
                            <span className="relative block h-3.5 w-3.5 leading-none">
                              <span className="absolute inset-0 text-[13px] text-neutral-600">★</span>
                              <span
                                className="absolute inset-0 overflow-hidden text-[13px] text-amber-300"
                                style={{ width: `${getStarFillPercent(poiMinRating, star)}%` }}
                              >
                                ★
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="rounded-lg border border-neutral-700 bg-neutral-800/60 px-2 py-1.5">
                      <span className="mb-1 block font-semibold uppercase tracking-wide text-cyan-200/80">Open</span>
                      <select
                        value={poiOpenFilter}
                        onChange={(e) => setPoiOpenFilter(e.target.value as PoiOpenFilter)}
                        className="w-full border-none bg-transparent text-white outline-none text-[11px]"
                      >
                        <option value="all" className="bg-neutral-900 text-white">Any</option>
                        <option value="open" className="bg-neutral-900 text-white">Open</option>
                        <option value="closed" className="bg-neutral-900 text-white">Closed</option>
                      </select>
                    </label>
                    <label className="rounded-lg border border-neutral-700 bg-neutral-800/60 px-2 py-1.5">
                      <span className="mb-1 block font-semibold uppercase tracking-wide text-cyan-200/80">Coupon</span>
                      <select
                        value={poiCouponFilter}
                        onChange={(e) => setPoiCouponFilter(e.target.value as PoiCouponFilter)}
                        className="w-full border-none bg-transparent text-white outline-none text-[11px]"
                      >
                        <option value="all" className="bg-neutral-900 text-white">Any</option>
                        <option value="with" className="bg-neutral-900 text-white">Has</option>
                        <option value="without" className="bg-neutral-900 text-white">No</option>
                      </select>
                    </label>
                  </div>
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
                    <p className="text-gray-400 text-center py-4">No POI locations match the selected filters.</p>
                  ) : (
                    filteredPoiResults.map((poi) => (
                      <div
                        key={poi.id}
                        className="mb-3 rounded-xl border border-white/10 bg-neutral-800/50 p-3 cursor-pointer hover:bg-neutral-800/80 transition-colors"
                        onClick={() => { setShowPoiSidebar(false); handlePoiResultClick(poi); }}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="text-xl">{poi.icon}</span>
                          <div className="flex-1">
                            <h3 className="text-base sm:text-lg font-bold text-cyan-400/80">{poi.name}</h3>
                            <p className="text-gray-400 text-sm">{poi.address}</p>
                            <p className="text-gray-500 text-xs mt-1">{metersToMiles(poi.distanceMeters).toFixed(1)} mi away</p>
                            <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
                              <p className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-300">
                                Rating: {typeof poi.rating === 'number' ? `${poi.rating.toFixed(1)}★` : 'N/A'}
                              </p>
                              <p className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-300">
                                Open: {typeof poi.isOpenNow === 'boolean' ? (poi.isOpenNow ? 'Yes' : 'No') : 'N/A'}
                              </p>
                              <p className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-300">
                                Coupon: {poi.hasCoupon ? 'Yes' : 'No'}
                              </p>
                            </div>
                            {poi.categories.length > 0 && (
                              <p className="text-gray-500 text-xs mt-2">
                                {poi.categories.join(', ')}
                              </p>
                            )}
                            <LocationDetailBlock details={poi} />
                            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                              <LocationReviewsPopup
                                location={{
                                  name: poi.name,
                                  address: poi.address,
                                  latitude: poi.lat,
                                  longitude: poi.lng,
                                  categories: poi.categories,
                                  phone: poi.phone,
                                  email: poi.email,
                                  website: poi.website,
                                  businessHours: poi.businessHours,
                                }}
                                buttonClassName="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-[11px] text-gray-200 hover:bg-white/10"
                              />
                            </div>
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
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-neutral-900/95 border border-neutral-800 p-3.5 sm:p-4 rounded-2xl w-[min(92vw,440px)] z-[1000] shadow-xl">
              <div className="mb-3">
                <h3 className="m-0 mb-1 text-cyan-500 text-sm">{stats.name}</h3>
                <p className="m-0 mb-3 text-gray-400 text-sm">{stats.miles} mi • {stats.mins} min</p>
                <LocationDetailBlock details={routeFavoriteLocation || undefined} />
              </div>
              <div className="flex flex-nowrap items-center gap-2">
                <button className="flex-1 min-w-0 whitespace-nowrap bg-cyan-500 text-white border-none px-3 py-2.5 rounded-lg font-bold cursor-pointer hover:bg-cyan-400 transition-colors text-xs sm:text-sm" onClick={startNavigation}>Start Navigation</button>
                <button className="shrink-0 whitespace-nowrap bg-neutral-800 text-white border-none px-3 py-2.5 rounded-lg cursor-pointer hover:bg-neutral-700 text-xs sm:text-sm" onClick={() => { setStats(null); clearMap(); }}>Close</button>
                <LocationReviewsPopup
                  location={{
                    lid: routeFavoriteLocation?.lid,
                    name: stats.name,
                    address: routeFavoriteLocation?.address || stats.name,
                    latitude: routeFavoriteLocation?.latitude,
                    longitude: routeFavoriteLocation?.longitude,
                    categories: routeFavoriteLocation?.category,
                    phone: routeFavoriteLocation?.phone,
                    email: routeFavoriteLocation?.email,
                    website: routeFavoriteLocation?.website,
                    businessHours: routeFavoriteLocation?.businessHours,
                  }}
                  buttonClassName="shrink-0 whitespace-nowrap rounded-lg border border-neutral-700 bg-neutral-800 text-white px-2 py-1.5 text-[11px] hover:bg-neutral-700"
                />
                <button className="shrink-0 flex items-center justify-center bg-neutral-800 border-none w-8 h-8 text-white rounded-full cursor-pointer text-sm hover:bg-neutral-700" onClick={addRouteLocationToFavorites}><HeartPlus className="justify-center items-center text-green-500 drop-shadow-lg"/></button>
              </div>
            </div>
          )}
          {/* Location Info Popup */}
          {showImageLocationPopup && selectedLocation && (
            <div className="absolute top-[66%] sm:top-[64%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-neutral-900/98 border border-neutral-800 rounded-2xl w-[92vw] max-w-[410px] sm:max-w-[430px] z-[3000] shadow-2xl max-h-[68vh] sm:max-h-[72vh] overflow-hidden">
              <div className="flex justify-between items-center p-3.5 sm:p-4 border-b border-neutral-800">
                <h3 className="m-0 text-cyan-500 text-base sm:text-lg">Location Details</h3> 
                <div className="flex items-center gap-2">
                <button className="flex items-center justify-center bg-neutral-800 border-none w-8 h-8 text-white rounded-full cursor-pointer text-sm hover:bg-neutral-700" onClick={addSelectedLocationToFavorites}><HeartPlus className="justify-center items-center text-green-500 drop-shadow-lg"/></button>
                <button className="bg-neutral-800 border-none w-8 h-8 rounded-full cursor-pointer text-sm hover:bg-neutral-700 text-red-500/80" onClick={closeSelectedLocationPopup}>✕</button>
                </div>
              </div>
              <div className="p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
                <h4 className="text-cyan-300 text-base m-0">{selectedLocation.name}</h4>
                {selectedLocation.imageUrl && (
                  <div className="w-full h-[150px] sm:h-[180px] bg-neutral-900 rounded-lg overflow-hidden flex items-center justify-center border border-neutral-800">
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
                <p className="text-white text-xs sm:text-sm leading-relaxed p-2 bg-white/5 rounded-lg m-0">📍 {selectedLocation?.address}</p>
                <LocationDetailBlock details={selectedLocation} />
                <div className="flex flex-nowrap items-center justify-center pt-1 gap-2">
                  <button className="min-w-0 whitespace-nowrap bg-cyan-500 text-white border-none px-4 py-2.5 rounded-lg font-bold cursor-pointer text-xs sm:text-sm flex-1 transition-all hover:bg-cyan-400 hover:scale-[1.02]" onClick={navigateToSelectedLocation}>Navigate ➤</button>
                  <LocationReviewsPopup
                    location={{
                      lid: selectedLocation?.lid,
                      name: selectedLocation?.name || 'Selected Location',
                      address: selectedLocation?.address,
                      latitude: selectedLocation?.latitude,
                      longitude: selectedLocation?.longitude,
                      categories: selectedLocation?.category,
                      phone: selectedLocation?.phone,
                      email: selectedLocation?.email,
                      website: selectedLocation?.website,
                      businessHours: selectedLocation?.businessHours,
                    }}
                    buttonClassName="shrink-0 whitespace-nowrap rounded-lg border border-white/20 bg-white/5 px-2.5 py-2 text-[11px] text-gray-200 hover:bg-white/10"
                  />
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
              className={`w-[55px] h-[40px] md:w-[60px] md:h-[50px] bg-neutral-900/95 text-white border border-neutral-800 rounded-xl cursor-pointer text-[22px] flex flex-col items-center justify-center shadow-lg transition-all hover:scale-105 hover:border-[#3F92FF] ${trafficOn ? 'border-[#3F92FF] text-cyan-500 bg-[#3F92FF1A]' : ''}`} 
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
              className="text-[14px] w-[55px] h-[40px] md:w-[60px] md:h-[50px] bg-neutral-900/95 text-white border border-neutral-800 rounded-xl cursor-pointer text-[22px] flex flex-col items-center justify-center shadow-lg transition-all hover:scale-105 hover:border-[#3F92FF]"
              title="My Location"
            >
              📍
            </button>
            <button 
              onClick={() => {
                setMapPerspective(prev => prev === '2d' ? '3d' : '2d');
              }}
              className={`text-[14px] w-[55px] h-[40px] md:w-[60px] md:h-[50px] bg-neutral-900/95 text-white border border-neutral-800 rounded-xl cursor-pointer text-sm flex flex-col items-center justify-center shadow-lg transition-all hover:scale-105 hover:border-[#3F92FF] ${mapPerspective === '3d' ? 'border-[#3F92FF] text-cyan-500 bg-[#3F92FF1A]' : ''}`}
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
              className={`w-[55px] h-[40px] md:w-[60px] md:h-[50px] bg-neutral-900/95 text-white border border-neutral-800 rounded-xl cursor-pointer text-sm flex flex-col items-center justify-center shadow-lg transition-all hover:scale-105 hover:border-[#3F92FF] ${mapStyle !== 'regular' ? 'border-[#3F92FF] text-cyan-500 bg-[#3F92FF1A]' : ''}`}
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
              className={`w-[55px] h-[40px] md:w-[60px] md:h-[50px] bg-neutral-900/95 text-white border border-neutral-800 rounded-xl cursor-pointer text-sm flex flex-col items-center justify-center shadow-lg transition-all hover:scale-105 hover:border-[#3F92FF]`}
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
