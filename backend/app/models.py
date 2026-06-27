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

    # User type: 'customer' or 'business'
    user_type = db.Column(db.String(20), default='customer', nullable=False)

    # Profile fields
    profile_picture = db.Column(db.String(256), nullable=True)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship: User's submitted reviews
    reviews = db.relationship('Review', back_populates='user', lazy=True)

    # Relationship: User's favorited locations (many-to-many via FavoriteLocation)
    favorite_locations = db.relationship('Location', secondary=lambda: FavoriteLocation.__table__, back_populates='favorited_by', lazy=True)

    # Relationship: Locations the user has visited (many-to-many via VisitedLocation)
    visited_locations = db.relationship('Location', secondary=lambda: VisitedLocation.__table__, back_populates='visited_by', lazy=True)

    # Relationship: Business profile (one-to-one, optional)
    business_profile = db.relationship('Business', back_populates='user', uselist=False, lazy=True)

    # Relationship: Job applications (one-to-many)
    job_applications = db.relationship('JobApplication', back_populates='user', lazy=True)

    # Relationship: User job profile (one-to-one, optional)
    user_job_profile = db.relationship('UserProfile', back_populates='user', uselist=False, lazy=True)

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
    phone = db.Column(db.String(50), nullable=True)
    email = db.Column(db.String(150), nullable=True)
    website = db.Column(db.String(255), nullable=True)
    businessHours = db.Column(db.JSON, nullable=True)

    # Relationship: Reviews for this location
    reviews = db.relationship('Review', back_populates='location', lazy=True)
    
    # Relationship: Users who favorited this location
    favorited_by = db.relationship('User', secondary=lambda: FavoriteLocation.__table__, back_populates='favorite_locations', lazy=True)

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


class Business(db.Model):
    bid = db.Column(db.Integer, primary_key=True)

    # Foreign key to user (one-to-one relationship)
    user_id = db.Column(db.Integer, db.ForeignKey('user.uid'), nullable=False, unique=True)
    user = db.relationship('User', back_populates='business_profile', lazy=True)

    # Business information
    business_name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(100), nullable=True)
    address = db.Column(db.String(255), nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    email = db.Column(db.String(150), nullable=True)
    website = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    is_certified_local = db.Column(db.Boolean, default=False)

    # Relationship: Job postings from this business
    job_postings = db.relationship('JobPosting', back_populates='business', lazy=True, cascade='all, delete-orphan')

    # Relationship: Advertisements from this business
    advertisements = db.relationship('Advertisement', back_populates='business', lazy=True, cascade='all, delete-orphan')

    # Relationship: Coupons from this business
    coupons = db.relationship('Coupon', back_populates='business', lazy=True, cascade='all, delete-orphan')

    # Relationship: Events from this business
    events = db.relationship('Event', back_populates='business', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Business {self.business_name}>'


class JobPosting(db.Model):
    job_id = db.Column(db.Integer, primary_key=True)

    # Foreign key to business
    business_id = db.Column(db.Integer, db.ForeignKey('business.bid'), nullable=False)
    business = db.relationship('Business', back_populates='job_postings', lazy=True)

    # Job details
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    requirements = db.Column(db.JSON, nullable=True)  # Array of required skills
    salary_range = db.Column(db.String(100), nullable=True)
    job_type = db.Column(db.String(50), nullable=True)  # Full-time, Part-time, Contract, etc.
    location = db.Column(db.String(255), nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    latitude = db.Column(db.Float, nullable=True)

    # Status: active, closed, filled
    status = db.Column(db.String(20), default='active', nullable=False)

    posted_date = db.Column(db.DateTime, default=datetime.utcnow)
    updated_date = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship: Applications for this job
    applications = db.relationship('JobApplication', back_populates='job_posting', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<JobPosting {self.title}>'


class UserProfile(db.Model):
    profile_id = db.Column(db.Integer, primary_key=True)

    # Foreign key to user (one-to-one relationship)
    user_id = db.Column(db.Integer, db.ForeignKey('user.uid'), nullable=False, unique=True)
    user = db.relationship('User', back_populates='user_job_profile', lazy=True)

    # Job search profile
    skills = db.Column(db.JSON, nullable=True)  # Array of skills
    education = db.Column(db.JSON, nullable=True)  # Education details
    resume_url = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<UserProfile user={self.user_id}>'


class JobApplication(db.Model):
    app_id = db.Column(db.Integer, primary_key=True)

    # Foreign keys
    job_id = db.Column(db.Integer, db.ForeignKey('job_posting.job_id'), nullable=False)
    job_posting = db.relationship('JobPosting', back_populates='applications', lazy=True)

    user_id = db.Column(db.Integer, db.ForeignKey('user.uid'), nullable=False)
    user = db.relationship('User', back_populates='job_applications', lazy=True)

    # Application details
    status = db.Column(db.String(20), default='applied', nullable=False)  # applied, reviewed, shortlisted, rejected
    resume_url = db.Column(db.String(255), nullable=True)
    applied_date = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<JobApplication user={self.user_id} job={self.job_id}>'


class Advertisement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    
    # Foreign key to business
    business_id = db.Column(db.Integer, db.ForeignKey('business.bid'), nullable=False)
    business = db.relationship('Business', back_populates='advertisements', lazy=True)
    
    media_url = db.Column(db.String(255), nullable=False)
    media_type = db.Column(db.String(50), nullable=False)  # 'image' or 'video'
    target_url = db.Column(db.String(255), nullable=True)
    
    # Status: pending, approved, rejected
    status = db.Column(db.String(20), default='pending', nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Advertisement {self.id} for Business {self.business_id}>'


class Coupon(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    
    # Foreign key to business
    business_id = db.Column(db.Integer, db.ForeignKey('business.bid'), nullable=False)
    business = db.relationship('Business', back_populates='coupons', lazy=True)
    
    title = db.Column(db.String(200), nullable=False)
    discount_label = db.Column(db.String(50), nullable=False) # e.g., "20% OFF", "$10 OFF"
    code = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Coupon {self.code} for Business {self.business_id}>'


class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    
    business_id = db.Column(db.Integer, db.ForeignKey('business.bid'), nullable=False)
    business = db.relationship('Business', back_populates='events', lazy=True)
    
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    event_type = db.Column(db.String(50), nullable=False) # e.g. "flash_sale", "live_music", "trivia"
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    image_url = db.Column(db.String(255), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Event {self.title} for Business {self.business_id}>'


