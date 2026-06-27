import os
from app.__init__ import create_app
from app.extensions import db, bcrypt
from app.models import User

def seed_admin():
    app = create_app()
    with app.app_context():
        admin_user = User.query.filter_by(username='user').first()
        if not admin_user:
            password_hash = bcrypt.generate_password_hash('password').decode('utf-8')
            admin_user = User(
                username='user',
                password_hash=password_hash,
                email='admin@example.com',
                user_type='admin',
                is_verified=True,
                profile_picture='default_profile_picture.png'
            )
            db.session.add(admin_user)
            db.session.commit()
            print("Admin user 'user' with password 'password' created successfully.")
        else:
            if admin_user.user_type != 'admin':
                admin_user.user_type = 'admin'
                db.session.commit()
                print("Existing user 'user' was upgraded to admin.")
            else:
                print("Admin user 'user' already exists.")

if __name__ == '__main__':
    seed_admin()
