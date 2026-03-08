from flask import Blueprint

# Create the rating blueprint
rate_bp = Blueprint('rate', __name__, template_folder='templates')

# Import routes after blueprint creation to avoid circular imports
from app.rate import routes
