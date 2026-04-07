# NOTIFY - University Note-Sharing Platform

## 1. System Overview

NOTIFY is a full-stack web application for university note-sharing, enabling students and lecturers to share, access, and manage educational materials across different schools, courses, and units within educational institutions.

### Purpose
- **Students:** Browse and download study notes, enroll in courses, bookmark materials
- **Lecturers:** Upload and share course materials, create announcements
- **Administrators:** Manage users, schools, courses, units, and system settings

---

## 2. Technology Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | Latest | Runtime environment |
| Express.js | 5.2.1 | Web framework |
| PostgreSQL | Cloud (Render) | Database |
| JWT | 9.0.3 | Authentication |
| bcrypt | 6.0.0 | Password hashing |
| Multer | 1.4.5-lts.1 | File uploads |
| Nodemailer | 8.0.3 | Email service |
| express-rate-limit | 8.3.1 | Rate limiting |

### Frontend
| Technology | Purpose |
|------------|---------|
| HTML5 | Structure |
| CSS3 | Styling |
| Vanilla JavaScript | Client-side logic |
| Font Awesome | Icons |
| Google Fonts | Typography (Inter, Fredoka) |

### Deployment
- **Backend:** Render.com (Node.js + PostgreSQL)
- **Frontend:** Vercel (Static hosting)

---

## 3. System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Vercel)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  Admin   │ │ Lecturer │ │ Student  │ │   Landing    │  │
│  │ Dashboard│ │  Portal  │ │ Dashboard│ │    Pages     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│                     BACKEND (Render.com)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Express    │  │   Routes    │  │     Middleware      │  │
│  │   Server    │  │  (REST API)  │  │ (Auth, CORS, Rate)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Routes    │  │ Controllers │  │    File Handler    │  │
│  │ /api/schools│  │ Data_fetcher│  │     (Multer)       │  │
│  │ /api/units  │  │             │  │                     │  │
│  │ /api/notes  │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   DATABASE (PostgreSQL)                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ notify_users │ schools │ courses │ units │ notes   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow
1. User interacts with frontend UI
2. Frontend sends HTTP request to backend API
3. Middleware validates JWT token and rate limits
4. Controller processes request, queries database
5. Response returned to frontend
6. UI updates with fetched data

---

## 4. Database Schema

### Entity Relationship Diagram
```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ institutions │       │   schools    │       │   courses    │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │       │ id (PK)      │
│ name         │       │ name         │       │ name         │
│ email_domain │       │ institution_id│───────│ school_id (FK)│
│ created_at   │       │ created_at   │       │ created_at   │
└──────────────┘       └──────────────┘       └──────┬───────┘
                                                    │
                                                    ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    notes     │       │    updates   │       │    units     │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │       │ id (PK)      │
│ title        │       │ title        │       │ name         │
│ description  │       │ content      │       │ code         │
│ file_path    │       │ course_id(FK)│       │ course_id(FK)│
│ unit_id (FK) │       │ author_id(FK)│       │ created_at   │
│ author_id(FK)│       │ created_at   │       └──────────────┘
│ created_at   │       └──────────────┘
│ downloads    │               ▲
└──────────────┘               │
         │                    │
         ▼                    │
┌──────────────────┐  ┌──────────────┐
│  notify_users    │  │ user_courses │
├──────────────────┤  ├──────────────┤
│ id (PK)          │  │ user_id (FK) │
│ email (UK)       │  │ course_id(FK)│
│ password (hash)  │  │ enrolled_at  │
│ name             │  └──────────────┘
│ role             │
│ school_id (FK)   │
│ profile_picture  │
│ created_at       │
└──────────────────┘
```

### Table Definitions

#### notify_users
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password | VARCHAR(255) | NOT NULL |
| name | VARCHAR(255) | NOT NULL |
| role | VARCHAR(50) | DEFAULT 'student' |
| school_id | INTEGER | FOREIGN KEY (schools.id) |
| profile_picture | VARCHAR(500) | NULLABLE |
| created_at | TIMESTAMP | DEFAULT NOW() |

#### schools
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| name | VARCHAR(255) | NOT NULL |
| institution_id | INTEGER | FOREIGN KEY (institutions.id) |
| created_at | TIMESTAMP | DEFAULT NOW() |

#### courses
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| name | VARCHAR(255) | NOT NULL |
| school_id | INTEGER | FOREIGN KEY (schools.id) |
| created_at | TIMESTAMP | DEFAULT NOW() |

#### units
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| name | VARCHAR(255) | NOT NULL |
| code | VARCHAR(50) | NOT NULL |
| course_id | INTEGER | FOREIGN KEY (courses.id) |
| created_at | TIMESTAMP | DEFAULT NOW() |

#### notes
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| title | VARCHAR(255) | NOT NULL |
| description | TEXT | NULLABLE |
| file_path | VARCHAR(500) | NOT NULL |
| unit_id | INTEGER | FOREIGN KEY (units.id) |
| author_id | INTEGER | FOREIGN KEY (notify_users.id) |
| downloads | INTEGER | DEFAULT 0 |
| created_at | TIMESTAMP | DEFAULT NOW() |

#### updates
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| title | VARCHAR(255) | NOT NULL |
| content | TEXT | NOT NULL |
| course_id | INTEGER | FOREIGN KEY (courses.id) |
| author_id | INTEGER | FOREIGN KEY (notify_users.id) |
| created_at | TIMESTAMP | DEFAULT NOW() |

#### institutions
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| name | VARCHAR(255) | NOT NULL |
| email_domain | VARCHAR(100) | NOT NULL |
| created_at | TIMESTAMP | DEFAULT NOW() |

#### user_courses
| Column | Type | Constraints |
|--------|------|-------------|
| user_id | INTEGER | FOREIGN KEY (notify_users.id) |
| course_id | INTEGER | FOREIGN KEY (courses.id) |
| enrolled_at | TIMESTAMP | DEFAULT NOW() |
| PRIMARY KEY | (user_id, course_id) |

#### notifications
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| user_id | INTEGER | FOREIGN KEY (notify_users.id) |
| message | TEXT | NOT NULL |
| type | VARCHAR(50) | DEFAULT 'info' |
| is_read | BOOLEAN | DEFAULT FALSE |
| created_at | TIMESTAMP | DEFAULT NOW() |

---

## 5. API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register | Register new user | Public |
| POST | /api/auth/login | Login user | Public |
| POST | /api/auth/change-password | Change password | Token |
| GET | /api/auth/profile | Get user profile | Token |

### Schools
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/schools | List all schools | Public |
| GET | /api/schools/:id | Get school details | Public |
| POST | /api/schools | Create school | Admin |
| PUT | /api/schools/:id | Update school | Admin |
| DELETE | /api/schools/:id | Delete school | Admin |

### Courses
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/courses | List courses | Public |
| GET | /api/courses/:id | Get course details | Public |
| POST | /api/courses | Create course | Admin |
| PUT | /api/courses/:id | Update course | Admin |
| DELETE | /api/courses/:id | Delete course | Admin |

### Units
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/units | List units | Public |
| GET | /api/units/:id | Get unit details | Public |
| POST | /api/units | Create unit | Admin/Lecturer |
| PUT | /api/units/:id | Update unit | Admin |
| DELETE | /api/units/:id | Delete unit | Admin |

### Notes
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/notes | List notes | Public |
| GET | /api/notes/:id | Get note details | Public |
| POST | /api/notes | Upload note | Token |
| PUT | /api/notes/:id | Update note | Token |
| DELETE | /api/notes/:id | Delete note | Token |
| GET | /api/notes/:id/download | Download note | Public |

### Updates
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/updates | List updates | Public |
| GET | /api/updates/:id | Get update | Public |
| POST | /api/updates | Create update | Token |
| PUT | /api/updates/:id | Update update | Token |
| DELETE | /api/updates/:id | Delete update | Token |

### Users
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/users | List users | Admin |
| GET | /api/users/:id | Get user | Token |
| PUT | /api/users/:id | Update user | Token |
| PUT | /api/users/:id/enroll | Enroll in course | Token |
| DELETE | /api/users/:id | Delete user | Admin |

### Admin
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/admin/stats | Get statistics | Admin |
| GET | /api/admin/users | List all users | Admin |
| GET | /api/admin/notes | List all notes | Admin |
| POST | /api/admin/institutions | Add institution | Admin |

### System
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | / | Health check | Public |
| GET | /health | Health check | Public |
| GET | /api/db-health | Database health | Public |
| POST | /api/setup | Initialize database | Public (first run) |

---

## 6. Security

### Authentication
- JWT tokens with 24-hour expiration
- Password hashing using bcrypt (10 rounds)
- Token stored in localStorage on client

### Authorization
Role-based access control:
- **Student:** View notes, enroll in courses, bookmark
- **Lecturer:** All student permissions + upload notes, create updates
- **Admin:** All permissions + manage users, schools, courses, units

### API Security
- CORS configured for allowed origins
- Rate limiting (100 requests per 15 minutes)
- Input validation on all endpoints
- File type validation for uploads (PDF only)
- File size limit: 10MB

### Environment Variables
```
JWT_SECRET=<secret-key>
DB_HOST=<database-host>
DB_PORT=5432
DB_NAME=<database-name>
DB_USER=<username>
DB_PASSWORD=<password>
FRONTEND_URL=<frontend-url>
NODE_ENV=production
```

---

## 7. Frontend Architecture

### Pages Structure
```
frontend/
├── index.html              # Redirect to dashboard
├── admin/
│   ├── admin.html          # Admin dashboard
│   ├── admin.js            # Admin logic
│   ├── admin.css           # Admin styles
│   ├── lecturer.html       # Lecturer portal
│   └── lecturer.js         # Lecturer logic
├── html/
│   ├── dashboard.html      # Main dashboard
│   ├── schools.html        # Schools listing
│   ├── courses.html        # Courses listing
│   ├── units.html          # Units listing
│   ├── notes.html          # Notes viewing
│   ├── updates.html        # News/updates
│   ├── profile.html        # User profile
│   ├── search.html         # Search page
│   └── settings.html       # Settings page
├── user_auth/
│   ├── login.html
│   ├── register.html
│   ├── login.js
│   └── register.js
├── js/
│   ├── config.js           # API configuration
│   ├── dashboard.js
│   ├── schools.js
│   ├── courses.js
│   ├── notes.js
│   └── ...
├── css/
│   ├── main.css
│   ├── dashboard.css
│   └── ...
└── images/
```

### Client-Side Flow
1. User lands on login/registration page
2. After successful login, JWT stored locally
3. Dashboard loads based on user role
4. Navigation via sidebar menu
5. API calls include JWT in Authorization header
6. File downloads handled via browser

---

## 8. User Roles and Flows

### Student Flow
1. Register with email (auto-detected role)
2. Login to dashboard
3. Browse schools → courses → units
4. View and download notes
5. Enroll in courses
6. Bookmark notes
7. View course updates

### Lecturer Flow
1. Register with institutional email
2. Login to dashboard
3. Access lecturer portal
4. Upload notes to units
5. Create course updates/announcements
6. Manage own uploads

### Admin Flow
1. Login to admin dashboard
2. View system statistics
3. Manage users (view, filter, delete)
4. Manage institutions
5. Manage schools, courses, units
6. View all content

---

## 9. File Storage

### Upload Structure
```
backend/uploads/
├── notes/
│   ├── <uuid>.pdf
│   └── ...
└── pfps/
    ├── <uuid>.jpg
    └── ...
```

### Constraints
- Notes: PDF only, max 10MB
- Profile pictures: jpg/png, max 2MB
- Static file serving enabled

---

## 10. Deployment

### Backend (Render.com)
1. Connect GitHub repository
2. Set environment variables
3. Build command: `node server.js`
4. Auto-deploy on push

### Frontend (Vercel)
1. Import repository
2. Set output directory: frontend
3. Build command: (empty)
4. Auto-deploy on push

### Production URLs
- Backend: `https://notify-sxkf.onrender.com`
- Frontend: `https://notify-frontend.vercel.app`

---

## 11. Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (local or cloud)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure database credentials
npm run dev  # Development with nodemon
```

### Frontend Setup
```bash
cd frontend
# Open index.html in browser
# Or serve with: npx serve .
```

### Initial Setup
1. Run `POST /api/setup` to initialize database
2. Seed data created automatically
3. Default admin account created

---

## 12. Future Improvements

- [ ] Real-time notifications
- [ ] Search with filters (date, author, unit)
- [ ] Note ratings and reviews
- [ ] Discussion threads on notes
- [ ] Mobile responsive design
- [ ] Email verification
- [ ] Two-factor authentication
- [ ] Analytics dashboard for lecturers
- [ ] Bulk upload for notes
- [ ] Integration with LMS systems

---

## 13. Appendix

### Sample Credentials
- Student: `student@test.com` / `password123`
- Lecturer: `lecturer@university.com` / `password123`
- Admin: `admin@notify.com` / `password123`

### API Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Success"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": "Error message"
}
```

### Rate Limits
- Default: 100 requests per 15 minutes
- Auth endpoints: 10 requests per 15 minutes

---

*Documentation generated: April 2026*