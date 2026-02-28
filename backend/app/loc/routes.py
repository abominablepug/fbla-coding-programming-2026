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

    new_location = Location(name=name, address=address, longitude=longitude, latitude=latitude, type=typeId, categories=categories)
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
        })
    
    return jsonify(favorites_data), 200

@loc_bp.route('/<int:location_id>/favorite', methods=['POST'])
@login_required
def add_favorite(location_id):
    location = Location.query.get(location_id)
    if not location:
        return jsonify({'message': 'Location not found'}), 404
    
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

    location = None
    if name and address and longitude is not None and latitude is not None:
        location = Location.query.filter_by(
            name=name,
            address=address,
            longitude=longitude,
            latitude=latitude
        ).first()

    if location is None:
        location = Location(name=name or 'Unnamed', address=address, longitude=longitude or 0.0,
                            latitude=latitude or 0.0, type=typeId, categories=categories)
        db.session.add(location)
        db.session.commit()

    visit = VisitedLocation(user_id=current_user.uid, location_id=location.lid)
    db.session.add(visit)
    db.session.commit()

    return jsonify({'message': 'Location recorded as visited', 'location_id': location.lid}), 200


@loc_bp.route('/visited', methods=['GET'])
@login_required
def get_visited_locations():
    user = current_user
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
                'visited_at': v.timestamp.isoformat()
            })
    return jsonify(visited_data), 200
