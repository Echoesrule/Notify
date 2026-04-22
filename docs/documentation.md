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

## 3. Data Model Hierarchy

The system follows a strict hierarchical structure:

```
┌─────────────────────────────────────────────────────────────┐
│                    INSTITUTION (University)                  │
│                   Has many Schools (Faculties)               │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────��───────────────────────────────────────────┐
│                   SCHOOL (Faculty/College)                   │
│                  Has many Courses/Departments                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  COURSE (Department/Program)                  │
│                   Has many Units (Subjects)                 │
│              Units linked via course_units table            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       UNIT (Subject/Module)                  │
│              Students choose which units to enroll            │
│              Users enroll via user_courses table             │
└─────────────────────────────────────────────────────────────┘
```

### User Enrollment Flow

1. User browses **Schools** → **Courses** → **Units**
2. User selects specific **Units** to enroll in (via `/api/users/enroll-units`)
3. Enrollment stored in `user_courses.unit_ids` as comma-separated unit IDs
4. User can enroll in multiple units across different courses

---

## 4. System Architecture

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
┌──���───────────────────────▼──────────────────────────────────┐
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

## 5. Database Schema

### Entity Relationship Diagram
```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ institutions │       │   schools    │       │   courses    │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │◄──────│ institution_id│    │ id (PK)      │
│ name         │       │ id (PK)      │────►│ school_id (FK)│
│ staff_domain │       │ name         │       │ name         │
│ student_domain│      │ created_at   │       │ code         │
│ created_at   │       └──────────────┘       │ description  │
└──────────────┘                             │ created_at   │
                                              └──────┬───────┘
                                                    │
                         ┌──────────────────────────┼───��───────────┐
                         │                          │               │
                         ▼                          ▼               ▼
              ┌──────────────┐       ┌──────────────────┐  ┌──────────────┐
              │ course_units │       │    units         │  │   notes     │
              │ (junction)  │       ├──────────────┤  │ ├──────────────┤
              ├──────────────┤       │ id (PK)      │  │ │ id (PK)    │
              │ course_id(FK)│       │ name        │  │ │ title      │
              │ unit_id (FK) │       │ code        │  │ │ description│
              └──────┬───────┘       │ is_common_unit│  │ │ file_path  │
                     │             │ created_at   │  │ │ unit_id(FK)│
                     │             └──────────────┘  │ │ user_id(FK)│
                     ▼                            │ │ downloads │
              ┌──────────────┐                     │ │ status   │
              │ user_courses │                     │ └──────────┘
              ├──────────────┤
              │ user_id(FK) │
              │ course_id(FK│
              │ unit_ids    │  ◄── Stores user's selected unit IDs
              │ status     │
              └────────────┘

              ┌──────────────┐
              │ notify_users │
              ├──────────────┤
              │ id (PK)     │
              │ email (UK)  │
              │ password    │
              │ name       │
              │ role       │
              │ school_id(FK)│
              │ pfp        │
              │ created_at  │
              └────────────┘
```

### Table Definitions

#### institutions
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| name | VARCHAR(255) | NOT NULL |
| staff_domain | VARCHAR(255) | NULLABLE |
| student_domain | VARCHAR(255) | NULLABLE |
| created_at | TIMESTAMP | DEFAULT NOW() |

#### schools
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| institution_id | INTEGER | FOREIGN KEY (institutions.id) |
| name | VARCHAR(100) | NOT NULL |
| created_at | TIMESTAMP | DEFAULT NOW() |

#### courses
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| name | VARCHAR(255) | NOT NULL |
| code | VARCHAR(50) | NULLABLE |
| description | TEXT | NULLABLE |
| school_id | INTEGER | FOREIGN KEY (schools.id) ON DELETE CASCADE |
| created_at | TIMESTAMP | DEFAULT NOW() |

#### units
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| name | VARCHAR(255) | NOT NULL |
| code | VARCHAR(50) | NULLABLE |
| description | TEXT | NULLABLE |
| dept_id | INTEGER | FOREIGN KEY (courses.id) ON DELETE CASCADE |
| is_common_unit | BOOLEAN | DEFAULT FALSE |
| created_at | TIMESTAMP | DEFAULT NOW() |

#### course_units (Junction Table)
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| course_id | INTEGER | FOREIGN KEY (courses.id) ON DELETE CASCADE |
| unit_id | INTEGER | FOREIGN KEY (units.id) ON DELETE CASCADE |
| UNIQUE | (course_id, unit_id) | |

The junction table enables many-to-many relationships between courses and units, allowing a unit to belong to multiple courses.

#### notify_users
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| name | VARCHAR(255) | NULLABLE |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password | VARCHAR(255) | NOT NULL |
| role | VARCHAR(50) | DEFAULT 'student' |
| school_id | INTEGER | FOREIGN KEY (schools.id) |
| pfp | VARCHAR(500) | NULLABLE |
| institution_id | INTEGER | FOREIGN KEY (institutions.id) |
| verified | BOOLEAN | DEFAULT FALSE |
| otp_code | VARCHAR(255) | NULLABLE |
| otp_expires_at | TIMESTAMP | NULLABLE |
| created_at | TIMESTAMP | DEFAULT NOW() |

#### user_courses (User Enrollment)
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| user_id | INTEGER | FOREIGN KEY (notify_users.id) ON DELETE CASCADE |
| course_id | INTEGER | FOREIGN KEY (courses.id) ON DELETE CASCADE |
| school_id | INTEGER | FOREIGN KEY (schools.id) |
| unit_ids | TEXT | Stores comma-separated enrolled unit IDs |
| status | VARCHAR(20) | DEFAULT 'active' |
| UNIQUE | (user_id, course_id) | |

#### notes
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| user_id | INTEGER | FOREIGN KEY (notify_users.id) ON DELETE CASCADE |
| school_id | INTEGER | FOREIGN KEY (schools.id) ON DELETE SET NULL |
| dept_id | INTEGER | FOREIGN KEY (courses.id) ON DELETE SET NULL |
| unit_id | INTEGER | FOREIGN KEY (units.id) ON DELETE SET NULL |
| title | VARCHAR(200) | NOT NULL |
| description | TEXT | NULLABLE |
| file_path | VARCHAR(255) | NULLABLE |
| is_common_unit | BOOLEAN | DEFAULT FALSE |
| downloads | INTEGER | DEFAULT 0 |
| status | VARCHAR(20) | DEFAULT 'pending' |
| created_at | TIMESTAMP | DEFAULT NOW() |

#### updates
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| user_id | INTEGER | FOREIGN KEY (notify_users.id) ON DELETE CASCADE |
| school_id | INTEGER | FOREIGN KEY (schools.id) ON DELETE SET NULL |
| course_id | INTEGER | FOREIGN KEY (courses.id) ON DELETE SET NULL |
| title | VARCHAR(200) | NOT NULL |
| content | TEXT | NOT NULL |
| created_at | TIMESTAMP | DEFAULT NOW() |

#### notifications
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| user_id | INTEGER | FOREIGN KEY (notify_users.id) ON DELETE CASCADE |
| message | VARCHAR(255) | NOT NULL |
| is_read | BOOLEAN | DEFAULT FALSE |
| created_at | TIMESTAMP | DEFAULT NOW() |

---

## 6. API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/user_auth/login | Login user | Public |
| POST | /api/user_auth/register | Register new user | Public |
| POST | /api/user_auth/verify-email | Verify email | Public |
| POST | /api/user_auth/resend-verification | Resend verification | Public |
| GET | /api/user_auth/me | Get current user | Token |
| PUT | /api/user_auth/update-profile | Update profile | Token |
| PUT | /api/user_auth/change-password | Change password | Token |
| POST | /api/user_auth/forgot-password | Forgot password | Public |
| POST | /api/user_auth/verify-reset-code | Verify reset code | Public |
| POST | /api/user_auth/check-institution | Check institution | Public |

### Schools
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/schools | List all schools with departments & units | Public |
| GET | /api/schools/:schoolId | Get school details | Public |
| POST | /api/schools | Create school | Admin |
| GET | /api/schools-legacy | Legacy schools endpoint | Public |

### Departments (Courses)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/departments | List all departments | Public |
| GET | /api/schools/:schoolId/departments | List school departments | Public |
| GET | /api/schools/:schoolId/departments/:deptId | Get department | Public |
| POST | /api/departments | Create department | Admin |

### Units
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/schools/:schoolId/departments/:deptId/units | List units with enrollment status | Public |
| GET | /api/schools/:schoolId/departments/:deptId/units/:unitId | Get unit details | Public |
| POST | /api/units | Create unit | Admin/Lecturer |
| GET | /api/units/:unitId/courses | Get courses linked to unit | Public |
| POST | /api/units/:unitId/link-courses | Link unit to courses | Admin |
| DELETE | /api/units/:id | Delete unit | Admin |

### User Enrollment
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/users/enroll | Enroll in course (all units) | Token |
| POST | /api/users/enroll-units | **Enroll in specific unit(s)** | Token |
| POST | /api/users/enroll-school | Join school | Token |
| GET | /api/users/:userId | Get user details | Token |
| GET | /api/users/:userId/enrollment | Get user enrollments | Token |

### Notes
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/notes | List all notes | Public |
| GET | /api/notes/:id | Get note details | Public |
| GET | /api/notes/my-notes | Get user's notes | Token |
| POST | /api/notes | Upload note | Token |
| DELETE | /api/notes/:id | Delete note | Token |
| GET | /api/notes/:id/preview | Preview PDF | Token |
| GET | /api/notes/:id/download | Download note | Token |

### Updates
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/updates | List updates | Public |
| GET | /api/updates/my-updates | Get user's updates | Token |
| POST | /api/updates | Create update | Token |

### System
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | / | Health check | Public |
| GET | /health | Health check | Public |
| GET | /api/db-health | Database health | Public |
| GET | /api/test | Test endpoint | Public |
| GET | /api/setup | Initialize database | Public |

### Debug (Development)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/check-tables | List database tables | Public |
| GET | /api/debug/counts | Get entity counts | Public |
| GET | /api/debug/dataService | Test data service | Public |

---

## 7. Unit Enrollment API Details

### Enroll in Specific Units

**Endpoint:** `POST /api/users/enroll-units`

**Request Body:**
```json
{
  "userId": 1,
  "schoolId": 1,
  "courseId": 1,
  "unitIds": [1, 3, 5]  // Array of unit IDs to enroll in
}
```

**Response:**
```json
{
  "message": "Successfully enrolled in units",
  "unitIds": [1, 3, 5]
}
```

### Get Units with Enrollment Status

**Endpoint:** `GET /api/schools/:schoolId/departments/:deptId/units`

Returns units with `enrolled` count and `isEnrolled` flag for current user.

**Query Parameters:**
- `userId` (optional): Check if user is enrolled

---

## 8. Security

### Authentication
- JWT tokens with 7-day expiration
- Password hashing using bcrypt (10 rounds)
- Token stored in localStorage on client

### Authorization
Role-based access control:
- **Student:** View notes, enroll in units, download
- **Lecturer:** All student permissions + upload notes, create updates
- **Admin:** All permissions + manage users, schools, courses, units

### API Security
- CORS configured for allowed origins
- Rate limiting (100 requests per 15 minutes)
- Auth rate limiting (5 attempts per 15 minutes)
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
PORT=3000
BREVO_API_KEY=<email-api-key>
SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-password>
```

---

## 9. Frontend Architecture

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

## 10. User Roles and Flows

### Student Flow
1. Register with email (auto-detected role based on institution domain)
2. Login to dashboard
3. Browse schools → departments → units
4. **Select specific units to enroll in**
5. View and download notes for enrolled units
6. Upload notes (if role permits)
7. View course updates

### Lecturer Flow
1. Register with institutional email (staff domain = lecturer role)
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

## 11. File Storage

### Upload Structure
```
backend/uploads/
├── notes/
│   ├── <timestamp>-<random>.pdf
│   └── ...
└── pfps/
    ├── <timestamp>-<random>.jpg
    └── ...
```

### Constraints
- Notes: PDF only, max 10MB
- Profile pictures: jpg/png, max 2MB
- Static file serving enabled

---

## 12. Deployment

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

## 13. Development Setup

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
1. Run `GET /api/setup` to initialize database
2. Seed data created automatically
3. Default test account: `student@test.com` / `password123`

---

## 14. Future Improvements

- [ ] Real-time notifications via WebSocket
- [ ] Search with filters (date, author, unit)
- [ ] Note ratings and reviews
- [ ] Discussion threads on notes
- [ ] Mobile responsive design
- [ ] Email verification via OTP
- [ ] Two-factor authentication
- [ ] Analytics dashboard for lecturers
- [ ] Bulk upload for notes
- [ ] Integration with LMS systems

---

## 15. Appendix

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
- Auth endpoints: 5 requests per 15 minutes

---

*Documentation generated: April 2026*