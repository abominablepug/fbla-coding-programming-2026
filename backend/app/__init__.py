from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_mail import Mail
from app.extensions import db, bcrypt
import os
from dotenv import load_dotenv

# Load environment variables from .env file (either in backend or root)
basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
env_path = os.path.join(os.path.dirname(basedir), '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # Enable CORS for frontend requests with credential support (cookies/sessions)
    CORS(app, supports_credentials=True)
    
    # Set up the instance folder path for SQLite database
    basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    instance_path = os.path.join(basedir, 'instance')
    if not os.path.exists(instance_path):
        os.makedirs(instance_path)

    # Security: Secret key for session signing and CSRF protection
    app.config['SECRET_KEY'] = os.getenv('BACKEND_SECRET_KEY', 'default_secret_key')
    
    # Database: SQLite file location in instance folder
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(instance_path, 'db.sqlite3')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # Disable event tracking for performance
    
    # Session/Cookie Configuration
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # CSRF protection while allowing normal navigation
    app.config['SESSION_COOKIE_SECURE'] = False    # Set to True in production with HTTPS
    
    # Email Configuration for Flask-Mail (used for verification/password reset)
    app.config['MAIL_SERVER'] = 'smtp.gmail.com'
    app.config['MAIL_PORT'] = 587
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USERNAME'] = 'bizmatchofficial@gmail.com'
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')  # App password from env
    app.config['MAIL_DEFAULT_SENDER'] = 'bizmatchofficial@gmail.com'
    
    # Initialize Flask-Mail for email sending
    mail = Mail(app)

    # Initialize SQLAlchemy database ORM
    db.init_app(app)
    
    # Initialize Bcrypt for password hashing
    bcrypt.init_app(app)
    
    # Initialize mail (redundant but ensures proper setup)
    mail.init_app(app)

    # Import User model for Flask-Login user loader
    from app.models import User
    
    login_manager = LoginManager()
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(uid):
        return User.query.get(uid)

    # Import and register blueprints for modular route organization
    from app.auth import auth_bp  # Authentication routes
    from app.rate import rate_bp  # Rating/review routes
    from app.loc import loc_bp    # Location management routes
    from app.recc import recc_bp  # Recommendation routes
    from app.jobs import jobs_bp  # Job portal routes
    from app.ads import ads_bp    # Advertisements routes
    from app.coupons import coupons_bp # Coupons routes
    from app.admin import admin_bp
    from app.events import events_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(rate_bp, url_prefix='/rate')
    app.register_blueprint(loc_bp, url_prefix='/loc')
    app.register_blueprint(recc_bp, url_prefix='/recc')
    app.register_blueprint(jobs_bp, url_prefix='/jobs')
    app.register_blueprint(ads_bp, url_prefix='/ads')
    app.register_blueprint(coupons_bp, url_prefix='/coupons')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(events_bp, url_prefix='/events')

    # Initialize Flask-Migrate for database migrations
    Migrate(app, db)

    # Removed db.create_all() as we are now relying entirely on Flask-Migrate

    @app.route('/')
    def index():
        """Health check endpoint for the API root."""
        return "Hello, World!"

    return app
