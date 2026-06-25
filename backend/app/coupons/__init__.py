from flask import Blueprint

coupons_bp = Blueprint('coupons', __name__)

from app.coupons import routes
