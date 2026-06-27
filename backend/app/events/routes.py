from flask import request, jsonify
from flask_login import login_required, current_user
from app.events import events_bp
from app.models import Event, Business
from app.extensions import db
from datetime import datetime

@events_bp.route('/create', methods=['POST'])
@login_required
def create_event():
    if current_user.user_type != 'business':
        return jsonify({'error': 'Unauthorized'}), 403

    business = Business.query.filter_by(user_id=current_user.uid).first()
    if not business:
        return jsonify({'error': 'Business profile not found'}), 404

    data = request.get_json()
    try:
        start_time = datetime.fromisoformat(data['start_time'].replace('Z', '+00:00'))
        end_time = datetime.fromisoformat(data['end_time'].replace('Z', '+00:00'))
    except (KeyError, ValueError):
        return jsonify({'error': 'Invalid date format'}), 400

    new_event = Event(
        business_id=business.bid,
        title=data.get('title'),
        description=data.get('description'),
        start_time=start_time,
        end_time=end_time,
        image_url=data.get('image_url'),
        event_type=data.get('event_type', 'general')
    )
    db.session.add(new_event)
    db.session.commit()
    
    return jsonify({'message': 'Event created successfully', 'event_id': new_event.id}), 201

@events_bp.route('/business', methods=['GET'])
@login_required
def get_business_events():
    if current_user.user_type != 'business':
        return jsonify({'error': 'Unauthorized'}), 403

    business = Business.query.filter_by(user_id=current_user.uid).first()
    if not business:
        return jsonify({'error': 'Business profile not found'}), 404

    events = Event.query.filter_by(business_id=business.bid).all()
    events_data = [{
        'id': e.id,
        'title': e.title,
        'description': e.description,
        'start_time': e.start_time.isoformat(),
        'end_time': e.end_time.isoformat(),
        'image_url': e.image_url
    } for e in events]
    
    return jsonify({'events': events_data}), 200

@events_bp.route('/<int:event_id>', methods=['PUT'])
@login_required
def update_event(event_id):
    if current_user.user_type != 'business':
        return jsonify({'error': 'Unauthorized'}), 403

    business = Business.query.filter_by(user_id=current_user.uid).first()
    event = Event.query.get_or_404(event_id)
    
    if event.business_id != business.bid:
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    if 'title' in data:
        event.title = data['title']
    if 'description' in data:
        event.description = data['description']
    if 'event_type' in data:
        event.event_type = data['event_type']
    if 'start_time' in data:
        try:
            event.start_time = datetime.fromisoformat(data['start_time'].replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Invalid start date format'}), 400
    if 'end_time' in data:
        try:
            event.end_time = datetime.fromisoformat(data['end_time'].replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Invalid end date format'}), 400
    if 'image_url' in data:
        event.image_url = data['image_url']
        
    db.session.commit()
    return jsonify({'message': 'Event updated successfully'}), 200

@events_bp.route('/<int:event_id>', methods=['DELETE'])
@login_required
def delete_event(event_id):
    if current_user.user_type != 'business':
        return jsonify({'error': 'Unauthorized'}), 403

    business = Business.query.filter_by(user_id=current_user.uid).first()
    event = Event.query.get_or_404(event_id)
    
    if event.business_id != business.bid:
        return jsonify({'error': 'Unauthorized'}), 403

    db.session.delete(event)
    db.session.commit()
    return jsonify({'message': 'Event deleted successfully'}), 200

@events_bp.route('/public', methods=['GET'])
def get_public_events():
    now = datetime.utcnow()
    # Fetch events where end_time is in the future
    events = Event.query.filter(Event.end_time >= now).order_by(Event.start_time.asc()).all()
    
    events_data = [{
        'id': e.id,
        'business_name': e.business.business_name,
        'title': e.title,
        'description': e.description,
        'start_time': e.start_time.isoformat(),
        'end_time': e.end_time.isoformat(),
        'image_url': e.image_url
    } for e in events]
    
    return jsonify({'events': events_data}), 200
