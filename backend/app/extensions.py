from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

# SQLAlchemy instance for database ORM operations
# Used throughout the app for model definitions and database queries
db = SQLAlchemy()

# Bcrypt instance for secure password hashing
# Provides generate_password_hash() and check_password_hash() methods
bcrypt = Bcrypt()
