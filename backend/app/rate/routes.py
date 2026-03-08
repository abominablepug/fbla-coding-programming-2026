from flask import request, jsonify, render_template, url_for, redirect
from . import rate_bp
from app.models import User, Review, Location
from app import db

@rate_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_ratings(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    # Gather all reviews with location details
    reviews = user.reviews
    ratings = []
    for review in reviews:
        ratings.append({
            'location_id': review.location_id,
            'location_name': review.location.name,
            'star_rating': review.star_rating,
            'content': review.content
        })
    return jsonify({'user': user.username, 'ratings': ratings}), 200

@rate_bp.route('/loc/<int:location_id>', methods=['GET'])
def get_location_ratings(location_id):
    location = Location.query.get(location_id)
    if not location:
        return jsonify({'message': 'Location not found'}), 404

    reviews = location.reviews
    if not reviews:
        # No reviews yet - return null average
        return jsonify({'location': location.name, 'average_rating': None}), 200

    # Calculate mean star rating
    average_rating = sum(review.star_rating for review in reviews) / len(reviews)
    return jsonify({'location': location.name, 'average_rating': average_rating}), 200


@rate_bp.route('/loc/<int:location_id>/reviews', methods=['GET'])
def get_location_reviews(location_id):
    location = Location.query.get(location_id)
    if not location:
        return jsonify({'message': 'Location not found'}), 404

    # Build list of review details with user info
    reviews = location.reviews
    reviews_data = []
    for review in reviews:
        reviews_data.append({
            'user_id': review.user_id,
            'username': review.user.username,
            'star_rating': review.star_rating,
            'content': review.content
        })
    return jsonify({'location': location.name, 'reviews': reviews_data}), 200

@rate_bp.route('/review', methods=['POST'])
def submit_review():
    data = request.get_json()
    user_id = data.get('user_id')
    location_id = data.get('location_id')
    star_rating = data.get('star_rating')
    content = data.get('content', '')  # Optional, defaults to empty string

    # Verify both user and location exist
    user = User.query.get(user_id)
    location = Location.query.get(location_id)

    if not user or not location:
        return jsonify({'message': 'User or Location not found'}), 404

    # Create and save the review
    new_review = Review(user_id=user_id, location_id=location_id, star_rating=star_rating, content=content)
    db.session.add(new_review)
    db.session.commit()

    return jsonify({'message': 'Review submitted successfully'}), 201
