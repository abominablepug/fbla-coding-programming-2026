from flask import request, jsonify
from flask_login import login_required, current_user
from app.coupons import coupons_bp
from app.extensions import db
from app.models import Coupon, Business
from datetime import datetime

@coupons_bp.route('/create', methods=['POST'])
@login_required
def create_coupon():
    if current_user.user_type != 'business':
        return jsonify({"error": "Only businesses can create coupons"}), 403
        
    business = Business.query.filter_by(user_id=current_user.uid).first()
    if not business:
        return jsonify({"error": "Business profile not found"}), 404
        
    data = request.get_json()
    title = data.get('title')
    discount_label = data.get('discount_label')
    code = data.get('code')
    description = data.get('description', '')
    expires_at_str = data.get('expires_at')
    
    if not title or not discount_label or not code:
        return jsonify({"error": "Title, discount_label, and code are required"}), 400
        
    expires_at = None
    if expires_at_str:
        try:
            expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({"error": "Invalid date format for expires_at"}), 400

    coupon = Coupon(
        business_id=business.bid,
        title=title,
        discount_label=discount_label,
        code=code,
        description=description,
        expires_at=expires_at
    )
    
    db.session.add(coupon)
    db.session.commit()
    
    return jsonify({
        "message": "Coupon created successfully",
        "coupon_id": coupon.id
    }), 201

@coupons_bp.route('/business', methods=['GET'])
@login_required
def get_business_coupons():
    if current_user.user_type != 'business':
        return jsonify({"error": "Only businesses can view their coupons here"}), 403
        
    business = Business.query.filter_by(user_id=current_user.uid).first()
    if not business:
        return jsonify({"error": "Business profile not found"}), 404
        
    coupons = Coupon.query.filter_by(business_id=business.bid).all()
    
    return jsonify([{
        "id": c.id,
        "title": c.title,
        "discount_label": c.discount_label,
        "code": c.code,
        "description": c.description,
        "expires_at": c.expires_at.isoformat() if c.expires_at else None,
        "created_at": c.created_at.isoformat() if c.created_at else None
    } for c in coupons]), 200

@coupons_bp.route('/<int:coupon_id>', methods=['PUT'])
@login_required
def update_coupon(coupon_id):
    if current_user.user_type != 'business':
        return jsonify({"error": "Only businesses can update coupons"}), 403
        
    business = Business.query.filter_by(user_id=current_user.uid).first()
    coupon = Coupon.query.get(coupon_id)
    if not coupon or coupon.business_id != business.bid:
        return jsonify({"error": "Coupon not found"}), 404
        
    data = request.get_json()
    if 'title' in data:
        coupon.title = data['title']
    if 'discount_label' in data:
        coupon.discount_label = data['discount_label']
    if 'code' in data:
        coupon.code = data['code']
    if 'description' in data:
        coupon.description = data['description']
    if 'expires_at' in data:
        if data['expires_at']:
            try:
                coupon.expires_at = datetime.fromisoformat(data['expires_at'].replace('Z', '+00:00'))
            except ValueError:
                return jsonify({"error": "Invalid date format for expires_at"}), 400
        else:
            coupon.expires_at = None
            
    db.session.commit()
    return jsonify({"message": "Coupon updated successfully"}), 200

@coupons_bp.route('/<int:coupon_id>', methods=['DELETE'])
@login_required
def delete_coupon(coupon_id):
    if current_user.user_type != 'business':
        return jsonify({"error": "Only businesses can delete coupons"}), 403
        
    business = Business.query.filter_by(user_id=current_user.uid).first()
    coupon = Coupon.query.get(coupon_id)
    if not coupon or coupon.business_id != business.bid:
        return jsonify({"error": "Coupon not found"}), 404
        
    db.session.delete(coupon)
    db.session.commit()
    
    return jsonify({"message": "Coupon deleted successfully"}), 200

@coupons_bp.route('/public', methods=['GET'])
def get_public_coupons():
    # Return all active coupons
    now = datetime.utcnow()
    query = Coupon.query.filter((Coupon.expires_at > now) | (Coupon.expires_at == None))
    
    coupons = query.all()
    
    result = []
    for c in coupons:
        business = c.business
        result.append({
            "id": c.id,
            "business_id": business.bid if business else None,
            "business_name": business.business_name if business else "Unknown",
            "business_address": business.address if business else None,
            "latitude": business.latitude if business else None,
            "longitude": business.longitude if business else None,
            "category": business.category if business else None,
            "title": c.title,
            "discount_label": c.discount_label,
            "code": c.code,
            "description": c.description,
            "expires_at": c.expires_at.isoformat() if c.expires_at else None,
            "created_at": c.created_at.isoformat() if c.created_at else None
        })
        
    return jsonify(result), 200
