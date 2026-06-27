from flask import request, jsonify, render_template, url_for, redirect
from flask_login import login_required, current_user
from . import loc_bp 
from app.models import User, Location
from app.models import VisitedLocation
from app import db

@loc_bp.route('/<int:location_id>', methods=['GET'])
def get_location_details(location_id):
    location = Location.query.get(location_id)
    if not location:
        return jsonify({'message': 'Location not found'}), 404

    location_data = {
        'lid': location.lid,
        'name': location.name,
        'address': location.address,
        'longitude': location.longitude,
        'latitude': location.latitude,
        'type': location.type,
        'categories': location.categories,
        'phone': location.phone,
        'email': location.email,
        'website': location.website,
        'businessHours': location.businessHours,
    }

    return jsonify(location_data), 200


@loc_bp.route('/all', methods=['GET'])
def get_all_locations():
    locations = Location.query.all()
    locations_data = []
    for location in locations:
        locations_data.append({
            'lid': location.lid,
            'name': location.name,
            'address': location.address,
            'longitude': location.longitude,
            'latitude': location.latitude,
            'type': location.type,
            'categories': location.categories,
            'phone': location.phone,
            'email': location.email,
            'website': location.website,
            'businessHours': location.businessHours,
        })

    return jsonify(locations_data), 200

@loc_bp.route('/add', methods=['POST'])
def add_location():
    data = request.get_json()
    name = data.get('name')
    address = data.get('address')
    longitude = data.get('longitude')
    latitude = data.get('latitude')
    typeId = data.get('type')
    categories = data.get('categories')
    phone = data.get('phone')
    email = data.get('email')
    website = data.get('website')
    businessHours = data.get('businessHours')

    new_location = Location(name=name, address=address, longitude=longitude, latitude=latitude, type=typeId, categories=categories, phone=phone, email=email, website=website, businessHours=businessHours)
    db.session.add(new_location)
    db.session.commit()

    return jsonify({'message': 'Location added successfully', 'location_id': new_location.lid}), 201


@loc_bp.route('/favorites', methods=['GET'])
@login_required
def get_favorite_locations():
    user = current_user
    favorites = user.favorite_locations
    
    favorites_data = []
    for location in favorites:
        favorites_data.append({
            'lid': location.lid,
            'name': location.name,
            'address': location.address,
            'longitude': location.longitude,
            'latitude': location.latitude,
            'type': location.type,
            'categories': location.categories,
            'phone': location.phone,
            'email': location.email,
            'website': location.website,
            'businessHours': location.businessHours,
        })
    
    return jsonify(favorites_data), 200


@loc_bp.route('/<int:location_id>/favorite', methods=['POST'])
@login_required
def add_favorite(location_id):
    location = Location.query.get(location_id)
    if not location:
        return jsonify({'message': 'Location not found'}), 404
    
    # Check if already favorited to prevent duplicates
    if location not in current_user.favorite_locations:
        current_user.favorite_locations.append(location)
        db.session.commit()
        return jsonify({'message': 'Location added to favorites'}), 200
    else:
        return jsonify({'message': 'Location already in favorites'}), 400


@loc_bp.route('/<int:location_id>/unfavorite', methods=['POST'])
@login_required
def remove_favorite(location_id):
    location = Location.query.get(location_id)
    if not location:
        return jsonify({'message': 'Location not found'}), 404
    
    # Check if location is actually in favorites before removing
    if location in current_user.favorite_locations:
        current_user.favorite_locations.remove(location)
        db.session.commit()
        return jsonify({'message': 'Location removed from favorites'}), 200
    else:
        return jsonify({'message': 'Location not in favorites'}), 400

@loc_bp.route('/<int:location_id>/visit', methods=['POST'])
@login_required
def add_visit(location_id):
    location = Location.query.get(location_id)
    if not location:
        return jsonify({'message': 'Location not found'}), 404

    # Create visit record with current timestamp
    visit = VisitedLocation(user_id=current_user.uid, location_id=location.lid)
    db.session.add(visit)
    db.session.commit()
    return jsonify({'message': 'Location recorded as visited'}), 200


@loc_bp.route('/visit', methods=['POST'])
@login_required
def add_visit_by_data():
    data = request.get_json() or {}
    name = data.get('name')
    address = data.get('address')
    longitude = data.get('longitude')
    latitude = data.get('latitude')
    typeId = data.get('type', 1)
    categories = data.get('categories')

    # Try to find existing location with matching details
    location = None
    if name and address and longitude is not None and latitude is not None:
        location = Location.query.filter_by(
            name=name,
            address=address,
            longitude=longitude,
            latitude=latitude
        ).first()

    # Create new location if not found
    if location is None:
        location = Location(name=name or 'Unnamed', address=address, longitude=longitude or 0.0,
                            latitude=latitude or 0.0, type=typeId, categories=categories)
        db.session.add(location)
        db.session.commit()

    # Record the visit
    visit = VisitedLocation(user_id=current_user.uid, location_id=location.lid)
    db.session.add(visit)
    db.session.commit()

    return jsonify({'message': 'Location recorded as visited', 'location_id': location.lid}), 200


@loc_bp.route('/visited', methods=['GET'])
@login_required
def get_visited_locations():
    user = current_user
    # Get visits ordered by most recent first
    visits = VisitedLocation.query.filter_by(user_id=user.uid).order_by(VisitedLocation.timestamp.desc()).all()
    visited_data = []
    for v in visits:
        loc = Location.query.get(v.location_id)
        if loc:
            visited_data.append({
                'lid': loc.lid,
                'name': loc.name,
                'address': loc.address,
                'longitude': loc.longitude,
                'latitude': loc.latitude,
                'type': loc.type,
                'categories': loc.categories,
                'phone': loc.phone,
                'email': loc.email,
                'website': loc.website,
                'businessHours': loc.businessHours,
                'visited_at': v.timestamp.isoformat()  # ISO 8601 format for frontend parsing
            })
    return jsonify(visited_data), 200

@loc_bp.route('/<int:location_id>/google_reviews', methods=['GET'])
def get_google_reviews(location_id):
    import requests
    import os
    location = Location.query.get(location_id)
    if not location:
        return jsonify({'message': 'Location not found'}), 404
        
    google_maps_api_key = os.getenv('GOOGLE_MAPS_API_KEY')
    if not google_maps_api_key:
        return jsonify({'reviews': []}), 200
        
    query = location.name
    if location.address:
        query += f" {location.address}"
        
    headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': google_maps_api_key,
        'X-Goog-FieldMask': 'places.reviews'
    }
    
    payload = {
        "textQuery": query,
        "languageCode": "en",
        "maxResultCount": 1
    }
    
    try:
        response = requests.post("https://places.googleapis.com/v1/places:searchText", headers=headers, json=payload, timeout=8)
        if response.status_code == 200:
            data = response.json()
            places = data.get('places', [])
            if places and len(places) > 0:
                reviews = places[0].get('reviews', [])
                formatted_reviews = []
                # Just get a couple recent ones
                for r in reviews[:2]:
                    formatted_reviews.append({
                        'name': r.get('authorAttribution', {}).get('displayName', 'Anonymous'),
                        'star_rating': r.get('rating', 5),
                        'content': r.get('originalText', {}).get('text', '') or r.get('text', {}).get('text', ''),
                        'relative_time': r.get('relativePublishTimeDescription', 'Recently')
                    })
                return jsonify({'reviews': formatted_reviews}), 200
    except requests.RequestException:
        pass
        
    return jsonify({'reviews': []}), 200
