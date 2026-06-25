from . import auth_bp
from flask import request, jsonify, render_template, url_for, redirect, current_app
from flask_login import login_user, logout_user, current_user, login_required
from flask_mail import Message
from app import db
from app.models import User, Location, VisitedLocation
from app.extensions import bcrypt
from itsdangerous import URLSafeTimedSerializer
import os
from urllib.parse import quote

PASSWORD_RESET_SALT = 'password-reset-salt'
PASSWORD_RESET_MAX_AGE_SECONDS = 3600


def _is_password_valid(password: str) -> bool:
    if not isinstance(password, str):
        return False
    if len(password) < 8:
        return False
    has_alpha = any(ch.isalpha() for ch in password)
    has_digit = any(ch.isdigit() for ch in password)
    return has_alpha and has_digit


def _build_password_reset_token(user: User) -> str:
    token_serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    payload = {
        'uid': user.uid,
        'email': user.email,
        'pwd_sig': (user.password_hash or '')[-24:],
    }
    return token_serializer.dumps(payload, salt=PASSWORD_RESET_SALT)


def _load_password_reset_token(token: str):
    token_serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    return token_serializer.loads(token, salt=PASSWORD_RESET_SALT, max_age=PASSWORD_RESET_MAX_AGE_SECONDS)


def _build_frontend_reset_url(user: User, token: str) -> str:
    configured_frontend = os.getenv('FRONTEND_BASE_URL', '').strip()
    origin_frontend = (request.headers.get('Origin') or '').strip()
    frontend_base = configured_frontend or origin_frontend or 'http://localhost:5174'
    frontend_base = frontend_base.rstrip('/')
    return f'{frontend_base}/reset-password?token={quote(token)}&username={quote(user.username)}'


def _send_password_reset_email(user: User, subject='Reset Your LuminX Password'):
    token = _build_password_reset_token(user)
    reset_url = _build_frontend_reset_url(user, token)

    msg = Message(subject, recipients=[user.email])
    msg.body = (
        'A password change was requested for your LuminX account.\n\n'
        f'Username: {user.username}\n'
        f'Password change link (valid for 60 minutes): {reset_url}\n\n'
        'If you did not request this, you can safely ignore this email.'
    )
    mail = current_app.extensions['mail']
    mail.send(msg)
    return reset_url


def _location_to_dict(location: Location, visited_at=None):
    return {
        'lid': location.lid,
        'name': location.name,
        'address': location.address,
        'longitude': location.longitude,
        'latitude': location.latitude,
        'type': location.type,
        'categories': location.categories,
        'visited_at': visited_at.isoformat() if visited_at else None,
    }


def _get_theme_mode(user: User) -> str:
    preferences = user.preferences or {}
    return preferences.get('theme_mode') if preferences.get('theme_mode') in ('dark', 'light') else 'dark'

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        image = request.form.get('image')
        email = request.form.get('email')

        if User.query.filter_by(username=username).first():
            return jsonify({'message': 'Username already exists'}), 400

        profile_picture = None
        if image:
            ext = os.path.splitext(image)[1]
            random_filename = f"{os.urandom(16).hex()}{ext}"
            
            profile_picture = random_filename
            
            image_path = os.path.join('static/profile_pictures', random_filename)
            with open(image_path, 'wb') as f:
                f.write(image.encode('latin1'))
        else:
            profile_picture = 'default_profile_picture.png'

        token_serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
        token = token_serializer.dumps(email, salt='email-confirmation-salt')

        msg = Message('Confirm Your Email', recipients=[email])
        confirm_url = url_for('auth.confirm_email', token=token, _external=True)
        msg.body = f'Please click the link to confirm your email: {confirm_url}'
        mail = current_app.extensions['mail']
        mail.send(msg)

        password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        new_user = User(username=username, password_hash=password_hash, profile_picture=profile_picture, email=email, is_verified=False)
        db.session.add(new_user)
        db.session.commit()

        login_user(new_user)

        return jsonify({'message': 'Account created successfully'}), 201

    return render_template('register.html')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        user = User.query.filter_by(username=username).first()
        if user and bcrypt.check_password_hash(user.password_hash, password):
            login_user(user)
            return jsonify({'message': 'Login successful'}), 200
        else:
            return jsonify({'message': 'Invalid username or password'}), 401

    return render_template('login.html')

@auth_bp.route('/logout', methods=['GET'])
def logout():
    logout_user()
    return redirect(url_for('auth.login'))

@auth_bp.route('/dashboard', methods=['GET'])
@login_required
def profile():
    return jsonify({
        'uid': current_user.uid,
        'username': current_user.username,
        'profile_picture': current_user.profile_picture,
        'preferences': current_user.preferences,
        'theme_mode': _get_theme_mode(current_user),
    }), 200


@auth_bp.route('/profile/settings', methods=['GET'])
@login_required
def get_profile_settings():
    return jsonify({
        'uid': current_user.uid,
        'username': current_user.username,
        'email': current_user.email,
        'profile_picture': current_user.profile_picture,
        'is_verified': current_user.is_verified,
        'theme_mode': _get_theme_mode(current_user),
        'preferences': current_user.preferences or {},
    }), 200


@auth_bp.route('/profile/theme', methods=['POST'])
@login_required
def update_theme_mode():
    payload = request.get_json(silent=True) or request.form
    theme_mode = payload.get('theme_mode')
    if theme_mode not in ('dark', 'light'):
        return jsonify({'message': 'Theme mode must be dark or light.'}), 400

    preferences = dict(current_user.preferences or {})
    preferences['theme_mode'] = theme_mode
    current_user.preferences = preferences
    db.session.commit()

    return jsonify({'message': 'Theme preference saved.', 'theme_mode': theme_mode}), 200


@auth_bp.route('/profile/report_data', methods=['GET'])
@login_required
def get_profile_report_data():
    visits = (
        VisitedLocation.query
        .filter_by(user_id=current_user.uid)
        .order_by(VisitedLocation.timestamp.desc())
        .all()
    )
    visited_locations = []
    for visit in visits:
        location = Location.query.get(visit.location_id)
        if location:
            visited_locations.append(_location_to_dict(location, visit.timestamp))

    favorite_locations = [_location_to_dict(location) for location in current_user.favorite_locations]
    reviews = []
    for review in current_user.reviews:
        reviews.append({
            'location_id': review.location_id,
            'location_name': review.location.name if review.location else 'Unknown location',
            'star_rating': review.star_rating,
            'content': review.content,
        })

    return jsonify({
        'generated_for': {
            'uid': current_user.uid,
            'username': current_user.username,
            'email': current_user.email,
            'theme_mode': _get_theme_mode(current_user),
        },
        'favorite_locations': favorite_locations,
        'recently_visited_locations': visited_locations,
        'reviews': reviews,
        'preferences': current_user.preferences or {},
    }), 200

@auth_bp.route('/change_picture', methods=['POST'])
@login_required
def change_picture():
    if 'image' not in request.files:
        return jsonify({'message': 'No image file provided'}), 400

    image = request.files['image']

    if image.filename == '':
        return jsonify({'message': 'No selected file'}), 400

    if image:
        ext = os.path.splitext(image.filename)[1]
        
        random_filename = f"{os.urandom(16).hex()}{ext}"
        
        upload_path = os.path.join(auth_bp.root_path, '..', 'static', 'profile_pictures')
        if not os.path.exists(upload_path):
            os.makedirs(upload_path)
            
        file_path = os.path.join(upload_path, random_filename)
        
        image.save(file_path)

        current_user.profile_picture = random_filename
        db.session.commit()

        return jsonify({
            'message': 'Profile picture updated successfully', 
            'profile_picture': random_filename
        }), 200

@auth_bp.route('/change_password', methods=['POST'])
@login_required
def change_password():
    current_password = request.form.get('current_password')
    new_password = request.form.get('new_password')

    if not bcrypt.check_password_hash(current_user.password_hash, current_password):
        return jsonify({'message': 'Current password is incorrect'}), 401

    if not _is_password_valid(new_password):
        return jsonify({'message': 'Password must be at least 8 characters and include letters and numbers.'}), 400

    new_password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    current_user.password_hash = new_password_hash
    db.session.commit()

    return jsonify({'message': 'Password updated successfully'}), 200


@auth_bp.route('/change_password_email', methods=['POST'])
@login_required
def send_change_password_email():
    try:
        _send_password_reset_email(current_user, subject='Confirm Your LuminX Password Change')
    except Exception as exc:
        current_app.logger.exception('Failed to send password change email: %s', exc)
        return jsonify({'message': 'Unable to send password change email right now.'}), 500

    return jsonify({'message': f'Password change link sent to {current_user.email}.'}), 200

@auth_bp.route('/confirm_email/<token>', methods=['GET'])
def confirm_email(token):
    token_serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        email = token_serializer.loads(token, salt='email-confirmation-salt', max_age=3600)
    except Exception as e:
        return jsonify({'message': 'Invalid or expired token'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404

    user.is_verified = True
    db.session.commit()

    return jsonify({'message': 'Email confirmed successfully'}), 200


@auth_bp.route('/forgot_password', methods=['POST'])
def forgot_password():
    payload = request.get_json(silent=True) or request.form
    email = (payload.get('email') or '').strip().lower()
    if not email:
        return jsonify({'message': 'Email is required'}), 400

    user = User.query.filter_by(email=email).first()
    if user:
        try:
            _send_password_reset_email(user)
        except Exception as exc:
            current_app.logger.exception('Failed to send password reset email: %s', exc)
            return jsonify({'message': 'Unable to send reset email right now.'}), 500

    # Avoid user enumeration by returning success even when email does not exist.
    return jsonify({'message': 'If an account exists for this email, a password reset link was sent.'}), 200


@auth_bp.route('/reset_password/<token>', methods=['GET'])
def validate_reset_password_token(token):
    try:
        token_data = _load_password_reset_token(token)
    except Exception:
        return jsonify({'message': 'Invalid or expired reset link'}), 400

    uid = token_data.get('uid')
    email = (token_data.get('email') or '').strip().lower()
    password_signature = token_data.get('pwd_sig') or ''

    user = User.query.get(uid)
    if not user or user.email.lower() != email or (user.password_hash or '')[-24:] != password_signature:
        return jsonify({'message': 'Invalid or expired reset link'}), 400

    return jsonify({'message': 'Reset link is valid', 'username': user.username, 'email': user.email}), 200


@auth_bp.route('/reset_password/<token>', methods=['POST'])
def reset_password(token):
    try:
        token_data = _load_password_reset_token(token)
    except Exception:
        return jsonify({'message': 'Invalid or expired reset link'}), 400

    uid = token_data.get('uid')
    email = (token_data.get('email') or '').strip().lower()
    password_signature = token_data.get('pwd_sig') or ''

    user = User.query.get(uid)
    if not user or user.email.lower() != email or (user.password_hash or '')[-24:] != password_signature:
        return jsonify({'message': 'Invalid or expired reset link'}), 400

    payload = request.get_json(silent=True) or request.form
    new_password = payload.get('new_password')
    if not _is_password_valid(new_password):
        return jsonify({'message': 'Password must be at least 8 characters and include letters and numbers.'}), 400

    user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    db.session.commit()

    return jsonify({'message': 'Password reset successfully'}), 200
