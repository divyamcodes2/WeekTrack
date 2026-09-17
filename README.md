# 🎯✨ WeekTrack — Your Personal Habit Tracker & Productivity Hub 🚀

WeekTrack is a full-stack habit tracker built to help you build consistency through a weekly checklist ✅, streaks 🔥, a Pomodoro focus timer ⏱️, and visual progress stats 📊 — all wrapped in one clean, responsive dashboard 📱💻. It combines a weekly checklist, streaks & momentum tracking, a Pomodoro focus timer, a statistics dashboard, a GitHub-style contribution heatmap, a daily reflection journal, and a searchable history timeline — all fully responsive across desktop and mobile, with dark/light mode support. 🔗 **Live App:** [your-deployed-link-here]

## 🌟 Features
📅 **Weekly Checklist** — track habits across a 7-day grid with daily completion percentages. 🔥 **Streaks & Momentum** — current/longest streak per habit + a combined daily momentum counter to keep you going. ⏱️ **Pomodoro Timer** — 25/5 focus sessions linkable to specific habits, with session history & total focus time. 📊 **Statistics Dashboard** — completion rate charts, category breakdowns, consistency scores. 🟩 **Contribution Heatmap** — GitHub-style heatmap showing 12 weeks of habit consistency at a glance. 📝 **Daily Reflection/Journal** — a lightweight notes field to log your thoughts each day. 🕰️ **History Timeline** — a searchable, filterable log of past days, habits completed, and journal entries. 🌙☀️ **Dark/Light Mode** — persisted theme preference. 📱💻 **Fully Responsive** — optimized for both desktop and mobile.

## 🛠️ Tech Stack
🎨 **Frontend:** ⚛️ React (Vite), 💨 Tailwind CSS, 📈 Recharts. ⚙️ **Backend:** 🟢 Node.js + Express, 🍃 MongoDB with Mongoose, 🔐 JWT-based authentication. ☁️ **Deployment:** 🌍 Frontend on Vercel, 🖥️ Backend on Render, 🗄️ Database on MongoDB Atlas.

## 📁 Project Structure

```
WeekTrack/
├── client/
│   ├── src/
│   │   ├── components/     🧩 Layout, Navbar
│   │   ├── context/        🔄 Auth, Theme providers
│   │   ├── features/
│   │   │   ├── auth/       🔐 Login, Signup, ProtectedRoute
│   │   │   ├── habits/     ✅ TodayView, WeekGrid, HabitForm, StreakBadge
│   │   │   ├── pomodoro/   ⏱️ PomodoroTimer
│   │   │   ├── settings/   ⚙️ SettingsPage
│   │   │   └── stats/      📊 StatsDashboard, Heatmap
│   │   ├── services/       🌐 Axios API client
│   │   └── utils/          🧰 Date helpers, constants
│   └── vite.config.js
├── server/
│   ├── config/              🗄️ DB connection
│   ├── controllers/        🎮 Auth, Habit, Completion, Pomodoro, Stats, Journal, Export
│   ├── middleware/         🛡️ Auth JWT, error handler, validation
│   ├── models/              🍃 User, Habit, Completion, PomodoroSession, JournalEntry
│   ├── routes/              🛣️ Express route definitions
│   ├── scripts/             🌱 Seed script
│   ├── utils/                🧮 Streak calculator, date helpers
│   └── server.js
└── README.md                📄 You are here
```


## 🚀 Getting Started (Local Setup)
✅ **Prerequisites:** 🟢 Node.js (LTS version) installed, 🍃 a MongoDB Atlas account (free tier works great!).

**1️⃣ Clone the repo**
```bash
git clone https://github.com/<your-username>/WeekTrack.git
cd WeekTrack
```

**2️⃣ Set up the backend ⚙️**
```bash
cd server
npm install
cp .env.example .env
```
Fill in `server/.env` with 👇

MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_random_secret
JWT_REFRESH_SECRET=your_random_secret
CLIENT_URL=http://localhost:5173
PORT=5000
NODE_ENV=development


Start the backend 🏃‍♂️
```bash
npm run dev
```

**3️⃣ Set up the frontend 🎨**
```bash
cd ../client
npm install
npm run dev
```

**4️⃣ Open the app 🌐** — Visit 👉 `http://localhost:5173` in your browser.

**5️⃣ (Optional) Seed demo data 🌱**
```bash
cd server
npm run seed
```
🔑 Login with: `demo@weektrack.com` / `demo1234`

## ☁️ Deployment
🎨 **Frontend** → [Vercel](https://vercel.com), root directory: `client`. ⚙️ **Backend** → [Render](https://render.com), root directory: `server`, build: `npm install`, start: `npm start`. 🗄️ **Database** → [MongoDB Atlas](https://mongodb.com/cloud/atlas), free M0 cluster. ⚠️ Environment variables must be set separately on each platform — check `.env.example` in both `client/` and `server/` for required keys.

## 📌 Roadmap / Future Ideas
🔔 Reminder notifications for unchecked habits, 📆 weekly/monthly auto-generated review summaries, 🏷️ habit categories/tags with filtering, 🎯 goal targets per habit (e.g. 5/7 days a week).

## 📄 License
🔒 This project is for personal use / learning purposes.

## 👨‍💻 Built With ❤️ By
**Divyam** 🚀