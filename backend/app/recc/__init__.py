from flask import Blueprint

# Create the recommendation blueprint
recc_bp = Blueprint('recc', __name__, template_folder='templates')

# Import routes after blueprint creation to avoid circular imports
from app.recc import routes
