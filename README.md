# LuminX - Local Business Discovery Platform

> *Bringing light to local businesses. Find what shines nearby.*

Made by **Sahya Patel**, **Nathaniel George**, and **Eli Nahoum** for FBLA Coding and Programming 2026

---

## Overview

LuminX is a full-stack web application that helps users discover local businesses through an intuitive, personalized experience. The platform combines smart location matching, interactive mapping, AI-powered recommendations, and a coupon system to connect users with nearby businesses.

---

## Features

### Smart Location Matching (Findr)
- **Tinder-style swipe interface** for rapid location discovery
- Swipe right to like/favorite, swipe left to skip
- Personalized recommendations based on user preferences
- Real-time location data from TomTom API

### Interactive Mapping
- **TomTom SDK integration** for maps, POI search, and navigation
- POI category filters (restaurants, shopping, health, entertainment, etc.)
- Turn-by-turn voice navigation
- Live traffic data for route planning
- Favorite and visited location markers

### AI Chat Assistant
- **Google Gemini AI** powered local recommendations
- Context-aware suggestions based on current location
- Route planning and itinerary building
- Natural language queries for place discovery

### User Dashboard
- View favorite and recently visited locations
- AI-suggested locations carousel
- Saved coupons management
- Quick actions for reviews, routing, and favoriting

### Reviews System
- View and submit location reviews
- Star ratings with text content
- Community reviews alongside Google review samples
- Location-specific review aggregation

### Coupons & Discounts
- Personal coupons based on favorites and visited locations
- Nearby deal discovery
- Save and manage coupon offers
- Quick route-to-location from coupon cards

### User Authentication
- Secure registration with email verification
- Login with session management
- Password reset via email
- Profile picture upload
- Captcha protection (hCaptcha & Slider)

### Business & Admin Portals
- **Business Dashboard**: Manage jobs, events, coupons, and ads.
- **Admin Dashboard**: Oversee platform activities and approve ads.
- Certified local business badge for verified businesses.

### Jobs & Hiring
- Job board for discovering local opportunities.
- Business job manager for posting and tracking applications.
- User profiles with resume and skills for quick applications.

### Local Events & Promotions
- Discover nearby flash sales, live music, and trivia nights.
- Businesses can schedule and promote time-sensitive events.
- Advertisement banners to highlight local businesses.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| TypeScript | Type safety |
| Vite (rolldown-vite) | Build tool & dev server |
| TailwindCSS 4 | Styling |
| Framer Motion | Animations |
| React Router | Navigation |
| TomTom Web SDK | Maps & services |
| Google Gemini API | AI chat responses |
| Lucide React | Icons |

### Backend
| Technology | Purpose |
|------------|---------|
| Flask | Web framework |
| Flask-SQLAlchemy | ORM |
| Flask-Login | Session management |
| Flask-Bcrypt | Password hashing |
| Flask-Mail | Email sending |
| Flask-Migrate (Alembic) | Database migrations |
| Flask-CORS | Cross-origin requests |
| SQLite | Database |
| TomTom API | Location/POI data |

---

## Project Structure

```
├── frontend/                 # React + TypeScript frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── adBanner.tsx
│   │   │   ├── alerts.tsx
│   │   │   ├── body.tsx
│   │   │   ├── card.tsx
│   │   │   ├── hcaptchaWidget.tsx
│   │   │   ├── links.tsx
│   │   │   ├── localAiChatPopup.tsx
│   │   │   ├── locationReviewsPopup.tsx
│   │   │   ├── navbar.tsx
│   │   │   ├── proactiveAlerts.tsx
│   │   │   └── sliderCaptcha.tsx
│   │   ├── pages/            # Page components
│   │   │   ├── adminDashboard.tsx
│   │   │   ├── businessDashboard.tsx
│   │   │   ├── businessJobManager.tsx
│   │   │   ├── businessProfile.tsx
│   │   │   ├── coupons.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── events.tsx
│   │   │   ├── home.tsx      # Landing page
│   │   │   ├── jobFinder.tsx
│   │   │   ├── jobProfile.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── login.tsx     # Authentication
│   │   │   ├── map.tsx       # Interactive map
│   │   │   ├── profile.tsx
│   │   │   ├── register.tsx
│   │   │   ├── resetPassword.tsx
│   │   │   ├── reviews.tsx   # Reviews page
│   │   │   └── tinder.tsx    # Findr swipe interface
│   │   └── utils/            # Utility functions
│   │       ├── aiChatResponse.ts
│   │       ├── googleReviews.ts
│   │       ├── locationResolver.ts
│   │       └── tomtomPoiDetails.ts
│   └── package.json
│
├── backend/                  # Flask Python backend
│   ├── app/
│   │   ├── __init__.py       # App factory
│   │   ├── models.py         # Database models
│   │   ├── extensions.py     # Flask extensions
│   │   ├── admin/            # Admin dashboard routes
│   │   ├── ads/              # Advertisements routes
│   │   ├── auth/             # Authentication routes
│   │   ├── coupons/          # Coupon management routes
│   │   ├── events/           # Events routing
│   │   ├── jobs/             # Jobs & hiring routes
│   │   ├── loc/              # Location management routes
│   │   ├── rate/             # Rating/review routes
│   │   └── recc/             # Recommendation routes
│   ├── migrations/           # Alembic migrations
│   ├── instance/             # SQLite database
│   └── pyproject.toml        # Python dependencies
│
└── package.json              # Root scripts
```

---

## API Endpoints

### Authentication (`/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Create new account |
| POST | `/login` | User login |
| GET | `/logout` | User logout |
| GET | `/dashboard` | Get user profile |
| POST | `/change_picture` | Update profile picture |
| POST | `/request-password-reset` | Request password reset email |
| POST | `/reset-password/<token>` | Reset password with token |

### Locations (`/loc`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/<location_id>` | Get location details |
| GET | `/all` | Get all locations |
| POST | `/add` | Add new location |
| GET | `/favorites` | Get user's favorite locations |
| POST | `/<location_id>/favorite` | Add to favorites |
| POST | `/<location_id>/unfavorite` | Remove from favorites |
| GET | `/visited` | Get visited locations |
| POST | `/<location_id>/visit` | Mark location as visited |

### Reviews (`/rate`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/<user_id>` | Get user's reviews |
| GET | `/loc/<location_id>` | Get location average rating |
| GET | `/loc/<location_id>/reviews` | Get all location reviews |
| POST | `/review` | Submit a review |

### Recommendations (`/recc`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/nearby` | Get personalized nearby recommendations |

### Additional Modules
- `/admin` - Administrative actions and ad approvals
- `/ads` - Ad banner fetching and creation
- `/coupons` - Coupon generation and management
- `/events` - Local event discovery and posting
- `/jobs` - Job board, applications, and business job management

---

## Recommendation Algorithm

LuminX uses a **cosine similarity-based recommendation engine**:

1. **User Preference Vector**: Tracks interests across 14 categories (food, activities, outdoors, shopping, arts & culture, museums, nightlife, family-friendly, etc.)

2. **Location Vector**: Maps TomTom POI classifications to the same category space

3. **Relevance Score**: Calculated using cosine similarity between user preferences and location vectors

4. **Final Ranking**: Combines relevance (90%), popularity (10%), and distance decay factor

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.13+
- Poetry (Python package manager)

### Environment Variables

Create a `.env` file in the `backend/` directory:
```env
BACKEND_SECRET_KEY=your_secret_key
MAIL_PASSWORD=your_gmail_app_password
TOMTOM_API_KEY=your_tomtom_api_key
```

Create a `.env` file in the `frontend/` directory:
```env
VITE_TOMTOM_API_KEY=your_tomtom_api_key
VITE_GOOGLE_API_KEY=your_gemini_api_key
VITE_AUTH_BASE_URL=http://localhost:5000
```

### Installation & Development

```bash
# Install dependencies and set up databases
npm run setup

# Start both frontend and backend in development mode
npm run dev
```

This will:
- Install npm dependencies
- Set up Python virtual environment with Poetry
- Initialize and migrate the SQLite database
- Start the Flask backend on port 5000
- Start the Vite dev server for the frontend

### Individual Commands

```bash
# Run database migrations
npm run migrate

# Frontend only (from frontend/)
cd frontend && npm run dev

# Backend only (from backend/)
cd backend && poetry run python run.py
```

---

## Database Models

### User
- Authentication credentials (username, email, password hash)
- Profile picture
- Email verification status
- Preference vector (JSON) for recommendations
- Relationships: reviews, favorite locations, visited locations

### Location
- Name, address, coordinates
- Type and categories from TomTom
- Relationships: reviews, favorited by users, visited by users

### Review
- Star rating (1-5)
- Optional text content
- Linked to user and location

### Business
- Business profile linked to a user.
- Manages jobs, ads, coupons, and events.

### Jobs & Profiles
- `JobPosting`: Details of jobs offered by businesses.
- `UserProfile`: Candidate skills and resume details.
- `JobApplication`: User applications to jobs.

### Promotions & Ads
- `Advertisement`: Promotional banners with approval status.
- `Coupon`: Discount codes and deals from businesses.
- `Event`: Time-sensitive local events.

---

## License

ISC License

## Team repository links

This is Eli Nahoum's (`abominablepug`) companion repository for the FBLA project. Sahya Patel's project repository is [here](https://github.com/Patels711/fbla-coding-programming-2026), linking the two team copies together.
