from flask import Blueprint

# Create the location blueprint
loc_bp = Blueprint('loc', __name__, template_folder='templates')

# Import routes after blueprint creation to avoid circular imports
from app.loc import routes
