from flask import request, jsonify, render_template, url_for, redirect
from . import auth_bp
from app.models import User
from app.extensions import bcrypt
from app import db
from flask_login import login_user, logout_user, current_user, login_required
import os

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        image = request.form.get('image')

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

        password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        new_user = User(username=username, password_hash=password_hash, profile_picture=profile_picture)
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
        'preferences': current_user.preferences
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

    new_password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    current_user.password_hash = new_password_hash
    db.session.commit()

    return jsonify({'message': 'Password updated successfully'}), 200
