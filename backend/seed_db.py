"""Reset the database to a known state with three demo accounts.

Clears ALL existing rows from every table, then seeds exactly:
  - user     / password   (customer)
  - business / password   (business)
  - admin    / password   (admin)

Idempotent: running it again drops everything and re-seeds the same accounts.

Usage:
    python seed_db.py
"""
from app import create_app
from app.extensions import db, bcrypt
from app import models  # noqa: F401  ensure all models are registered
from app.models import User


DEMO_ACCOUNTS = [
    {"username": "user", "email": "user@example.com", "user_type": "customer"},
    {"username": "business", "email": "business@example.com", "user_type": "business"},
    {"username": "admin", "email": "admin@example.com", "user_type": "admin"},
]
DEMO_PASSWORD = "password"


def seed():
    app = create_app()
    with app.app_context():
        # Make sure every table exists before we try to clear it.
        db.create_all()

        # 1. Clear all existing rows from every table (children first to respect FKs).
        for table in reversed(db.metadata.sorted_tables):
            db.session.execute(table.delete())
        db.session.commit()

        # 2. Seed the three demo accounts.
        password_hash = bcrypt.generate_password_hash(DEMO_PASSWORD).decode("utf-8")
        for account in DEMO_ACCOUNTS:
            user = User(
                username=account["username"],
                email=account["email"],
                user_type=account["user_type"],
                password_hash=password_hash,
                is_verified=True,
                profile_picture="default_profile_picture.png",
            )
            db.session.add(user)
            print(f"  + {account['username']} ({account['user_type']})")

        db.session.commit()
        print("Database reset complete. 3 accounts seeded.")


if __name__ == "__main__":
    seed()
