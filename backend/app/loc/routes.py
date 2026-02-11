from flask import request, jsonify, render_template, url_for, redirect
from . import loc_bp 
from app.models import User, Location
from app import db

@loc_bp.route('/<int:location_id>', methods=['GET'])
def get_location_details(location_id):
    location = Location.query.get(location_id)
    if not location:
        return jsonify({'message': 'Location not found'}), 404

    location_data = {
        'lid': location.lid,
        'name': location.name,
        'longitude': location.longitude,
        'latitude': location.latitude,
        'type': location.type,
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
            'longitude': location.longitude,
            'latitude': location.latitude,
            'type': location.type,
        })

    return jsonify(locations_data), 200

@loc_bp.route('/add', methods=['POST'])
def add_location():
    data = request.get_json()
    name = data.get('name')
    longitude = data.get('longitude')
    latitude = data.get('latitude')
    typeId = data.get('type')

    new_location = Location(name=name, longitude=longitude, latitude=latitude, type=typeId)
    db.session.add(new_location)
    db.session.commit()

    return jsonify({'message': 'Location added successfully', 'location_id': new_location.lid}), 201
