from flask import request, jsonify
from flask_login import login_required, current_user
from app.ads import ads_bp
from app.extensions import db
from app.models import Advertisement, Business
import random

@ads_bp.route('/create', methods=['POST'])
@login_required
def create_ad():
    """Create a new advertisement for a business."""
    if current_user.user_type != 'business':
        return jsonify({"error": "Only businesses can create ads"}), 403
        
    business = Business.query.filter_by(user_id=current_user.uid).first()
    if not business:
        return jsonify({"error": "Business profile not found"}), 404
        
    # Check if request has file or json
    if request.is_json:
        data = request.get_json()
        media_url = data.get('media_url')
        media_type = data.get('media_type', 'image')
        target_url = data.get('target_url')
    else:
        # form data
        media_url = request.form.get('media_url')
        media_type = request.form.get('media_type', 'image')
        target_url = request.form.get('target_url')
        
        if 'file' in request.files and request.files['file'].filename != '':
            file = request.files['file']
            import os
            ext = os.path.splitext(file.filename)[1]
            random_filename = f"{os.urandom(16).hex()}{ext}"
            
            upload_path = os.path.join(ads_bp.root_path, '..', 'static', 'ads')
            if not os.path.exists(upload_path):
                os.makedirs(upload_path)
                
            file_path = os.path.join(upload_path, random_filename)
            file.save(file_path)
            media_url = f"/static/ads/{random_filename}"

    if not media_url:
        return jsonify({"error": "Media URL or file is required"}), 400
        
    # Auto-detect media_type to prevent rendering issues
    lower_url = media_url.lower()
    if any(lower_url.endswith(ext) for ext in ['.mp4', '.webm', '.ogg', '.mov']):
        media_type = 'video'
    elif any(lower_url.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
        media_type = 'image'
        
    ad = Advertisement(
        business_id=business.bid,
        media_url=media_url,
        media_type=media_type,
        target_url=target_url,
        status='pending'  # Needs approval
    )
    
    db.session.add(ad)
    db.session.commit()
    
    return jsonify({
        "message": "Advertisement submitted successfully and is pending approval",
        "ad_id": ad.id
    }), 201


@ads_bp.route('/business', methods=['GET'])
@login_required
def get_business_ads():
    """Get all advertisements for the logged-in business."""
    if current_user.user_type != 'business':
        return jsonify({"error": "Only businesses can view their ads here"}), 403
        
    business = Business.query.filter_by(user_id=current_user.uid).first()
    if not business:
        return jsonify({"error": "Business profile not found"}), 404
        
    ads = Advertisement.query.filter_by(business_id=business.bid).all()
    
    return jsonify([{
        "id": ad.id,
        "media_url": ad.media_url,
        "media_type": ad.media_type,
        "target_url": ad.target_url,
        "status": ad.status,
        "created_at": ad.created_at.isoformat() if ad.created_at else None
    } for ad in ads]), 200

@ads_bp.route('/<int:ad_id>', methods=['PUT'])
@login_required
def update_ad(ad_id):
    """Update an advertisement (Business only)."""
    if current_user.user_type != 'business':
        return jsonify({"error": "Only businesses can update ads"}), 403
        
    business = Business.query.filter_by(user_id=current_user.uid).first()
    ad = Advertisement.query.get(ad_id)
    if not ad or ad.business_id != business.bid:
        return jsonify({"error": "Advertisement not found"}), 404
        
    if request.is_json:
        data = request.get_json()
        if 'media_url' in data:
            ad.media_url = data['media_url']
        if 'media_type' in data:
            ad.media_type = data['media_type']
        if 'target_url' in data:
            ad.target_url = data['target_url']
    else:
        if 'media_url' in request.form and request.form['media_url']:
            ad.media_url = request.form['media_url']
        if 'media_type' in request.form:
            ad.media_type = request.form['media_type']
        if 'target_url' in request.form:
            ad.target_url = request.form['target_url']
            
        if 'file' in request.files and request.files['file'].filename != '':
            file = request.files['file']
            import os
            ext = os.path.splitext(file.filename)[1]
            random_filename = f"{os.urandom(16).hex()}{ext}"
            upload_path = os.path.join(ads_bp.root_path, '..', 'static', 'ads')
            if not os.path.exists(upload_path):
                os.makedirs(upload_path)
            file_path = os.path.join(upload_path, random_filename)
            file.save(file_path)
            ad.media_url = f"/static/ads/{random_filename}"
            
    if ad.media_url:
        lower_url = ad.media_url.lower()
        if any(lower_url.endswith(ext) for ext in ['.mp4', '.webm', '.ogg', '.mov']):
            ad.media_type = 'video'
        elif any(lower_url.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
            ad.media_type = 'image'
            
    ad.status = 'pending'
    db.session.commit()
    
    return jsonify({"message": "Advertisement updated successfully"}), 200

@ads_bp.route('/<int:ad_id>', methods=['DELETE'])
@login_required
def delete_ad(ad_id):
    """Delete an advertisement (Business only)."""
    if current_user.user_type != 'business':
        return jsonify({"error": "Only businesses can delete ads"}), 403
        
    business = Business.query.filter_by(user_id=current_user.uid).first()
    ad = Advertisement.query.get(ad_id)
    if not ad or ad.business_id != business.bid:
        return jsonify({"error": "Advertisement not found"}), 404
        
    db.session.delete(ad)
    db.session.commit()
    
    return jsonify({"message": "Advertisement deleted successfully"}), 200

@ads_bp.route('/pending', methods=['GET'])
@login_required
def get_pending_ads():
    """Get all pending advertisements (Admin only)."""
    if current_user.user_type != 'admin':
        return jsonify({"error": "Only admins can view pending ads"}), 403
        
    ads = Advertisement.query.filter_by(status='pending').all()
    
    result = []
    for ad in ads:
        business = ad.business
        result.append({
            "id": ad.id,
            "business_name": business.business_name if business else "Unknown",
            "media_url": ad.media_url,
            "media_type": ad.media_type,
            "target_url": ad.target_url,
            "status": ad.status,
            "created_at": ad.created_at.isoformat() if ad.created_at else None
        })
        
    return jsonify(result), 200


@ads_bp.route('/<int:ad_id>/status', methods=['PUT'])
@login_required
def update_ad_status(ad_id):
    """Update the status of an advertisement (Admin only)."""
    if current_user.user_type != 'admin':
        return jsonify({"error": "Only admins can update ad status"}), 403
        
    data = request.get_json()
    new_status = data.get('status')
    
    if new_status not in ['approved', 'rejected']:
        return jsonify({"error": "Invalid status. Must be 'approved' or 'rejected'"}), 400
        
    ad = Advertisement.query.get(ad_id)
    if not ad:
        return jsonify({"error": "Advertisement not found"}), 404
        
    ad.status = new_status
    db.session.commit()
    
    return jsonify({"message": f"Advertisement status updated to {new_status}"}), 200


@ads_bp.route('/public', methods=['GET'])
def get_public_ads():
    """Get approved advertisements to display to users."""
    limit = request.args.get('limit', 5, type=int)
    
    # We could filter by location here if we wanted to show local ads
    # For now, just get approved ads
    query = Advertisement.query.filter_by(status='approved')
    
    if current_user.is_authenticated and current_user.user_type == 'business':
        business = Business.query.filter_by(user_id=current_user.uid).first()
        if business:
            query = query.filter(Advertisement.business_id != business.bid)
            
    ads = query.all()
    
    if not ads:
        return jsonify([]), 200
        
    # Return random ads
    selected_ads = random.sample(ads, min(len(ads), limit))
    
    result = []
    for ad in selected_ads:
        business = ad.business
        result.append({
            "id": ad.id,
            "business_name": business.business_name if business else "Unknown",
            "business_id": business.bid if business else None,
            "media_url": ad.media_url,
            "media_type": ad.media_type,
            "target_url": ad.target_url
        })
        
    return jsonify(result), 200
