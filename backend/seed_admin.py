"""Ensure the three demo accounts exist with the correct roles.

Idempotent and non-destructive: it creates any missing demo account and
corrects the role of an existing one, but never deletes other data. Wired
into `npm run setup`, so it runs on every dev startup.

Accounts (all with password 'password'):
  - user     -> customer
  - business -> business
  - admin    -> admin

To fully wipe the database and reset to ONLY these accounts, use seed_db.py.
"""
from app.__init__ import create_app
from app.extensions import db, bcrypt
from app.models import User


DEMO_ACCOUNTS = [
    {"username": "user", "email": "user@example.com", "user_type": "customer"},
    {"username": "business", "email": "business@example.com", "user_type": "business"},
    {"username": "admin", "email": "admin@example.com", "user_type": "admin"},
]
DEMO_PASSWORD = "password"


def seed_admin():
    app = create_app()
    with app.app_context():
        password_hash = bcrypt.generate_password_hash(DEMO_PASSWORD).decode("utf-8")
        for account in DEMO_ACCOUNTS:
            existing = User.query.filter_by(username=account["username"]).first()
            if not existing:
                db.session.add(User(
                    username=account["username"],
                    password_hash=password_hash,
                    email=account["email"],
                    user_type=account["user_type"],
                    is_verified=True,
                    profile_picture="default_profile_picture.png",
                ))
                print(f"Created '{account['username']}' ({account['user_type']}).")
            elif existing.user_type != account["user_type"]:
                existing.user_type = account["user_type"]
                print(f"Corrected '{account['username']}' role to {account['user_type']}.")
        db.session.commit()
        print("Demo accounts ensured.")


if __name__ == '__main__':
    seed_admin()
