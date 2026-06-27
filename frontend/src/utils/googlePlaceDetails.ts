export interface SocialLink {
  platform: string;
  url: string;
}

export interface PoiDetails {
  phone?: string;
  email?: string;
  website?: string;
  businessHours?: string[];
  socials?: SocialLink[];
}

export const fetchGooglePlaceDetails = async (apiKey: string, location: { lat: number, lng: number, name: string, address?: string }): Promise<PoiDetails | null> => {
    try {
        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.internationalPhoneNumber,places.websiteUri,places.regularOpeningHours'
            },
            body: JSON.stringify({
                textQuery: location.name,
                locationBias: {
                    circle: {
                        center: { latitude: location.lat, longitude: location.lng },
                        radius: 500.0
                    }
                }
            })
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        const places = data.places || [];
        if (places.length === 0) return null;
        
        const place = places[0];
        
        let businessHours = undefined;
        if (place.regularOpeningHours && place.regularOpeningHours.weekdayDescriptions) {
            businessHours = place.regularOpeningHours.weekdayDescriptions;
        }

        return {
            phone: place.internationalPhoneNumber,
            website: place.websiteUri,
            businessHours: businessHours,
            socials: [], // Google Places doesn't natively return social links like TomTom extended data
            email: undefined
        };
    } catch (e) {
        console.error("Error fetching google place details", e);
        return null;
    }
};

export const formatBusinessHoursForDisplay = (hours?: string[], maxRows = 2): string[] => {
    if (!hours || hours.length === 0) return [];
    return hours.slice(0, maxRows);
};

export const serializeBusinessHours = (hours?: string[]): string => {
    if (!hours || hours.length === 0) return '';
    return JSON.stringify(hours);
};

export const serializeSocials = (socials?: SocialLink[]): string => {
    if (!socials || socials.length === 0) return '';
    return JSON.stringify(socials);
};
