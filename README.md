# Cloud Native — Intelligent Document Management System

> **Cloud Native Refined** | Full-Stack Web Application

## **Abstract**

This project proposes a **Cloud-Based Document Workflow and Tracking System** integrated with mobile and AI-enabled technologies to improve document management in educational institutions, government offices, and organizations. 

### **Problem Statement**
Traditional document handling methods often involve manual processing, physical file movement, and limited tracking capabilities, leading to delays, inefficiency, and lack of transparency.

### **Proposed Solution**
The proposed system provides a centralized cloud platform where documents can be uploaded, securely stored, tracked, and processed through predefined approval workflows. Users can access the system through a web portal or mobile application to scan, upload, approve, reject, or forward documents in real time. Each document is assigned a unique ID and QR code for easy tracking and monitoring throughout its lifecycle.

The platform integrates a workflow engine that automates document routing between departments and sends instant notifications for pending actions. Role-based authentication and encrypted cloud storage ensure secure access and data protection. AI-based features such as Optical Character Recognition (OCR) and intelligent document classification can further automate document processing and reduce manual effort.

By combining cloud infrastructure, workflow automation, mobile accessibility, and AI integration, the system enhances operational efficiency, reduces paperwork, minimizes document loss, and improves accountability and transparency within organizations. The proposed solution is scalable, cost-effective, and suitable for modern digital administration systems.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, React Router v6, Axios, Lucide Icons |
| **Styling** | Custom CSS (Modern, clean academic/enterprise UI) |
| **Backend** | Node.js, Express.js, RESTful API |
| **Database** | MongoDB + Mongoose ODM |
| **Auth** | JWT + bcryptjs (RBAC: Admin / Manager / Staff) |
| **File Upload** | Multer (local storage → swap for S3) |
| **QR Code** | `qrcode` npm package |
| **Notifications** | In-app notification system (polling) |

---

## 📁 Project Structure

```
Cloud Native Refined/
├── backend/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js            # JWT protect + RBAC authorize
│   │   └── upload.js          # Multer file handling
│   ├── models/
│   │   ├── User.js            # User schema (role, dept, bcrypt)
│   │   ├── Document.js        # Document + audit log schema
│   │   └── Notification.js    # Notification schema
│   ├── routes/
│   │   ├── auth.js            # POST /register, POST /login, GET /me
│   │   ├── documents.js       # CRUD + approve/reject/escalate
│   │   ├── workflows.js       # Workflow rules config
│   │   ├── users.js           # User profile management
│   │   ├── admin.js           # Admin: stats, user mgmt, all docs
│   │   └── notifications.js   # Get, mark-read, mark-all-read
│   ├── .env                   # Environment variables
│   ├── server.js              # Express entry point
│   └── seed.js                # Demo data seeder
│
└── frontend/
    ├── public/
    │   └── index.html         # SEO meta tags + font preload
    └── src/
        ├── context/
        │   └── AuthContext.js  # JWT auth state + axios defaults
        ├── components/
        │   ├── Sidebar.js      # Nav + RBAC menu + user card
        │   └── Header.js       # Search + notifications + title
        ├── pages/
        │   ├── Login.js        # Register/Login (two-panel)
        │   ├── Dashboard.js    # Stats + recent docs + notifs
        │   ├── Documents.js    # Filtered & paginated list
        │   ├── DocumentDetail.js # Timeline + QR + actions
        │   ├── UploadDocument.js # Drag-drop + workflow picker
        │   ├── Notifications.js  # Full notification feed
        │   └── AdminPanel.js   # Analytics + users + workflows
        ├── App.js              # Routes + ProtectedRoute + Layout
        ├── index.js            # Entry (BrowserRouter + AuthProvider)
        └── index.css           # Full design system (800+ lines CSS)
```

---

## ⚡ Getting Started

### 1. Prerequisites
- Node.js v18+
- MongoDB (local or MongoDB Atlas)

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
# Edit .env — update MONGODB_URI if using Atlas

# Seed demo data (creates 5 users + 8 sample docs)
npm run seed

# Start development server
npm run dev
# → API running on http://localhost:5000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start React dev server
npm start
# → App running on http://localhost:3000
```

---

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@cloudnative.com | password123 |
| **Manager** | manager@cloudnative.com | password123 |
| **Staff** | staff@cloudnative.com | password123 |
| **HR Manager** | hr.manager@cloudnative.com | password123 |
| **Legal Staff** | legal@cloudnative.com | password123 |

> ⚠️ First user to register always gets **Admin** role automatically.

---

## 🔐 API Endpoints

### Authentication
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login, get JWT |
| GET | `/api/auth/me` | Private | Fetch own profile |

### Documents
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/api/documents/upload` | All roles | Upload with file |
| GET | `/api/documents` | All roles | List (filtered by role) |
| GET | `/api/documents/:id` | All roles | Document detail + audit |
| POST | `/api/documents/:id/approve` | Manager/Admin | Approve |
| POST | `/api/documents/:id/reject` | Manager/Admin | Reject with reason |
| POST | `/api/documents/:id/escalate` | Manager/Admin | Escalate |
| GET | `/api/documents/:id/qr` | All roles | Get QR code |
| GET | `/api/documents/track/:uniqueId` | All roles | Track by Doc ID |

### Admin
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/api/admin/stats` | Admin | System analytics |
| GET | `/api/admin/users` | Admin | All users (filtered) |
| PUT | `/api/admin/users/:id` | Admin | Update role/status |
| DELETE | `/api/admin/users/:id` | Admin | Deactivate user |
| GET | `/api/admin/documents` | Admin | All documents |

### Notifications
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/api/notifications` | Private | Get notifications |
| PUT | `/api/notifications/:id/read` | Private | Mark read |
| PUT | `/api/notifications/mark-all-read` | Private | Mark all read |

---

## 📋 Workflow Types

| Type | Steps | SLA | Approver Chain |
|------|-------|-----|----------------|
| **Fast Track** | 1 | 24 hrs | Manager |
| **Standard** | 2 | 72 hrs | Manager → Admin |
| **Multi-Level** | 3 | 120 hrs | Manager → Sr. Manager → Admin |
| **Board Approval** | 4 | 168 hrs | Full board chain |

---

## 🛡️ RBAC Roles

| Feature | Staff | Manager | Admin |
|---------|-------|---------|-------|
| View own documents | ✅ | ✅ | ✅ |
| View department docs | ❌ | ✅ | ✅ |
| View all documents | ❌ | ❌ | ✅ |
| Upload documents | ✅ | ✅ | ✅ |
| Approve / Reject | ❌ | ✅ | ✅ |
| Escalate documents | ❌ | ✅ | ✅ |
| Admin panel | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| View all analytics | ❌ | ❌ | ✅ |

---

## 🚀 Production Deployment

### Backend (Render / Railway)
- Build: `npm install`
- Start: `npm start`
- Set env vars: `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`, `NODE_ENV=production`

### Frontend (Vercel / Netlify)
- Build: `npm run build`
- Set env vars: `REACT_APP_API_URL=https://your-backend.render.com/api`

### Cloud Storage (AWS S3)
Replace Multer local storage in `middleware/upload.js` with `multer-s3`:
```bash
npm install multer-s3 @aws-sdk/client-s3
```
Add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET` to `.env`.

---

## 🗺️ Roadmap

- [ ] Email notifications (Nodemailer / SendGrid)
- [ ] Real-time updates (Socket.io)
- [ ] Deadline auto-escalation (cron job)
- [ ] AWS S3 file storage
- [ ] Document versioning
- [ ] Chat/comments per document
- [ ] Mobile app (React Native)
- [ ] SSO / OAuth integration

---

*Built with ❤️ as part of Cloud Native Refined*
