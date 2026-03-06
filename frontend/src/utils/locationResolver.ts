export interface ResolveLocationInput {
  lid?: number;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  type?: number;
  categories?: string[];
}

interface DbLocation {
  lid: number;
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

const normalizeText = (value?: string): string => {
  if (!value || typeof value !== 'string') return '';
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
};

const numbersClose = (a?: number, b?: number, epsilon = 0.00045): boolean => {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(Number(a) - Number(b)) <= epsilon;
};

const findExistingLocationId = (locations: DbLocation[], input: ResolveLocationInput): number | null => {
  const name = normalizeText(input.name);
  const address = normalizeText(input.address);

  if (!name && !address) return null;

  const exact = locations.find((loc) => {
    const locName = normalizeText(loc.name);
    const locAddress = normalizeText(loc.address);
    if (!locName || !locAddress || !name || !address) return false;
    return locName === name && locAddress === address;
  });
  if (exact?.lid && exact.lid > 0) return exact.lid;

  const closeByCoords = locations.find((loc) => {
    if (!numbersClose(loc.latitude, input.latitude) || !numbersClose(loc.longitude, input.longitude)) return false;
    const locName = normalizeText(loc.name);
    if (!name || !locName) return true;
    return locName.includes(name) || name.includes(locName);
  });
  if (closeByCoords?.lid && closeByCoords.lid > 0) return closeByCoords.lid;

  const byAddress = locations.find((loc) => {
    const locAddress = normalizeText(loc.address);
    if (!locAddress || !address) return false;
    return locAddress === address;
  });
  if (byAddress?.lid && byAddress.lid > 0) return byAddress.lid;

  return null;
};

export const resolveLocationId = async (input: ResolveLocationInput): Promise<number | null> => {
  if (Number.isFinite(input.lid) && Number(input.lid) > 0) return Number(input.lid);

  try {
    const allRes = await fetch('http://localhost:5173/loc/all', { credentials: 'include' });
    if (allRes.ok) {
      const allData = await allRes.json().catch(() => []);
      const allLocations = Array.isArray(allData) ? (allData as DbLocation[]) : [];
      const existingId = findExistingLocationId(allLocations, input);
      if (existingId) return existingId;
    }
  } catch {
    // ignore lookup failures and try create fallback
  }

  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) return null;

  try {
    const createRes = await fetch('http://localhost:5173/loc/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: input.name,
        address: input.address || input.name,
        longitude: input.longitude,
        latitude: input.latitude,
        type: input.type || 1,
        categories: input.categories || [],
      }),
    });
    if (!createRes.ok) return null;
    const createData = await createRes.json().catch(() => ({}));
    const createdId = Number(createData?.location_id);
    return Number.isFinite(createdId) && createdId > 0 ? createdId : null;
  } catch {
    return null;
  }
};
