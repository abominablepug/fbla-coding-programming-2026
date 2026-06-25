from flask import Blueprint

ads_bp = Blueprint('ads', __name__)

from . import routes
