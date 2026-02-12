from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_mail import Mail
from app.extensions import db, bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

def create_app():
    app = Flask(__name__)
    CORS(app, supports_credentials=True)
    
    basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    instance_path = os.path.join(basedir, 'instance')
    if not os.path.exists(instance_path):
        os.makedirs(instance_path)

    app.config['SECRET_KEY'] = os.getenv('BACKEND_SECRET_KEY', 'default_secret_key')
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(instance_path, 'db.sqlite3')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = False
    app.config['MAIL_SERVER'] = 'smtp.gmail.com'
    app.config['MAIL_PORT'] = 587
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USERNAME'] = 'bizmatchofficial@gmail.com'
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = 'bizmatchofficial@gmail.com'

    mail = Mail(app)

    db.init_app(app)
    bcrypt.init_app(app)
    mail.init_app(app)

    from app.models import User

    login_manager = LoginManager()
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(uid):
        return User.query.get(uid)

    from app.auth import auth_bp
    from app.rate import rate_bp 
    from app.loc import loc_bp 
    from app.recc import recc_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(rate_bp, url_prefix='/rate')
    app.register_blueprint(loc_bp, url_prefix='/loc')
    app.register_blueprint(recc_bp, url_prefix='/recc')

    Migrate(app, db)

    with app.app_context():
        db.create_all()

    @app.route('/')
    def index():
        return "Hello, World!"

    return app
