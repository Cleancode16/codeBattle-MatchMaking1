require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const battleRoutes = require('./routes/battle');
const userRoutes = require('./routes/user');
const battleHandler = require('./socket/battleHandler');
const matchmakingHandler = require('./socket/matchmakingHandler');
const cors = require('cors');
const potdRoutes = require('./routes/potd');
const { startPOTDVerificationJob } = require('./jobs/potdVerification');

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', battleRoutes);
app.use('/api', userRoutes);
app.use('/api/potd', potdRoutes);

// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'CodeBattle Backend API is running' });
});

// Health check route
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is healthy' });
});

// Socket.IO
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Initialize handlers
battleHandler(io);
matchmakingHandler(io);

// Make io accessible to routes
app.set('io', io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Socket.io is ready for connections`);
    
    // Start POTD auto-verification job
    startPOTDVerificationJob();
});
