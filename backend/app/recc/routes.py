from flask import request, jsonify, render_template, url_for, redirect
from . import recc_bp
from app.models import User, Review, Location
from app import db
from app.recc.categories import CATEGORY_MAPPING
from flask_login import login_required, current_user
import requests
import os
import unicodedata
import math

# TomTom API key loaded from environment variables (moved inside function for late binding)
# google_maps_api_key = os.getenv('GOOGLE_MAPS_API_KEY')

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000
    phi_1 = math.radians(lat1)
    phi_2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi_1) * math.cos(phi_2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def fetch_google_data(latitude, longitude, radius_mi=5, limit=20):
    import concurrent.futures
    import os
    google_maps_api_key = os.getenv('GOOGLE_MAPS_API_KEY')
    if latitude is None or longitude is None:
        return []
    try:
        center_lat = float(latitude)
        center_lon = float(longitude)
    except (TypeError, ValueError):
        return []

    radius_meters = min(radius_mi * 1609.34, 50000.0)
    
    headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': google_maps_api_key,
        'X-Goog-FieldMask': 'places.name,places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.photos,places.nationalPhoneNumber,places.websiteUri,places.regularOpeningHours'
    }
    
    type_chunks = [
        ["restaurant"],
        ["cafe", "bakery"],
        ["store"],
        ["clothing_store"],
        ["bar"],
        ["park"],
        ["museum", "tourist_attraction"]
    ]
    
    all_places = []
    seen_places = set()
    
    def fetch_chunk(args):
        chunk, rank_pref = args
        payload = {
            "includedTypes": chunk,
            "maxResultCount": 20,
            "locationRestriction": {
                "circle": {
                    "center": {
                        "latitude": center_lat,
                        "longitude": center_lon
                    },
                    "radius": radius_meters if rank_pref == "POPULARITY" else min(radius_meters, 8000.0)
                }
            }
        }
        if rank_pref:
            payload["rankPreference"] = rank_pref
            
        try:
            response = requests.post("https://places.googleapis.com/v1/places:searchNearby", headers=headers, json=payload, timeout=8)
            if response.status_code == 200:
                return response.json().get('places', [])
        except requests.RequestException:
            pass
        return []

    requests_to_make = []
    for chunk in type_chunks:
        requests_to_make.append((chunk, "POPULARITY"))
        requests_to_make.append((chunk, "DISTANCE"))
        
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        results = executor.map(fetch_chunk, requests_to_make)
        
    for places in results:
        for place in places:
            place_id = place.get('name')
            if place_id not in seen_places:
                seen_places.add(place_id)
                all_places.append(place)
            
    recommendations = []
    
    # Chains to penalize
    chains = ['mcdonald', 'starbucks', 'subway', 'taco bell', 'burger king', 'wendy', 'kfc', 'domino', 'pizza hut', 'dunkin', 'chipotle', 'walmart', 'target', 'costco', 'sams club', 'home depot', 'lowes', 'best buy', 'walgreens', 'cvs', 'kroger', 'safeway', 'publix', 'albertsons', 'whole foods']
    
    for place in all_places:
        name = place.get('displayName', {}).get('text', '')
        lat = place.get('location', {}).get('latitude')
        lng = place.get('location', {}).get('longitude')
        types = place.get('types', [])
        rating = place.get('rating', 3.0)
        user_ratings = place.get('userRatingCount', 0)
        phone = place.get('nationalPhoneNumber')
        website = place.get('websiteUri')
        hours = place.get('regularOpeningHours', {}).get('weekdayDescriptions', [])
        
        # Calculate a base score using Google rating
        # Rating is 1.0 to 5.0. We map it to a score multiplier.
        score = rating * 1.5 
        
        # Prefer local places by penalizing chains and boosting independents
        name_lower = name.lower()
        is_chain = any(chain in name_lower for chain in chains)
        if is_chain:
            score -= 5.0 # Heavy penalty for chains
        else:
            score += 3.0 # Big boost for local/independent businesses
            
        # Additional boost for places with a reasonable amount of reviews (established but local)
        if 50 < user_ratings < 1000 and not is_chain:
            score += 1.0
            
        # Get first photo if available
        photos = place.get('photos', [])
        image_url = None
        if photos:
            photo_reference = photos[0].get('name')
            if photo_reference:
                image_url = f"https://places.googleapis.com/v1/{photo_reference}/media?key={google_maps_api_key}&maxHeightPx=400&maxWidthPx=400"
                
        dist = haversine_distance(lat, lng, center_lat, center_lon) if lat and lng else 0
        recommendations.append({
            'name': name,
            'address': place.get('formattedAddress', ''),
            'latitude': lat,
            'longitude': lng,
            'distance_meters': dist,
            'category': types,
            'score': max(0.1, score), # Ensure score is positive
            'classifications': types,
            'imageUrl': image_url,
            'rating': rating,
            'userRatingCount': user_ratings,
            'phone': phone,
            'website': website,
            'businessHours': hours
        })
        
    return recommendations

def get_location_vector(tomtom_poi):
    # Initialize zero vector with all preference categories
    vector = {
        "food": 0.0, "activities": 0.0,
        "outdoors": 0.0, "shopping": 0.0,
        "arts_and_culture": 0.0, "museums": 0.0,
        "nightlife": 0.0, "family_friendly": 0.0,
        "proffesional_services": 0.0, "transportation_utilities": 0.0,
        "lodging_residential": 0.0, "education": 0.0,
        "business_industrial": 0.0, "religion_community": 0.0
    }

    classifications = tomtom_poi.get("classifications", [])

    # Process each classification and map to our categories
    for item in classifications:
        raw_names = []
        if isinstance(item, str):
            # Google Maps returns a flat list of strings for types
            raw_names.append(item.strip().replace('_', ' ').upper())
        elif isinstance(item, dict):
            # TomTom returns a nested structure
            names = item.get('names', [])
            for name_obj in names:
                if isinstance(name_obj, dict):
                    raw_names.append(name_obj.get('name', '').strip().upper())

        for raw_name in raw_names:
            if raw_name in CATEGORY_MAPPING:
                mapped_val = CATEGORY_MAPPING[raw_name]

                # Handle single category or list of categories
                if isinstance(mapped_val, list):
                    for cat in mapped_val:
                        if cat in vector:
                            vector[cat] = 1.0
                else:
                    if mapped_val in vector:
                        vector[mapped_val] = 1.0
            else:
                pass

    return vector


def calculate_relevance(user_prefs, location_vector):
    # Get all keys from both vectors
    all_keys = set(user_prefs.keys()).union(set(location_vector.keys()))

    # Calculate dot product and magnitudes
    dot_product = 0
    magnitude_user = 0
    magnitude_loc = 0

    for key in all_keys:
        user = user_prefs.get(key, 0.0)
        location = location_vector.get(key, 0.0)

        # Ignore non-numeric preferences (like 'theme_mode')
        if not isinstance(user, (int, float)) or not isinstance(location, (int, float)):
            continue

        dot_product += user * location
        magnitude_user += user ** 2
        magnitude_loc += location ** 2

    # Calculate vector magnitudes
    magnitude_user = math.sqrt(magnitude_user)
    magnitude_loc = math.sqrt(magnitude_loc)

    # Prevent division by zero
    if not magnitude_user or not magnitude_loc:
        return 0.0

    return dot_product / (magnitude_user * magnitude_loc)


def rank_locations(user_profile, locations):
    ranked_list = []

    # Weights for combining factors
    relevance_weight = 0.9     # User preference match is most important
    popularity_weight = 0.1   # General popularity as tiebreaker
    decay_constant = 1.5      # Distance decay rate (miles)

    user_vector = user_profile.preferences or {}

    for place in locations:
        # Calculate relevance from cosine similarity
        location_vector = get_location_vector(place)
        relevance = calculate_relevance(user_vector, location_vector)
        
        # Normalize popularity score (TomTom scores are out of 100)
        popularity = place.get('score', 1.0) / 100.0
        
        # Apply exponential distance decay
        # closer locations get higher factor (approaching 1.0)
        # decay_constant controls how quickly score drops with distance
        distance_mi = place.get('distance_meters', 0) / 1609.34
        distance_factor = math.exp(-distance_mi / (decay_constant))
        
        # Combine factors into final score
        final_score = ((relevance * relevance_weight) + (popularity * popularity_weight)) * distance_factor

        ranked_list.append({
            'name': place.get('name'),
            'address': place.get('address'),
            'latitude': place.get('latitude'),
            'longitude': place.get('longitude'),
            'distance_meters': place.get('distance_meters'),
            'category': place.get('category'),
            'score': final_score,
            'classifications': place.get('classifications'),
            'imageUrl': place.get('imageUrl')
        })

    # Sort by score descending (best matches first)
    return sorted(ranked_list, key=lambda x: x['score'], reverse=True)

@recc_bp.route('/update_preferences', methods=['POST'])
@login_required
def update_preferences():
    data = request.get_json()
    action = data.get('action')
    poi = data.get('poi')

    # Get category vector for the POI
    location_vector = get_location_vector(poi)
    
    # Base learning rate for preference updates
    learning_rate = 0.02

    # Action multipliers determine the strength and direction of preference updates
    # Positive values increase preference weights, negative values decrease them
    multipliers = {
        'directions': 4.0,   # Strongest positive signal - user wants to go there
        'like': 2.0,         # Explicit positive feedback
        'click': 1.0,        # Interest signal
        'hover': 0.5,        # Mild interest (3-5 seconds viewing)
        'pause': 0.2,        # Very mild interest (1-3 seconds)
        'ignore': 0.0,       # No signal (less than 1 second)
        'dislike': -1.5,     # Explicit negative feedback
        'remove': -5.0,      # Strongest negative signal
    }

    modifier = multipliers.get(action, 0.0)
    if action not in multipliers:
        return jsonify({'message': 'Invalid action'}), 400

    # Initialize default preferences if needed
    default_prefs = {
        "food": 0.0, "activities": 0.0, "outdoors": 0.0, 
        "shopping": 0.0, "arts_and_culture": 0.0, 
        "museums": 0.0, "nightlife": 0.0, "family_friendly": 0.0
    }
    current_preferences = dict(current_user.preferences or default_prefs)

    # Update preferences for each category the POI belongs to
    for category, is_present in location_vector.items():
        if is_present > 0:
            # Calculate weighted adjustment
            adjustment = is_present * learning_rate * modifier

            # Apply adjustment with clamping to [0.0, 1.0] range
            new_value = current_preferences.get(category, 0.0) + adjustment
            current_preferences[category] = max(0.0, min(new_value, 1.0))

    # Save updated preferences
    current_user.preferences = current_preferences
    db.session.commit()
    return jsonify({'message': 'Preferences updated successfully'}), 200

@recc_bp.route('/nearby', methods=['POST'])
def get_nearby_recommendations():
    data = request.get_json() or {}
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    radius = data.get('radius_mi', 5)
    limit = data.get('limit', 100)

    reccs = fetch_google_data(latitude, longitude, radius, limit)

    return jsonify({
        'recommendations': reccs or [],
        'length': len(reccs or []),
        'message': 'No nearby results available right now.' if not reccs else 'ok'
    }), 200


@recc_bp.route('/ranked', methods=['POST'])
@login_required
def get_ranked_recommendations():
    data = request.get_json() or {}
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    radius = data.get('radius_mi', 5)
    limit = data.get('limit', 100)
    ignore_names = data.get('ignore_names', [])

    # Fetch nearby POIs from Google
    reccs = fetch_google_data(latitude, longitude, radius, limit)

    if ignore_names:
        reccs = [r for r in reccs if r.get('name') not in ignore_names]

    # Rank based on current user's preferences
    ranked_locations = rank_locations(current_user, reccs or [])

    # Fetch local certified businesses from DB
    from app.models import Business
    # Find certified businesses within a bounding box approximately equal to radius
    # 1 degree of latitude is ~69 miles
    lat_diff = radius / 69.0
    lon_diff = radius / (69.0 * math.cos(math.radians(latitude))) if latitude else lat_diff
    
    local_businesses = Business.query.filter_by(is_certified_local=True).all()
    certified_list = []
    
    for b in local_businesses:
        # Check if it has coordinates and is roughly within range
        if b.latitude and b.longitude:
            if abs(b.latitude - latitude) <= lat_diff and abs(b.longitude - longitude) <= lon_diff:
                certified_list.append({
                    'name': b.business_name,
                    'address': b.address,
                    'latitude': b.latitude,
                    'longitude': b.longitude,
                    'distance_meters': 0, # Approximation or calculate exact
                    'category': [b.category] if b.category else [],
                    'score': 100.0, # High score to ensure they appear
                    'classifications': [],
                    'is_certified_local': True,
                    'bid': b.bid
                })

    # Combine lists, putting certified businesses at the top
    combined_locations = certified_list + ranked_locations

    return jsonify({'ranked_locations': combined_locations}), 200

@recc_bp.route('/test/nearby', methods=['GET'])
def test_recommendation():
    # Use Santa Cruz, CA coordinates for testing
    reccs = fetch_google_data(36.98844, -121.97483, 5, 100)

    if reccs is None:
        return jsonify({'message': 'Test failed: API error'}), 500

    return jsonify({'recommendations': reccs, 'length': len(reccs)}), 200


@recc_bp.route('/test/location_vector', methods=['GET'])
def test_location_vector():
    data = fetch_google_data(36.98844, -121.97483, 5, 100)
    
    # Handle both dict response (old format) and list response (current)
    reccs = data.get('results', []) if isinstance(data, dict) else data

    if not reccs:
        return jsonify({'message': 'No results found', 'raw_data': data}), 200

    # Generate vectors for each POI
    vectors = []
    for rec in reccs:
        vector = get_location_vector(rec)
        poi_name = rec.get("name", "Unknown POI")
        vectors.append({'name': poi_name, 'vector': vector})

    return jsonify({'location_vectors': vectors}), 200


@recc_bp.route('/test/relevance', methods=['GET'])
def test_relevance():
    # Mock user preferences for testing
    user_prefs = {
        "food": 1.0, "activities": 0.8,
        "outdoors": 0.5, "shopping": 0.2,
        "arts_and_culture": 0.7, "museums": 0.6,
        "nightlife": 0.4, "family_friendly": 0.9,
        "proffesional_services": 0.1, "transportation_utilities": 0.0,
        "lodging_residential": 0.3, "education": 0.2,
        "business_industrial": 0.0, "religion_community": 0.5
    }

    data = fetch_google_data(36.98844, -121.97483, 5, 100)

    reccs = data.get('results', []) if isinstance(data, dict) else data

    if not reccs:
        return jsonify({'message': 'No results found', 'raw_data': data}), 200

    # Calculate relevance for each POI
    relevances = []
    for rec in reccs:
        location_vector = get_location_vector(rec)
        relevance_score = calculate_relevance(user_prefs, location_vector)
        poi_name = rec.get("name", "Unknown POI")
        relevances.append({'name': poi_name, 'relevance_score': relevance_score})

    return jsonify({'relevance_scores': relevances}), 200


@recc_bp.route('/test/rank_locations', methods=['GET'])
def test_rank_locations():
    # Mock user preferences for testing
    user_prefs = {
        "food": 1.0, "activities": 0.8,
        "outdoors": 0.5, "shopping": 0.2,
        "arts_and_culture": 0.7, "museums": 0.6,
        "nightlife": 0.4, "family_friendly": 0.9,
        "proffesional_services": 0.1, "transportation_utilities": 0.0,
        "lodging_residential": 0.3, "education": 0.2,
        "business_industrial": 0.0, "religion_community": 0.5
    }

    data = fetch_google_data(36.98844, -121.97483, 5, 100)

    reccs = data.get('results', []) if isinstance(data, dict) else data

    if not reccs:
        return jsonify({'message': 'No results found', 'raw_data': data}), 200

    # Note: rank_locations expects a User object with .preferences attribute
    # This test passes a dict which may not work correctly
    ranked_locations = rank_locations(user_prefs, reccs)

    return jsonify({'ranked_locations': ranked_locations}), 200
