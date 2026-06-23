# Notify

A university notes sharing platform where students can access, upload, and share study materials across faculties, courses, and units.

## Tech Stack

- **Backend:** Node.js, Express, PostgreSQL
- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Auth:** JWT, bcrypt, email verification (Brevo/SMTP)
- **File Uploads:** Multer (PDF notes, profile pictures)
- **Hosting:** Render (backend API), Vercel (frontend)

## Features

- User authentication (register, login, email verification, password reset)
- School/faculty browsing with hierarchical structure
- Course/department management
- Unit/subject browsing and enrollment
- Note upload, preview, and download (PDF)
- Updates/announcements per course
- User profiles with profile pictures
- Common unit sharing across courses
- Search and bookmarks
- Admin moderation (note approval)

## Database Schema

```
Institution (University)
  └── Schools (Faculties)
      └── Courses (Departments)
          └── Units (Subjects)
              └── Notes
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env  # configure database and auth settings
npm run dev           # starts on http://localhost:3000
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `PORT` | Server port (default: 3000) |
| `FRONTEND_URL` | Frontend URL for CORS |
| `BREVO_API_KEY` | Brevo API key for emails |
| `SMTP_HOST` | SMTP host (fallback) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |

### Database Setup

Visit `http://localhost:3000/api/setup` after starting the server to auto-create tables and seed sample data.

Or run the schema manually:

```bash
psql your_database_url < sql/schema.sql
```

### Frontend

Open `frontend/index.html` in a browser or serve it locally. The frontend auto-detects the API URL based on the hostname.

## Deployment

- **Backend:** Deploy to Render with a Node.js web service. Set all environment variables in the dashboard.
- **Frontend:** Deploy to Vercel. The `vercel.json` rewrites API and uploads requests to the Render backend.

## Project Structure

```
notify/
├── backend/
│   ├── server.js          # Main Express application and API routes
│   ├── db.js              # Database connection
│   ├── Data_fetcher/      # Data service layer
│   ├── user_auth/         # Authentication routes and logic
│   └── uploads/           # Uploaded files (notes, profile pics)
├── frontend/
│   ├── index.html         # Splash/redirect page
│   ├── user_auth/         # Login and register pages
│   ├── js/                # Client-side JavaScript
│   ├── css/               # Stylesheets
│   ├── images/            # Static images
│   └── vercel.json        # Vercel deployment configuration
├── sql/
│   ├── schema.sql         # Full database schema
│   └── update_descriptions.sql
└── scripts/               # Utility and test scripts
```
