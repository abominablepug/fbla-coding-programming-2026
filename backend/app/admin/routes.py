from flask import request, jsonify
from flask_login import login_required, current_user
from app.admin import admin_bp
from app.extensions import db
from app.models import Business

@admin_bp.route('/businesses', methods=['GET'])
@login_required
def get_businesses():
    if current_user.user_type != 'admin':
        return jsonify({"error": "Only admins can view businesses"}), 403
        
    businesses = Business.query.all()
    
    return jsonify([{
        "bid": b.bid,
        "business_name": b.business_name,
        "category": b.category,
        "address": b.address,
        "is_certified_local": b.is_certified_local,
        "created_at": b.created_at.isoformat() if b.created_at else None
    } for b in businesses]), 200

@admin_bp.route('/businesses/<int:bid>/certify', methods=['PUT'])
@login_required
def certify_business(bid):
    if current_user.user_type != 'admin':
        return jsonify({"error": "Only admins can certify businesses"}), 403
        
    business = Business.query.get(bid)
    if not business:
        return jsonify({"error": "Business not found"}), 404
        
    data = request.get_json()
    if 'is_certified_local' in data:
        business.is_certified_local = bool(data['is_certified_local'])
        db.session.commit()
        return jsonify({"message": f"Business certified status updated to {business.is_certified_local}"}), 200
        
    return jsonify({"error": "Missing is_certified_local in payload"}), 400
