# 🎯 CodeBattle - Competitive Programming Battle Platform

A real-time competitive programming platform where users battle against each other by solving Codeforces problems. Features automatic matchmaking, live leaderboards, and instant battle results!

---

## ✨ Features

### 🎮 Battle Modes
- **Quick Match** - Auto-match with players of similar skill (±200 rating range)
- **Custom Battle** - Create custom battles with specific settings
  - 2v2 (Duo)
  - 3v3 (Trio)
  - 4v4 (Squad)
- **Join by Code** - Join battles using 6-character room codes

### ⚔️ Real-Time Features
- Live matchmaking with timeout handling (2-minute max search)
- Real-time battle countdown timers
- Instant winner detection
- Live score updates
- Socket.io powered real-time communication

### 📊 Scoring System
- **Winner**: +10 points
- **Loser**: +2 points (participation)
- **Draw**: +5 points (all players)

### 🏆 Additional Features
- Global leaderboard
- Battle history with filters
- User profiles with Codeforces integration
- Problem verification before battle start
- Automatic problem fetching from Codeforces API
- Responsive design (mobile & desktop)

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v20.x or higher
- **MongoDB** v6.x or higher
- **npm** or **yarn**
- **Codeforces Account** (required for battles)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/CodeBattle.git
cd CodeBattle
```

2. **Install Backend Dependencies**
```bash
cd backend
npm install
```

3. **Install Frontend Dependencies**
```bash
cd ../frontend/client
npm install
```

4. **Environment Setup**

Create `.env` file in `backend` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/codebattle
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production
```

5. **Start MongoDB**
```bash
# Make sure MongoDB is running
mongod
```

6. **Run the Application**

**Backend (Terminal 1):**
```bash
cd backend
npm run dev
```

**Frontend (Terminal 2):**
```bash
cd frontend/client
npm run dev
```

7. **Access the Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

---

## 📁 Project Structure
CodeBattle/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── controllers/
│   │   └── battleController.js   # Battle CRUD operations
│   ├── models/
│   │   ├── User.js               # User schema
│   │   ├── Battle.js             # Battle schema
│   │   └── Room.js               # Room schema
│   ├── routes/
│   │   ├── auth.js               # Authentication routes
│   │   ├── battle.js             # Battle routes
│   │   ├── user.js               # User routes
│   │   └── room.js               # Room routes
│   ├── services/
│   │   └── codeforcesService.js  # Codeforces API integration
│   ├── socket/
│   │   ├── battleHandler.js      # Battle socket events
│   │   ├── matchmakingHandler.js # Matchmaking logic
│   │   ├── battleHelpers.js      # Battle utility functions
│   │   └── roomHandler.js        # Room socket events
│   ├── utils/
│   │   └── scoring.js            # Score calculation logic
│   ├── .env                      # Environment variables
│   ├── .gitignore
│   ├── package.json
│   └── server.js                 # Main server file
│
├── frontend/
│   └── client/
│       ├── public/
│       ├── src/
│       │   ├── components/
│       │   │   └── ProtectedRoute.jsx
│       │   ├── context/
│       │   │   ├── AuthContext.jsx
│       │   │   └── SocketContext.jsx
│       │   ├── pages/
│       │   │   ├── Signin.jsx
│       │   │   ├── Signup.jsx
│       │   │   ├── Homepage.jsx
│       │   │   ├── Profile.jsx
│       │   │   ├── Matchmaking.jsx
│       │   │   ├── JoinBattle.jsx
│       │   │   ├── Room.jsx
│       │   │   ├── BattleHistory.jsx
│       │   │   └── Leaderboard.jsx
│       │   ├── utils/
│       │   │   └── api.js
│       │   ├── App.jsx
│       │   ├── main.jsx
│       │   └── index.css
│       ├── .gitignore
│       ├── index.html
│       ├── package.json
│       ├── tailwind.config.js
│       └── vite.config.js
│
└── README.md
