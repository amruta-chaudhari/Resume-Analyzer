# ATS Resume Analyzer

A full-stack AI-powered resume analysis platform that helps job seekers optimize their resumes for Applicant Tracking Systems (ATS). Upload your resume, paste a job description, and get instant feedback on how well they match.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![React](https://img.shields.io/badge/react-18.3-61dafb)
![License](https://img.shields.io/badge/license-ISC-lightgrey)

---

## ✨ Features

### 🎯 Core Features
- **AI-Powered Resume Analysis** - Get detailed scoring and feedback comparing your resume to job descriptions
- **Multi-Model Support** - Choose from various free AI models via OpenRouter API
- **Resume Management** - Upload, store, and manage multiple resumes
- **Export Options** - Download resumes as PDF or Word documents
- **Analysis History** - Track and revisit all your previous analyses
- **Inline Resume Improvement Map** - Review suggestions directly on highlighted resume text in the analysis view
- **Rendered Resume Overlay Preview** - View hoverable improvement icons on top of real rendered resume pages using the original PDF when available

### 📊 Analysis Metrics
- **Overall Match Score** (0-100) - How well your resume matches the job
- **Keyword Analysis** - Matched and missing keywords from the job description
- **Formatting Score** - ATS compatibility plus structured diagnostics for contact info, headings, layout, bullets, and date consistency
- **Experience Relevance** - How your experience aligns with requirements
- **Actionable Advice** - Specific recommendations for improvement
- **Inline Improvement Anchors** - Context-aware highlights tied to concrete resume snippets
- **Real Page Overlay Markers** - Hoverable `i` markers mapped onto rendered PDF resume pages for page-accurate review

### 🎨 User Experience
- **Modern Glassmorphism UI** - Beautiful, responsive design
- **Dark/Light Theme** - Persistent theme preference
- **Mobile-Friendly** - Works great on all devices
- **Real-time Feedback** - Instant analysis results with deterministic formatting diagnostics and visual-preview aware review when a PDF is available
- **Recovery and Legal Paths** - Dedicated 404 page plus Privacy and Terms routes

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js + Express 5 | API Server |
| TypeScript | Type Safety |
| Prisma ORM | Database Access |
| SQLite (current Prisma schema/migrations) | Database |
| JWT + bcrypt | Authentication |
| OpenRouter API | AI Integration |
| Puppeteer | PDF Generation |

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| Vite | Build Tool |
| React Router 7 | Routing |
| Zustand | State Management |
| Tailwind CSS | Styling |
| Axios | HTTP Client |
| Lucide React | Icons |
| pdfjs-dist | PDF page rendering + text coordinates |

---

## 📁 Project Structure

```
├── ats-backend/          # Express API server
│   ├── src/
│   │   ├── index.ts      # App entry point
│   │   ├── middleware/   # Auth middleware
│   │   ├── routes/       # API routes
│   │   └── services/     # Business logic
│   ├── prisma/           # Database schema & migrations
│   └── uploads/          # User uploaded files
│
├── ats-frontend/         # React application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API functions
│   │   ├── stores/       # Zustand stores
│   │   └── hooks/        # Custom React hooks
│   └── public/           # Static assets
│
├── CLAUDE.md             # AI assistant guide
└── README.md             # This file
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- OpenRouter API key ([get one free](https://openrouter.ai/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/hppanpaliya/ATS-Resume-Analyzer.git
   cd ATS-Resume-Analyzer
   ```

2. **Set up the Backend**
   ```bash
   cd ats-backend
   npm install
   
   # Create environment file
   cp .env.example .env
   # Edit .env with your settings (see Environment Variables below)
   
   # Generate Prisma client (dev startup runs db push via predev)
   npm run prisma:generate
   npm run prisma:migrate
   
   # Start development server
   npm run dev
   ```

3. **Set up the Frontend**
   ```bash
   cd ats-frontend
   npm install
   
   # Create environment file (optional)
   echo "VITE_API_URL=http://localhost:3001" > .env
   
   # Start development server
   npm run dev
   ```

4. **Open the app**
    - Frontend: http://localhost:3000
    - Backend API: http://localhost:3001
    - Health Check: http://localhost:3001/api/health

---

## 🧭 Resume Overlay Modes

- **Inline Resume Improvement Map** uses text anchors from the saved analysis payload.
- **Rendered Resume Overlay Preview** renders the real resume pages underneath those results and places hoverable info markers on top of matched snippets.
- If the uploaded resume is already a PDF, the app uses the original file for page rendering.
- If the uploaded resume is not a PDF, the app falls back to a generated PDF preview so the user still gets a page-style overlay surface.
- If page-level coordinates cannot be resolved, the analysis page still shows the text-based review canvas and inline map.

---

## 🐳 Docker

Container usage is documented here:

- [Docker Guide](docs/DOCKER.md)
- [Docker TL;DR](docs/DOCKER_TLDR.md)

Quick start:

```bash
cp .env.docker.example .env.docker
# Edit .env.docker and add your OpenRouter key and JWT secrets
# If port 3000 is already in use locally, change APP_HOST_PORT in .env.docker

docker compose --env-file .env.docker up --build -d
curl http://localhost:3000/api/health
```

---

## ⚙️ Environment Variables

### Backend (`ats-backend/.env`)

```env
# Database (current committed schema/migrations are SQLite)
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:./dev.db

# For PostgreSQL, you must update Prisma datasource + migration baseline first

# JWT Secrets (generate your own!)
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# OpenRouter AI API
OPENROUTER_API_KEY=your-openrouter-api-key
# Optional legacy alias
OPENAI_API_KEY=
BASE_URL=https://openrouter.ai/api/v1
ANALYSIS_MODEL=openrouter/free

# Comma-separated allowed frontend origins
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173

# Server
PORT=3001
```

### Frontend (`ats-frontend/.env`)

```env
VITE_API_URL=http://localhost:3001
```

---

## 📖 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Revoke user refresh sessions |

`POST /api/auth/logout` accepts an optional `refreshToken` in the request body to revoke server-side refresh sessions.

### Resume Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze` | Analyze resume vs job description |
| GET | `/api/analyses` | List analysis history for current user |
| GET | `/api/analyses/:id` | Get a specific analysis record (includes `resumeReviewOverlay` and resume extracted text when available) |
| GET | `/api/analysis/:jobId/status` | Poll status of an analysis job |
| GET | `/api/usage/summary` | Get usage statistics for current user |
| GET | `/api/models` | List available AI models |
| POST | `/api/models/refresh` | Refresh model cache (admin) |
| GET | `/api/health/upstream` | Admin upstream health check |

### Job Descriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/job-descriptions` | List saved job descriptions |
| POST | `/api/job-descriptions` | Create a new job description |
| PUT | `/api/job-descriptions/:id` | Update an existing job description |
| DELETE | `/api/job-descriptions/:id` | Delete a job description |
| POST | `/api/job-descriptions/bulk-delete` | Bulk delete job descriptions |

### Resumes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/resumes` | List user resumes |
| POST | `/api/resumes` | Create resume |
| GET | `/api/resumes/:id` | Get resume details |
| PATCH | `/api/resumes/:id` | Update resume |
| PUT | `/api/resumes/:id` | Update resume (full payload) |
| DELETE | `/api/resumes/:id` | Delete resume |
| POST | `/api/resumes/bulk-delete` | Bulk delete resumes |
| POST | `/api/resumes/:id/analyze` | Analyze saved resume |
| POST | `/api/resumes/parse` | Parse resume text |
| POST | `/api/resumes/preview` | Generate resume preview |
| GET | `/api/resumes/:id/preview` | Get saved resume preview |
| GET | `/api/resumes/:id/file` | Download original file |
| GET | `/api/resumes/:id/file/metadata` | Get original file metadata |
| GET | `/api/resumes/:id/export/pdf` | Export as PDF |
| GET | `/api/resumes/:id/export/word` | Export as Word |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List templates |
| GET | `/api/templates/:id` | Get template |
| POST | `/api/templates/seed` | Seed default templates (admin) |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List users (admin) |
| GET | `/api/admin/users/:userId` | Get user details (admin) |
| PATCH | `/api/admin/users/:userId` | Update user fields (admin) |
| POST | `/api/admin/users/:userId/password` | Reset user password (admin) |
| POST | `/api/admin/users/:userId/revoke-sessions` | Revoke user sessions (admin) |
| POST | `/api/admin/users/bulk-update` | Bulk update users (admin) |
| POST | `/api/admin/users/bulk-revoke-sessions` | Bulk revoke sessions (admin) |
| POST | `/api/admin/users/bulk-delete` | Bulk soft delete users (admin) |
| DELETE | `/api/admin/users/:userId/resumes/:resumeId` | Delete a user resume (admin) |
| DELETE | `/api/admin/users/:userId/job-descriptions/:jobDescriptionId` | Delete a user job description (admin) |
| GET | `/api/admin/analytics/llm` | LLM analytics dashboard data (admin) |
| GET | `/api/admin/settings` | Get system settings (admin) |
| PATCH | `/api/admin/settings` | Update system settings (admin) |
| GET | `/api/admin/models` | Get model/provider settings (admin) |

### Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/queue/stats` | Queue statistics (admin) |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | API service health check |
| GET | `/api/health/upstream` | Upstream dependency health check (admin) |

---

## 🎮 Usage

### 1. Create an Account
Sign up with your email and password to get started.

### 2. Upload Your Resume
- Supported formats: PDF, DOCX
- Maximum file size: 5MB
- Text is automatically extracted for analysis

### 3. Add a Job Description
Paste the job description you're applying for. The AI will analyze how well your resume matches.

### 4. Get Your Analysis
Receive detailed feedback including:
- Overall match score
- Matched and missing keywords
- Formatting issues
- Experience relevance
- Specific recommendations
- Inline highlighted resume map for section-level improvements

### 5. Iterate and Improve
Use the actionable advice to update your resume and re-analyze until you achieve your target score.

---

## 🗺 Frontend Navigation

Public routes:
- `/login`
- `/signup`
- `/privacy`
- `/terms`
- `/404`

Protected dashboard routes:
- `/dashboard/analysis`
- `/dashboard/analysis/:id`
- `/dashboard/resumes`
- `/dashboard/job-descriptions`
- `/dashboard/history`

Admin routes:
- `/admin/users`
- `/admin/users/:userId`
- `/admin/system`
- `/admin/analytics`
- `/admin/analytics/events`

Route behavior notes:
- Legacy aliases `/analysis`, `/analysis/:id`, `/resumes`, and `/history` redirect into dashboard routes.
- Unknown routes render a dedicated not-found page with recovery links.

---

## 🔧 Development

### Backend Commands
```bash
npm run dev           # Start with nodemon (hot reload)
npm run build         # Compile TypeScript
npm start             # Run production build
npm run prisma:studio # Open database GUI
npm run prisma:migrate # Run migrations
npm test              # Run backend tests
npm run test:coverage # Run backend tests with coverage
```

### Frontend Commands
```bash
npm run dev           # Start Vite dev server
npm run build         # Build for production
npm run preview       # Preview production build
npm run test:unit     # Frontend unit tests (Vitest)
npm run test:smoke    # Fast Playwright smoke suite (chromium)
npm run test:integration # Playwright integration specs
npm run test:ci       # CI test flow (unit + smoke + integration)
```

### Database Migrations
```bash
cd ats-backend

# Create a new migration
npm run prisma:migrate

# Reset database (development only)
npx prisma migrate reset

# View/edit data
npm run prisma:studio
```

---

## 🚢 Deployment

### Production Build

1. **Build Frontend**
   ```bash
   cd ats-frontend
   npm run build
   # Copy build folder to ats-backend/build
   cp -r build ../ats-backend/build
   ```

2. **Build Backend**
   ```bash
   cd ats-backend
   npm run build
   ```

3. **Run Production**
   ```bash
   cd ats-backend
   npm start
   ```

The backend serves both the API and the React frontend from a single process.

### Environment for Production
- Current repo migrations are SQLite-based; if moving to PostgreSQL, create and validate a PostgreSQL migration baseline before deploy
- Set strong JWT secrets
- Configure proper CORS origins
- Use environment variables for all sensitive data

---

## 📊 Database Schema

The application uses 9 main database models:

- **User** - Authentication and profile
- **Resume** - User resumes with file storage
- **ResumeVersion** - Resume version history
- **Template** - Resume templates
- **JobDescription** - Saved job descriptions
- **Analysis** - ATS analysis results
- **AiUsage** - AI usage tracking
- **Subscription** - User subscriptions
- **AuditLog** - Activity logging

See `ats-backend/prisma/schema.prisma` for full schema.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the ISC License.

---

## 🙏 Acknowledgments

- [OpenRouter](https://openrouter.ai/) for AI model access
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Prisma](https://www.prisma.io/) for database management
- [Vite](https://vitejs.dev/) for blazing fast builds

---

## 📧 Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/hppanpaliya/ATS-Resume-Analyzer/issues) page.

---

**Made with ❤️ for job seekers everywhere**
