const express = require('express');
const router = express.Router();
const potdService = require('../services/potdService');
const User = require('../models/User');

// Get today's POTD
router.get('/today', async (req, res) => {
    try {
        const potd = await potdService.getTodayPOTD();
        res.json({ success: true, potd });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get user's POTD progress
router.get('/progress/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const stats = await potdService.getUserPOTDStats(userId);
        
        const user = await User.findById(userId);
        const streakData = user?.streakData || {
            currentStreak: 0,
            longestStreak: 0,
            solvedDates: []
        };

        res.json({
            success: true,
            stats,
            streakData
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// NEW: Manually trigger verification (for testing/admin)
router.post('/verify-all', async (req, res) => {
    try {
        const result = await potdService.verifyAllSubmissions();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// NEW: Verify specific user's submission
router.post('/verify/:userId/:problemIndex', async (req, res) => {
    try {
        const { userId, problemIndex } = req.params;
        const result = await potdService.verifyUserSubmission(userId, parseInt(problemIndex));
        
        // If verified, also return updated streak data
        if (result.verified) {
            const user = await User.findById(userId);
            result.streakData = user?.streakData || {
                currentStreak: 0,
                longestStreak: 0,
                solvedDates: []
            };
        }
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
