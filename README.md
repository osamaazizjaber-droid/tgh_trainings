# QR-Based Training Management System

A full-stack training management platform with QR attendance tracking, pre/post assessments, and structured evaluations.

## Tech Stack

- **Frontend**: React + Vite
- **Backend/DB**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Version Control**: GitHub

---

## 🚀 Quick Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your **Project URL** and **Anon Key** from Settings → API
3. Run `supabase_schema.sql` in **SQL Editor → New Query**

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Create Admin User

In Supabase → Authentication → Users → **Add User** (Email/Password).

### 4. Install & Run

```bash
npm install
npm run dev
```

Open: http://localhost:5173

---

## 📱 Application Routes

### Admin (English)
| Route | Description |
|-------|-------------|
| `/admin/login` | Admin login |
| `/admin` | Dashboard with stats |
| `/admin/projects` | Manage projects, activities, trainings |
| `/admin/trainings/:id` | QR codes, attendance, test results, evaluations, questions |
| `/admin/analytics` | Charts and insights |

### Attendee-Facing (Arabic RTL)
| Route | Description |
|-------|-------------|
| `/attendance?trainingId=X` | Attendance check-in / registration |
| `/pretest?trainingId=X` | Pre-test |
| `/posttest?trainingId=X` | Post-test |
| `/evaluation?trainingId=X` | Training evaluation |

---

## 🏗️ Database Schema

See `supabase_schema.sql` for the full schema with:
- 9 tables (projects, activities, trainings, users, attendance, questions, choices, answers, evaluations)
- Row Level Security (RLS) policies
- Pre/Post score comparison view

---

## 🌐 Deploy to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo
3. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy → get your live URL

---

## 📋 How to Use

### Admin Workflow
1. Login at `/admin/login`
2. Create a **Project** → **Activity** → **Training**
3. Enable pre/post tests and evaluation per training
4. Add questions with points to pre/post tests
5. Set QR expiry date and share QR codes with participants
6. Monitor attendance, test results, and evaluations in real-time
7. Export data as Excel

### Participant Workflow
1. Scan attendance QR → fill registration form (first time)
2. Scan QR again on Day 2/3 → auto check-in
3. Scan pre/post test QR → answer questions
4. Scan evaluation QR → rate the training

---

## 🔑 Business Rules

- Phone number must be unique per user
- Attendance per day is unique (no double check-ins)
- Pre-test and post-test can only be submitted once per user
- Evaluation can only be submitted once per user per training
- QR codes expire at admin-set date; only admin can extend

---

## 📁 Project Structure

```
src/
├── lib/
│   ├── supabase.js          # Supabase client
│   ├── iraqiLocations.js    # Iraqi governorates/districts data
│   └── export.js            # XLSX export utilities
├── pages/
│   ├── admin/
│   │   ├── Login.jsx        # Admin authentication
│   │   ├── Dashboard.jsx    # Stats overview
│   │   ├── Projects.jsx     # CRUD for hierarchy
│   │   ├── TrainingDetail.jsx # QR, attendance, tests, eval, questions
│   │   └── Analytics.jsx    # Charts and insights
│   └── attendee/
│       ├── AttendancePage.jsx # Arabic RTL check-in/registration
│       ├── TestPage.jsx     # Shared pre/post test component
│       ├── PreTestPage.jsx
│       ├── PostTestPage.jsx
│       └── EvaluationPage.jsx # Star rating evaluation
├── components/
│   ├── admin/AdminLayout.jsx # Sidebar navigation
│   └── shared/ProtectedRoute.jsx
├── App.jsx                  # Routing
└── index.css                # Global dark theme CSS
```
