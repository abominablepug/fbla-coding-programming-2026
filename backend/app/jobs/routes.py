from flask import request, jsonify
from flask_login import login_required, current_user
from . import jobs_bp
from app.models import User, Business, JobPosting, UserProfile, JobApplication
from app import db
import math


def get_skill_vector(job_requirements):
    """Convert job requirements to a vector for skill matching."""
    vector = {}
    if job_requirements and isinstance(job_requirements, list):
        for skill in job_requirements:
            if isinstance(skill, str):
                vector[skill.lower()] = 1.0
    return vector


def calculate_job_relevance(user_skills, job_vector):
    """Calculate cosine similarity between user skills and job requirements."""
    all_keys = set(user_skills.keys()).union(set(job_vector.keys()))

    dot_product = 0
    magnitude_user = 0
    magnitude_job = 0

    for key in all_keys:
        user = user_skills.get(key, 0.0)
        job = job_vector.get(key, 0.0)

        dot_product += user * job
        magnitude_user += user ** 2
        magnitude_job += job ** 2

    magnitude_user = math.sqrt(magnitude_user)
    magnitude_job = math.sqrt(magnitude_job)

    if not magnitude_user or not magnitude_job:
        return 0.0

    return dot_product / (magnitude_user * magnitude_job)


def convert_skills_to_vector(skills):
    """Convert user skills array to a vector."""
    vector = {}
    if skills and isinstance(skills, list):
        for skill in skills:
            if isinstance(skill, str):
                vector[skill.lower()] = 1.0
    return vector


def calculate_distance_decay(lon1, lat1, lon2, lat2):
    """Calculate exponential distance decay factor."""
    if lon1 is None or lat1 is None or lon2 is None or lat2 is None:
        return 1.0

    # Haversine formula to calculate distance in miles
    R = 3959  # Earth's radius in miles
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    distance_mi = R * c

    # Apply exponential decay (closer jobs get higher factor)
    decay_constant = 1.5
    return math.exp(-distance_mi / decay_constant)


# ======================== BUSINESS ENDPOINTS ========================

@jobs_bp.route('/business/profile', methods=['POST'])
@login_required
def create_business_profile():
    """Create a business profile for the current user."""
    if current_user.user_type != 'business':
        return jsonify({'message': 'User must be registered as business'}), 403

    data = request.get_json()

    # Check if business profile already exists
    if current_user.business_profile:
        return jsonify({'message': 'Business profile already exists'}), 400

    business_name = data.get('business_name')
    description = data.get('description')
    category = data.get('category')
    address = data.get('address')
    longitude = data.get('longitude')
    latitude = data.get('latitude')
    phone = data.get('phone')
    email = data.get('email')
    website = data.get('website')

    if not business_name:
        return jsonify({'message': 'Business name is required'}), 400

    business = Business(
        user_id=current_user.uid,
        business_name=business_name,
        description=description,
        category=category,
        address=address,
        longitude=longitude,
        latitude=latitude,
        phone=phone,
        email=email,
        website=website
    )
    db.session.add(business)
    db.session.commit()

    return jsonify({
        'message': 'Business profile created successfully',
        'business_id': business.bid
    }), 201


@jobs_bp.route('/business/profile', methods=['GET'])
@login_required
def get_business_profile():
    """Get the current user's business profile."""
    if not current_user.business_profile:
        return jsonify({'message': 'No business profile found'}), 404

    bp = current_user.business_profile
    return jsonify({
        'business_id': bp.bid,
        'business_name': bp.business_name,
        'description': bp.description,
        'category': bp.category,
        'address': bp.address,
        'longitude': bp.longitude,
        'latitude': bp.latitude,
        'phone': bp.phone,
        'email': bp.email,
        'website': bp.website,
        'created_at': bp.created_at.isoformat(),
        'updated_at': bp.updated_at.isoformat()
    }), 200


@jobs_bp.route('/business/profile', methods=['PUT'])
@login_required
def update_business_profile():
    """Update the current user's business profile."""
    if not current_user.business_profile:
        return jsonify({'message': 'No business profile found'}), 404

    data = request.get_json()
    bp = current_user.business_profile

    bp.business_name = data.get('business_name', bp.business_name)
    bp.description = data.get('description', bp.description)
    bp.category = data.get('category', bp.category)
    bp.address = data.get('address', bp.address)
    bp.longitude = data.get('longitude', bp.longitude)
    bp.latitude = data.get('latitude', bp.latitude)
    bp.phone = data.get('phone', bp.phone)
    bp.email = data.get('email', bp.email)
    bp.website = data.get('website', bp.website)

    db.session.commit()

    return jsonify({'message': 'Business profile updated successfully'}), 200


@jobs_bp.route('/business/jobs', methods=['POST'])
@login_required
def create_job_posting():
    """Create a new job posting."""
    if not current_user.business_profile:
        return jsonify({'message': 'Business profile not found'}), 404

    data = request.get_json()

    title = data.get('title')
    description = data.get('description')
    requirements = data.get('requirements')
    salary_range = data.get('salary_range')
    job_type = data.get('job_type')
    location = data.get('location')
    longitude = data.get('longitude')
    latitude = data.get('latitude')

    if not title:
        return jsonify({'message': 'Job title is required'}), 400

    job = JobPosting(
        business_id=current_user.business_profile.bid,
        title=title,
        description=description,
        requirements=requirements,
        salary_range=salary_range,
        job_type=job_type,
        location=location,
        longitude=longitude,
        latitude=latitude,
        status='active'
    )
    db.session.add(job)
    db.session.commit()

    return jsonify({
        'message': 'Job posting created successfully',
        'job_id': job.job_id
    }), 201


@jobs_bp.route('/business/jobs', methods=['GET'])
@login_required
def get_business_jobs():
    """Get all jobs posted by the current business."""
    if not current_user.business_profile:
        return jsonify({'message': 'Business profile not found'}), 404

    jobs = JobPosting.query.filter_by(business_id=current_user.business_profile.bid).all()

    jobs_data = []
    for job in jobs:
        jobs_data.append({
            'job_id': job.job_id,
            'title': job.title,
            'description': job.description,
            'requirements': job.requirements,
            'salary_range': job.salary_range,
            'job_type': job.job_type,
            'location': job.location,
            'longitude': job.longitude,
            'latitude': job.latitude,
            'status': job.status,
            'posted_date': job.posted_date.isoformat(),
            'applicant_count': len(job.applications)
        })

    return jsonify({'jobs': jobs_data}), 200


@jobs_bp.route('/business/jobs/<int:job_id>', methods=['GET'])
@login_required
def get_job_details(job_id):
    """Get details of a specific job posting."""
    job = JobPosting.query.get(job_id)
    if not job:
        return jsonify({'message': 'Job not found'}), 404

    # Verify ownership
    if job.business.user_id != current_user.uid:
        return jsonify({'message': 'Unauthorized'}), 403

    return jsonify({
        'job_id': job.job_id,
        'title': job.title,
        'description': job.description,
        'requirements': job.requirements,
        'salary_range': job.salary_range,
        'job_type': job.job_type,
        'location': job.location,
        'longitude': job.longitude,
        'latitude': job.latitude,
        'status': job.status,
        'posted_date': job.posted_date.isoformat(),
        'applicant_count': len(job.applications)
    }), 200


@jobs_bp.route('/business/jobs/<int:job_id>', methods=['PUT'])
@login_required
def update_job_posting(job_id):
    """Update a job posting."""
    job = JobPosting.query.get(job_id)
    if not job:
        return jsonify({'message': 'Job not found'}), 404

    # Verify ownership
    if job.business.user_id != current_user.uid:
        return jsonify({'message': 'Unauthorized'}), 403

    data = request.get_json()

    job.title = data.get('title', job.title)
    job.description = data.get('description', job.description)
    job.requirements = data.get('requirements', job.requirements)
    job.salary_range = data.get('salary_range', job.salary_range)
    job.job_type = data.get('job_type', job.job_type)
    job.location = data.get('location', job.location)
    job.longitude = data.get('longitude', job.longitude)
    job.latitude = data.get('latitude', job.latitude)
    job.status = data.get('status', job.status)

    db.session.commit()

    return jsonify({'message': 'Job posting updated successfully'}), 200


@jobs_bp.route('/business/jobs/<int:job_id>', methods=['DELETE'])
@login_required
def delete_job_posting(job_id):
    """Delete a job posting."""
    job = JobPosting.query.get(job_id)
    if not job:
        return jsonify({'message': 'Job not found'}), 404

    # Verify ownership
    if job.business.user_id != current_user.uid:
        return jsonify({'message': 'Unauthorized'}), 403

    db.session.delete(job)
    db.session.commit()

    return jsonify({'message': 'Job posting deleted successfully'}), 200


@jobs_bp.route('/business/jobs/<int:job_id>/applicants', methods=['GET'])
@login_required
def get_job_applicants(job_id):
    """Get all applicants for a job posting."""
    job = JobPosting.query.get(job_id)
    if not job:
        return jsonify({'message': 'Job not found'}), 404

    # Verify ownership
    if job.business.user_id != current_user.uid:
        return jsonify({'message': 'Unauthorized'}), 403

    applicants = []
    for app in job.applications:
        applicants.append({
            'app_id': app.app_id,
            'user_id': app.user_id,
            'username': app.user.username,
            'email': app.user.email,
            'profile_picture': app.user.profile_picture,
            'status': app.status,
            'resume_url': app.resume_url,
            'applied_date': app.applied_date.isoformat()
        })

    return jsonify({'applicants': applicants}), 200


@jobs_bp.route('/business/jobs/<int:job_id>/applicants/<int:app_id>', methods=['GET'])
@login_required
def get_applicant_details(job_id, app_id):
    """Get applicant details including resume."""
    job = JobPosting.query.get(job_id)
    if not job:
        return jsonify({'message': 'Job not found'}), 404

    # Verify ownership
    if job.business.user_id != current_user.uid:
        return jsonify({'message': 'Unauthorized'}), 403

    app = JobApplication.query.get(app_id)
    if not app or app.job_id != job_id:
        return jsonify({'message': 'Application not found'}), 404

    user_profile = app.user.user_job_profile
    resume_url = app.resume_url or (user_profile.resume_url if user_profile else None)

    return jsonify({
        'app_id': app.app_id,
        'user_id': app.user_id,
        'username': app.user.username,
        'email': app.user.email,
        'profile_picture': app.user.profile_picture,
        'status': app.status,
        'resume_url': resume_url,
        'skills': user_profile.skills if user_profile else None,
        'education': user_profile.education if user_profile else None,
        'applied_date': app.applied_date.isoformat()
    }), 200


# ======================== CUSTOMER ENDPOINTS ========================

@jobs_bp.route('/profile', methods=['POST'])
@login_required
def create_user_job_profile():
    """Create or update customer job profile."""
    data = request.get_json()

    profile = current_user.user_job_profile
    if not profile:
        profile = UserProfile(user_id=current_user.uid)
        db.session.add(profile)

    skills = data.get('skills')
    education = data.get('education')
    resume_url = data.get('resume_url')

    if skills:
        profile.skills = skills
    if education:
        profile.education = education
    if resume_url:
        profile.resume_url = resume_url

    db.session.commit()

    return jsonify({
        'message': 'Job profile created/updated successfully',
        'profile_id': profile.profile_id
    }), 201


@jobs_bp.route('/profile', methods=['GET'])
@login_required
def get_user_job_profile():
    """Get customer job profile."""
    profile = current_user.user_job_profile
    if not profile:
        return jsonify({'message': 'Job profile not found'}), 404

    return jsonify({
        'profile_id': profile.profile_id,
        'skills': profile.skills,
        'education': profile.education,
        'resume_url': profile.resume_url,
        'created_at': profile.created_at.isoformat(),
        'updated_at': profile.updated_at.isoformat()
    }), 200


@jobs_bp.route('/ranked', methods=['POST'])
@login_required
def get_ranked_jobs():
    """Get ranked job recommendations based on user skills."""
    data = request.get_json() or {}
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    radius = data.get('radius_mi', 50)

    # Get user's job profile
    user_profile = current_user.user_job_profile
    user_skills = convert_skills_to_vector(user_profile.skills if user_profile else None)

    # Get all active jobs
    jobs = JobPosting.query.filter_by(status='active').all()

    ranked_jobs = []
    for job in jobs:
        # Calculate skill match
        job_vector = get_skill_vector(job.requirements)
        relevance = calculate_job_relevance(user_skills, job_vector)

        # Calculate distance decay
        distance_factor = calculate_distance_decay(longitude, latitude, job.longitude, job.latitude)

        # Combine scores
        final_score = relevance * distance_factor

        if job.latitude is None or job.longitude is None:
            distance_mi = 999999
        else:
            R = 3959
            lat1_rad = math.radians(latitude)
            lat2_rad = math.radians(job.latitude)
            delta_lat = math.radians(job.latitude - latitude)
            delta_lon = math.radians(job.longitude - longitude)

            a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
            c = 2 * math.asin(math.sqrt(a))
            distance_mi = R * c

        if distance_mi <= radius:
            ranked_jobs.append({
                'job_id': job.job_id,
                'title': job.title,
                'description': job.description,
                'requirements': job.requirements,
                'salary_range': job.salary_range,
                'job_type': job.job_type,
                'location': job.location,
                'longitude': job.longitude,
                'latitude': job.latitude,
                'business_name': job.business.business_name,
                'business_id': job.business.bid,
                'distance_miles': distance_mi,
                'score': final_score,
                'posted_date': job.posted_date.isoformat()
            })

    # Sort by score descending
    ranked_jobs.sort(key=lambda x: x['score'], reverse=True)

    return jsonify({'ranked_jobs': ranked_jobs}), 200


@jobs_bp.route('/apply', methods=['POST'])
@login_required
def apply_to_job():
    """Apply to a job (swipe right)."""
    data = request.get_json()
    job_id = data.get('job_id')

    job = JobPosting.query.get(job_id)
    if not job:
        return jsonify({'message': 'Job not found'}), 404

    # Check if already applied
    existing_app = JobApplication.query.filter_by(job_id=job_id, user_id=current_user.uid).first()
    if existing_app:
        return jsonify({'message': 'Already applied to this job'}), 400

    user_profile = current_user.user_job_profile
    resume_url = user_profile.resume_url if user_profile else None

    app = JobApplication(
        job_id=job_id,
        user_id=current_user.uid,
        resume_url=resume_url,
        status='applied'
    )
    db.session.add(app)
    db.session.commit()

    return jsonify({
        'message': 'Application submitted successfully',
        'app_id': app.app_id
    }), 201


@jobs_bp.route('/applications', methods=['GET'])
@login_required
def get_user_applications():
    """Get all job applications by current user."""
    applications = JobApplication.query.filter_by(user_id=current_user.uid).all()

    apps_data = []
    for app in applications:
        job = app.job_posting
        apps_data.append({
            'app_id': app.app_id,
            'job_id': job.job_id,
            'job_title': job.title,
            'business_name': job.business.business_name,
            'location': job.location,
            'status': app.status,
            'applied_date': app.applied_date.isoformat()
        })

    return jsonify({'applications': apps_data}), 200
