from app.extensions import db
from flask_login import UserMixin
from datetime import datetime


class User(db.Model, UserMixin):
    # Primary key identifier
    uid = db.Column(db.Integer, primary_key=True)
    
    # Authentication fields
    username = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=False)
    
    # Profile fields
    profile_picture = db.Column(db.String(256), nullable=True)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship: User's submitted reviews
    reviews = db.relationship('Review', back_populates='user', lazy=True)
    
    # Relationship: User's favorited locations (many-to-many via FavoriteLocation)
    favorite_locations = db.relationship('Location', secondary=FavoriteLocation.__table__, back_populates='favorited_by', lazy=True)

    # Relationship: Locations the user has visited (many-to-many via VisitedLocation)
    visited_locations = db.relationship('Location', secondary=lambda: VisitedLocation.__table__, back_populates='visited_by', lazy=True)

    # User preference weights for recommendation algorithm
    # Each category is a float from 0.0 (no interest) to 1.0 (high interest)
    # These weights are used to calculate relevance scores for location recommendations
    preferences = db.Column(db.JSON, default=lambda: {
        "food": 0.0, "activities": 0.0,
        "outdoors": 0.0, "shopping": 0.0,
        "arts_and_culture": 0.0, "museums": 0.0,
        "nightlife": 0.0, "family_friendly": 0.0,
        "proffesional_services": 0.0, "transportation_utilities": 0.0,
        "lodging_residential": 0.0, "education": 0.0,
        "business_industrial": 0.0, "religion_community": 0.0
    })

    def update_preferences(self, category, weight=0.1):
        current_preferences = self.preferences
        current_val = current_preferences.get(category, 0.0)
        # Cap the preference value at 1.0 maximum
        current_preferences[category] = min(current_val + weight, 1.0)
        self.preferences = current_preferences
        self.last_updated = datetime.utcnow()
        db.session.commit()

    def get_id(self):
        return str(self.uid)

    def __repr__(self):
        return f'<User {self.username}>'


class Review(db.Model):
    # Primary key identifier
    rid = db.Column(db.Integer, primary_key=True)
    
    # Review content
    star_rating = db.Column(db.Integer, nullable=False)  # 1-5 stars
    content = db.Column(db.Text, nullable=True)  # Optional text review

    # Foreign key to the user who wrote this review
    user_id = db.Column(db.Integer, db.ForeignKey('user.uid'), nullable=False)
    user = db.relationship('User', back_populates='reviews', lazy=True)

    # Foreign key to the location being reviewed
    location_id = db.Column(db.Integer, db.ForeignKey('location.lid'), nullable=False)
    location = db.relationship('Location', back_populates='reviews', lazy=True)

    def __repr__(self):
        """Return a string representation of the Review instance."""
        return f'<Review {self.id} by User {self.user_id}>'


class Location(db.Model):
    # Primary key identifier
    lid = db.Column(db.Integer, primary_key=True)
    
    # Location details
    name = db.Column(db.String(150), nullable=False)
    address = db.Column(db.String(255), nullable=True)
    
    # Geographic coordinates for map positioning
    longitude = db.Column(db.Float, nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    
    # Location classification
    type = db.Column(db.Integer, nullable=False)  # Type identifier
    categories = db.Column(db.JSON, nullable=True)  # Category tags from API

    # Relationship: Reviews for this location
    reviews = db.relationship('Review', back_populates='location', lazy=True)
    
    # Relationship: Users who favorited this location
    favorited_by = db.relationship('User', secondary=FavoriteLocation.__table__, back_populates='favorite_locations', lazy=True)

    # Relationship: Users who have visited this location
    visited_by = db.relationship('User', secondary=lambda: VisitedLocation.__table__, back_populates='visited_locations', lazy=True)

    def __repr__(self):
        return f'<Location {self.name}>'


class FavoriteLocation(db.Model):
    __tablename__ = 'favorite_location'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.uid'), nullable=False)
    location_id = db.Column(db.Integer, db.ForeignKey('location.lid'), nullable=False)


class VisitedLocation(db.Model):
    __tablename__ = 'visited_location'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.uid'), nullable=False)
    location_id = db.Column(db.Integer, db.ForeignKey('location.lid'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f'<VisitedLocation user={self.user_id} loc={self.location_id} at={self.timestamp}>'

