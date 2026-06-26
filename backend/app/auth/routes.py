from . import auth_bp
from flask import request, jsonify, render_template, url_for, redirect, current_app
from flask_login import login_user, logout_user, current_user, login_required
from flask_mail import Message
from app import db
from app.models import User
from app.extensions import bcrypt
from itsdangerous import URLSafeTimedSerializer
import os
from urllib.parse import quote

# Salt for password reset token generation (must match in both build and load)
PASSWORD_RESET_SALT = 'password-reset-salt'

# Token expiration time in seconds (1 hour)
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
        'pwd_sig': (user.password_hash or '')[-24:],  # Partial hash for token invalidation
    }
    return token_serializer.dumps(payload, salt=PASSWORD_RESET_SALT)


def _load_password_reset_token(token: str):
    token_serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    return token_serializer.loads(token, salt=PASSWORD_RESET_SALT, max_age=PASSWORD_RESET_MAX_AGE_SECONDS)

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        # Extract form data
        username = request.form.get('username')
        password = request.form.get('password')
        image = request.form.get('image')
        email = request.form.get('email')
        user_type = request.form.get('user_type', 'customer')  # customer or business

        # Check for duplicate username
        if User.query.filter_by(username=username).first():
            return jsonify({'message': 'Username already exists'}), 400

        # Handle profile picture upload
        profile_picture = None
        if image:
            # Generate random filename to prevent collisions and path traversal
            ext = os.path.splitext(image)[1]
            random_filename = f"{os.urandom(16).hex()}{ext}"
            
            profile_picture = random_filename
            
            # Save image to static directory
            image_path = os.path.join('static/profile_pictures', random_filename)
            with open(image_path, 'wb') as f:
                f.write(image.encode('latin1'))
        else:
            profile_picture = 'default_profile_picture.png'

        # Hash password and create user
        password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        # In development, auto-verify dummy emails (test@test.com, etc.)
        is_verified = email.startswith('test') or os.getenv('FLASK_ENV') == 'development'
        new_user = User(username=username, password_hash=password_hash, profile_picture=profile_picture, email=email, is_verified=is_verified, user_type=user_type)

        # Only send verification email for non-test accounts in production
        if not is_verified:
            try:
                token_serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
                token = token_serializer.dumps(email, salt='email-confirmation-salt')
                msg = Message('Confirm Your Email', recipients=[email])
                confirm_url = url_for('auth.confirm_email', token=token, _external=True)
                msg.body = f'Please click the link to confirm your email: {confirm_url}'
                mail = current_app.extensions['mail']
                mail.send(msg)
            except Exception as e:
                # If email fails, still allow user to register
                current_app.logger.warning(f'Email verification failed for {email}: {e}')
        db.session.add(new_user)
        db.session.commit()

        # Auto-login after registration
        login_user(new_user)

        return jsonify({'message': 'Account created successfully'}), 201

    return render_template('register.html')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        # Look up user and verify password hash
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
        'user_type': current_user.user_type
    }), 200


@auth_bp.route('/change_picture', methods=['POST'])
@login_required
def change_picture():
    # Validate file is present in request
    if 'image' not in request.files:
        return jsonify({'message': 'No image file provided'}), 400

    image = request.files['image']

    if image.filename == '':
        return jsonify({'message': 'No selected file'}), 400

    if image:
        # Generate random filename for security
        ext = os.path.splitext(image.filename)[1]
        random_filename = f"{os.urandom(16).hex()}{ext}"
        
        # Ensure upload directory exists
        upload_path = os.path.join(auth_bp.root_path, '..', 'static', 'profile_pictures')
        if not os.path.exists(upload_path):
            os.makedirs(upload_path)
            
        file_path = os.path.join(upload_path, random_filename)
        
        # Save file and update user record
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

    # Verify current password before allowing change
    if not bcrypt.check_password_hash(current_user.password_hash, current_password):
        return jsonify({'message': 'Current password is incorrect'}), 401

    # Hash and save new password
    new_password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    current_user.password_hash = new_password_hash
    db.session.commit()

    return jsonify({'message': 'Password updated successfully'}), 200

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

    # Mark email as verified
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
            # Generate reset token
            token = _build_password_reset_token(user)
            
            # Determine frontend URL for reset link
            configured_frontend = os.getenv('FRONTEND_BASE_URL', '').strip()
            origin_frontend = (request.headers.get('Origin') or '').strip()
            frontend_base = configured_frontend or origin_frontend or 'http://localhost:5174'
            frontend_base = frontend_base.rstrip('/')
            reset_url = f'{frontend_base}/reset-password?token={quote(token)}&username={quote(user.username)}'

            # Send reset email
            msg = Message('Reset Your LuminX Password', recipients=[user.email])
            msg.body = (
                'A password reset was requested for your LuminX account.\n\n'
                f'Username: {user.username}\n'
                f'Reset link (valid for 60 minutes): {reset_url}\n\n'
                'If you did not request this, you can safely ignore this email.'
            )
            mail = current_app.extensions['mail']
            mail.send(msg)
        except Exception as exc:
            current_app.logger.exception('Failed to send password reset email: %s', exc)
            return jsonify({'message': 'Unable to send reset email right now.'}), 500

    # Return success even if email doesn't exist to prevent user enumeration
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

    # Verify user exists and password hasn't changed since token was issued
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

    # Verify user exists and password hasn't changed since token was issued
    user = User.query.get(uid)
    if not user or user.email.lower() != email or (user.password_hash or '')[-24:] != password_signature:
        return jsonify({'message': 'Invalid or expired reset link'}), 400

    # Get and validate new password
    payload = request.get_json(silent=True) or request.form
    new_password = payload.get('new_password')
    if not _is_password_valid(new_password):
        return jsonify({'message': 'Password must be at least 8 characters and include letters and numbers.'}), 400

    # Hash and save new password
    user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    db.session.commit()

    return jsonify({'message': 'Password reset successfully'}), 200

def _location_to_dict(location, visited_at=None):
    return {
        'lid': location.lid,
        'name': location.name,
        'address': location.address,
        'longitude': location.longitude,
        'latitude': location.latitude,
        'categories': location.categories,
        'visited_at': visited_at.isoformat() if visited_at else None,
    }


def _get_theme_mode(user: User) -> str:
    preferences = user.preferences or {}
    return preferences.get('theme_mode') if preferences.get('theme_mode') in ('dark', 'light') else 'dark'


@auth_bp.route('/update_theme_mode', methods=['POST'])
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
    from app.models import Location, VisitedLocation
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
