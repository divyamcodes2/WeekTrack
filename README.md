# 🎯 WeekTrack — Your Personal Habit Tracker & Productivity Hub

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Gemini AI](https://img.shields.io/badge/Google%20Gemini-AI%20Coach-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Security](https://img.shields.io/badge/Security-AES--256--GCM-critical)](https://nodejs.org/api/crypto.html)

> 🌐 **Live Web App:** [https://week-track.vercel.app](https://week-track.vercel.app)  
> 🔗 **Live Backend API:** [https://weektrack.onrender.com](https://weektrack.onrender.com) (Health: [`/api/health`](https://weektrack.onrender.com/api/health))

**WeekTrack** is an intelligent, full-stack habit tracking and personal productivity platform designed to turn daily ambitions into compounding streaks. It combines a 7-day visual grid, streak momentum counters, a linked Pomodoro focus timer, comprehensive analytics, a daily reflection journal, a GitHub-style consistency heatmap, and an **AI Coach powered by Google Gemini** that adapts to your actual completion pace.

---

## 🌟 Key Features

### 1. 🤖 AI Habit Coach (Powered by Google Gemini)
* **Adaptive Momentum Monitoring:** Analyzes calendar completion rates and detects momentum interruptions early.
* **Momentum Nudges (1 Missed Day):** If you miss a single day, the AI Coach provides positive encouragement about compounding gains and the *"never miss twice"* rule without urging you to scale back.
* **Empathetic Course Correction (2+ Missed Days):** If multiple days are missed, the AI Coach generates empathetic coaching with an actionable schedule adjustment.
* **One-Click Apply:** Directly apply recommended schedule changes (e.g., scaling 7 days down to 4 days/week) with a single button.
* **Encrypted API Keys at Rest:** Users supply their own Gemini API key in Settings, which is encrypted using **AES-256-GCM** before database storage.
* **Intelligent Multi-Tier Caching:** AI advice is cached in MongoDB for 24 hours with automatic invalidation when completions change.

### 2. 📅 Weekly & Today Tracking
* **7-Day Interactive Grid:** Track daily habits Monday through Sunday with live completion percentages and responsive check buttons.
* **Today Focus View:** Zero in on habits scheduled for today, featuring quick toggle, category badges, and active streak counters.
* **Streak Freezes:** Apply a streak freeze (max 1 per habit per week) to preserve streaks during emergencies or rest days.

### 3. ⏱️ Integrated Pomodoro Focus Timer
* **Habit Linking:** Associate focus sessions with specific habits to track time invested.
* **Customizable Durations:** Configurable work (default 25m) and break (default 5m) intervals.
* **Audio Cues & Persistence:** Visual and audio notifications upon completion, with session records feeding into your stats.

### 4. 📊 Analytics & Insights Dashboard
* **This Week vs. Last Week:** Week-over-week rolling completion trend comparison with percentage point differences.
* **Best Time of Day:** Computes your peak performance window (Morning, Afternoon, Evening) based on actual same-day completion timestamps.
* **Streak Leaderboard:** Highlights your current longest active streaks across habits.
* **Consistency Score & Heatmap:** GitHub-style 12-week contribution heatmap displaying frequency intensity.
* **Best & Worst Performers:** Pinpoints habits that are thriving vs. those that need extra focus.

### 5. 📝 Daily Reflections & Searchable History
* **Daily Journal:** Lightweight notes (up to 500 characters) to log reflections and context for each day.
* **Chronological History Timeline:** Searchable and filterable history log by date range, habits, and status.

### 6. 🛡️ Enterprise-Grade Security & Production Hardening
* **Zero Plaintext API Keys:** AES-256-GCM encryption with authenticated tags (`iv:authTag:ciphertext`). Keys are only decrypted in-memory during Gemini requests.
* **Multi-Tier Rate Limiting:**
  * **Auth Limiter:** Max 10 attempts per 15 minutes per IP on `/login` and `/signup` to prevent brute-force attacks.
  * **AI Coach Quota Limiter:** Max 10 refreshes per hour per user to safeguard against Gemini API quota exhaustion.
  * **General API Limiter:** Max 100 requests per 15 minutes per IP across all endpoints with standard draft-7 rate-limit headers.
  * **Health Check Exemption:** `/api/health` is exempted from rate limiting for continuous uptime monitoring.
* **Security Headers (Helmet):** Configured with CSP, HSTS, X-Content-Type-Options (`nosniff`), X-Frame-Options (`SAMEORIGIN`), and Referrer Policy.
* **Response Compression:** Gzip response compression via `compression` middleware.
* **Robust Input Validation:** Server-side schema validation using `express-validator` on all routes with clean 400 JSON errors.
* **Optimized Database Indexing:** Compound indexes on `userId`, `date`, `habitId`, and `completedAt` across all Mongoose schemas.
* **Centralized Error Logging:** Context-aware logging that automatically sanitizes passwords, tokens, and API keys.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, Vanilla CSS + Tailwind CSS utilities, Lucide Icons, date-fns, Canvas Confetti |
| **Backend** | Node.js, Express 4, Mongoose 8 |
| **Database** | MongoDB Atlas |
| **AI / LLM** | Google Gemini (`@google/generative-ai`) |
| **Cryptography** | Node.js Built-in `crypto` (AES-256-GCM, SHA-256) |
| **Security & Middleware** | `helmet`, `express-rate-limit`, `compression`, `express-validator`, `bcryptjs`, `cookie-parser` |
| **Authentication** | JSON Web Tokens (JWT) stored in `httpOnly`, `SameSite` cookies with Bearer fallback |

---

## 📁 Project Structure

```
WeekTrack/
├── client/                          # React Frontend (Vite)
│   ├── public/                      # Static assets & icons
│   ├── src/
│   │   ├── components/              # Shared UI components (Navbar, Layout, Confetti)
│   │   ├── context/                 # AuthContext, ThemeContext
│   │   ├── features/
│   │   │   ├── auth/                # Login, Signup, ProtectedRoute
│   │   │   ├── habits/              # TodayView, WeekGrid, HabitForm, StreakBadge
│   │   │   ├── history/             # HistoryPage, HistoryFilter, Timeline
│   │   │   ├── insights/            # InsightsPage (AI Coach, Best Time of Day, Leaderboard)
│   │   │   ├── pomodoro/            # PomodoroTimer, TimerSettings
│   │   │   ├── settings/            # SettingsPage, GeminiKeyManager, Preferences
│   │   │   └── stats/               # StatsDashboard, HeatmapCalendar
│   │   ├── services/                # Axios instance & API client
│   │   ├── utils/                   # Date calculations, habit helpers
│   │   ├── App.jsx                  # Application routing & providers
│   │   ├── index.css                # Design system tokens, light/dark themes
│   │   └── main.jsx                 # Entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/                          # Express Backend API
│   ├── config/
│   │   └── db.js                    # MongoDB Atlas Mongoose connection
│   ├── controllers/
│   │   ├── authController.js        # Signup, login, logout, user settings
│   │   ├── completionController.js  # Toggle completion, streak freeze, streak recalculation
│   │   ├── exportController.js      # JSON / CSV habit export
│   │   ├── habitController.js       # CRUD habit operations & archiving
│   │   ├── insightsController.js    # AI Coach prompting, metrics computation, caching
│   │   ├── journalController.js     # Daily reflection journal upsert & retrieval
│   │   ├── pomodoroController.js    # Focus session persistence & logging
│   │   ├── statsController.js       # Heatmap & consistency calculations
│   │   └── userController.js        # Encrypted Gemini API key management
│   ├── middleware/
│   │   ├── auth.js                  # JWT cookie & Bearer token verification
│   │   ├── errorHandler.js          # Centralized error handler with sensitive data redaction
│   │   ├── rateLimiter.js           # Auth, AI refresh, and general rate limiters
│   │   └── validate.js              # express-validator result handler
│   ├── models/
│   │   ├── Completion.js            # Daily completion records (compound indexed)
│   │   ├── Habit.js                 # Habit definitions, frequencies, targets
│   │   ├── HabitInsight.js          # Cached AI insights & suggested adjustments
│   │   ├── JournalEntry.js          # Daily reflection entries
│   │   ├── PomodoroSession.js       # Logged work/break timer intervals
│   │   └── User.js                  # User schema with encrypted Gemini key & preferences
│   ├── routes/
│   │   ├── auth.js                  # /api/auth
│   │   ├── completions.js           # /api/completions
│   │   ├── export.js                # /api/export
│   │   ├── habits.js                # /api/habits
│   │   ├── history.js               # /api/history
│   │   ├── insights.js              # /api/insights
│   │   ├── journal.js               # /api/journal
│   │   ├── pomodoro.js              # /api/pomodoro
│   │   ├── stats.js                 # /api/stats
│   │   └── users.js                 # /api/users
│   ├── scripts/
│   │   └── seed.js                  # Database seed script for development
│   ├── utils/
│   │   ├── crypto.js                # AES-256-GCM encryption/decryption utilities
│   │   ├── dateHelpers.js           # ISO week calculation & timezone date utilities
│   │   ├── insightCalculator.js     # Threshold evaluator (0 miss, 1 miss nudge, 2+ miss attention)
│   │   └── streakCalculator.js      # Dynamic streak calculation engine
│   ├── .env.example                 # Environment variable template
│   ├── package.json
│   └── server.js                    # Express app configuration & server entry
│
└── README.md
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **MongoDB**: A local instance or free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
* **Google Gemini API Key**: Free key from [Google AI Studio](https://aistudio.google.com/) *(optional; users can add it via Settings in the UI)*

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/<your-username>/WeekTrack.git
cd WeekTrack
```

---

### Step 2: Configure the Backend
1. Navigate into the `server` folder and install dependencies:
   ```bash
   cd server
   npm install
   ```

2. Create a `.env` file from the template:
   ```bash
   cp .env.example .env
   ```

3. Fill in the required variables in `server/.env`:
   ```ini
   # Database
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/weektrack?retryWrites=true&w=majority

   # JWT Secrets
   JWT_SECRET=your_long_random_jwt_secret_here
   JWT_REFRESH_SECRET=your_long_random_jwt_refresh_secret_here

   # Encryption Secret (Required for AES-256-GCM encryption of user API keys)
   ENCRYPTION_SECRET=your_super_secret_32_or_more_character_string_here

   # Server & Client Configuration
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173

   # Optional Fallback Gemini Key (users normally add their own via Settings)
   GEMINI_API_KEY=
   ```

4. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend will be running on `http://localhost:5000`.

---

### Step 3: Configure the Frontend
1. Open a new terminal, navigate into the `client` folder, and install dependencies:
   ```bash
   cd ../client
   npm install
   ```

2. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```
   Ensure `VITE_API_URL` points to your backend:
   ```ini
   VITE_API_URL=http://localhost:5000/api
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173`.

---

### Step 4: Seed Demo Data (Optional)
To test with pre-populated habits, completions, streaks, and journal entries:
```bash
cd server
npm run seed
```
* **Demo Account:** `demo@weektrack.com`
* **Demo Password:** `demo1234`

---

## 📡 API Reference

### Health & Monitoring
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service uptime and status check | None (Exempt from rate limits) |

### Authentication & User
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register new user (Rate limited: 10/15m) | None |
| `POST` | `/api/auth/login` | Log in and receive httpOnly cookie (Rate limited: 10/15m) | None |
| `POST` | `/api/auth/logout` | Clear auth cookie | Required |
| `GET` | `/api/auth/me` | Get current user profile | Required |
| `PUT` | `/api/auth/settings` | Update streak threshold, theme, and timer defaults | Required |
| `PUT` | `/api/users/gemini-key` | Save Gemini API key (AES-256-GCM encrypted) | Required |
| `GET` | `/api/users/gemini-key/status` | Get masked Gemini key status (`••••1234`) | Required |
| `DELETE` | `/api/users/gemini-key` | Remove saved Gemini API key | Required |

### Habits & Completions
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/habits` | Get all active habits | Required |
| `POST` | `/api/habits` | Create a new habit | Required |
| `GET` | `/api/habits/:id` | Get detailed habit record | Required |
| `PUT` | `/api/habits/:id` | Update habit properties | Required |
| `PATCH` | `/api/habits/:id/archive` | Toggle habit archive status | Required |
| `POST` | `/api/completions` | Toggle habit completion for a date | Required |
| `GET` | `/api/completions` | Query completions for a date range | Required |
| `POST` | `/api/completions/freeze` | Apply weekly streak freeze | Required |

### Insights & AI Coach
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/insights` | Retrieve AI habit insights (cached 24h) | Required |
| `GET` | `/api/insights/metrics` | Retrieve Best Time of Day, Leaderboard, & Week stats (cached 1h) | Required |
| `POST` | `/api/insights/refresh` | Force recalculation bypassing cache (Rate limited: 10/hr) | Required |
| `PATCH` | `/api/insights/:habitId/dismiss` | Dismiss an AI insight recommendation | Required |

### Productivity, Stats & History
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/pomodoro` | Log a completed Pomodoro session | Required |
| `GET` | `/api/pomodoro` | Get Pomodoro history | Required |
| `PUT` | `/api/journal/:date` | Upsert daily reflection journal entry | Required |
| `GET` | `/api/journal/:date` | Get journal entry for a specific date | Required |
| `GET` | `/api/stats/overview` | Get consistency stats & heatmap data | Required |
| `GET` | `/api/history` | Search and filter chronological habit history | Required |
| `GET` | `/api/export/json` | Export user data as JSON | Required |
| `GET` | `/api/export/csv` | Export user completions as CSV | Required |

---

## 🔒 Security Best Practices Implemented

1. **At-Rest Encryption:** User API keys are symmetrically encrypted using Node's `crypto` with `aes-256-gcm`. The initialization vector (IV) and authentication tag are uniquely generated per key.
2. **In-Memory Decryption:** Keys are decrypted solely in-memory within the controller scope at the moment of Gemini execution, never stored in plaintext variables, logs, or responses.
3. **Sensitive Data Redaction:** Centralized error logging recursively redacts passwords, tokens, API keys, and authorization headers before logging to `stdout`/`stderr`.
4. **Credential Brute-Force Defense:** Auth routes restrict IP access to a strict 10 requests per 15 minutes.
5. **DDoS & Header Hardening:** Helmet defaults, response compression, payload body limits (1 MB), and general API throttling.

---

## ☁️ Deployment Guide

### Deploying Frontend (Vercel)
1. Import the repository in [Vercel](https://vercel.com).
2. Set **Root Directory** to `client`.
3. Framework Preset: **Vite**.
4. Set Environment Variable:
   * `VITE_API_URL` = `https://weektrack.onrender.com/api`
5. Deploy.

### Deploying Backend (Render)
1. Create a **Web Service** in [Render](https://render.com).
2. Set **Root Directory** to `server`.
3. Environment: **Node**.
4. Build Command: `npm install`.
5. Start Command: `npm start`.
6. Add Environment Variables:
   * `MONGODB_URI` = Your MongoDB Atlas connection string
   * `JWT_SECRET` = A strong random secret
   * `JWT_REFRESH_SECRET` = A strong random secret
   * `ENCRYPTION_SECRET` = A strong 32+ character random string
   * `CLIENT_URL` = `https://week-track.vercel.app`
   * `NODE_ENV` = `production`
   * `PORT` = `5000` (Render handles port routing)
7. Health Check Path: `/api/health`.

---

## 📄 License

This project is licensed under the MIT License — feel free to use and modify for personal or commercial projects.

---

## 👨‍💻 Built By

Crafted with dedication by **Divyam**. If you found this project helpful, feel free to give it a ⭐ on GitHub!