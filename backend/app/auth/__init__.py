from flask import Blueprint

# Create the authentication blueprint
# template_folder points to templates directory for server-rendered pages
auth_bp = Blueprint('auth', __name__, template_folder='templates')

# Import routes after blueprint creation to avoid circular imports
from app.auth import routes
