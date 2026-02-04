from app.extensions import db
from flask_login import UserMixin
from datetime import datetime

class FavoriteLocation(db.Model):
    __tablename__ = 'favorite_location'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.uid'), nullable=False)
    location_id = db.Column(db.Integer, db.ForeignKey('location.lid'), nullable=False)

class User(db.Model, UserMixin):
    uid = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    profile_picture = db.Column(db.String(256), nullable=True)

    reviews = db.relationship('Review', back_populates='user', lazy=True)
    favorite_locations = db.relationship('Location', secondary=FavoriteLocation.__table__, back_populates='favorited_by', lazy=True)

    preferences = db.Column(db.JSON, default=lambda: {
        "food": 0.0, "activities": 0.0,
        "outdoors": 0.0, "shopping": 0.0,
        "arts_and_culture": 0.0, "museums": 0.0,
        "nightlife": 0.0, "family_friendly": 0.0,
        "proffesional_services": 0.0, "transportation_utilities": 0.0,
        "lodging_residential": 0.0, "education": 0.0,
        "business_industrial": 0.0, "religion_community": 0.0
    })

    last_updated = db.Column(db.DateTime, default=datetime.utcnow)

    def update_preferences(self, category, weight=0.1):
        current_preferences = self.preferences
        current_val = current_preferences.get(category, 0.0)
        current_preferences[category] = min(current_val + weight, 1.0)
        self.preferences = current_preferences
        self.last_updated = datetime.utcnow()
        db.session.commit()

    def get_id(self):
        return str(self.uid)

    def __repr__(self):
        return f'<User {self.username}>'

class Review(db.Model):
    rid = db.Column(db.Integer, primary_key=True)
    star_rating = db.Column(db.Integer, nullable=False)
    content = db.Column(db.Text, nullable=True)

    user_id = db.Column(db.Integer, db.ForeignKey('user.uid'), nullable=False)
    user = db.relationship('User', back_populates='reviews', lazy=True)

    location_id = db.Column(db.Integer, db.ForeignKey('location.lid'), nullable=False)
    location = db.relationship('Location', back_populates='reviews', lazy=True)

    def __repr__(self):
        return f'<Review {self.id} by User {self.user_id}>'

class Location(db.Model):
    lid = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    type = db.Column(db.Integer, nullable=False)

    reviews = db.relationship('Review', back_populates='location', lazy=True)
    favorited_by = db.relationship('User', secondary=FavoriteLocation.__table__, back_populates='favorite_locations', lazy=True)

    def __repr__(self):
        return f'<Location {self.name}>'

