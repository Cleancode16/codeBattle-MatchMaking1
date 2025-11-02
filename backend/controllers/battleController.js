const Battle = require('../models/Battle');

// Get all battles
exports.getAllBattles = async (req, res) => {
    try {
        const battles = await Battle.find()
            .populate('players.userId', 'username email codeforcesHandle')
            .populate('createdBy', 'username email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            battles
        });
    } catch (error) {
        console.error('Get battles error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch battles'
        });
    }
};

// Get single battle
exports.getBattle = async (req, res) => {
    try {
        const battle = await Battle.findOne({ roomId: req.params.id })
            .populate('players.userId', 'username email codeforcesHandle')
            .populate('createdBy', 'username email');

        if (!battle) {
            return res.status(404).json({
                success: false,
                message: 'Battle not found'
            });
        }

        res.json({
            success: true,
            battle
        });
    } catch (error) {
        console.error('Get battle error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch battle'
        });
    }
};

// Create battle
exports.createBattle = async (req, res) => {
    try {
        const { mode, duration, problemRating, topics, createdBy } = req.body;

        if (!mode || !duration || !problemRating || !createdBy) {
            return res.status(400).json({
                success: false,
                message: 'Mode, duration, problem rating, and creator are required'
            });
        }

        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

        const battle = new Battle({
            roomId,
            mode,
            duration,
            problemRating,
            topics: topics || [],
            createdBy
        });

        await battle.save();

        res.status(201).json({
            success: true,
            message: 'Battle created successfully',
            battle
        });
    } catch (error) {
        console.error('Create battle error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create battle'
        });
    }
};

// Update battle
exports.updateBattle = async (req, res) => {
    try {
        const battle = await Battle.findOneAndUpdate(
            { roomId: req.params.id },
            req.body,
            { new: true }
        );

        if (!battle) {
            return res.status(404).json({
                success: false,
                message: 'Battle not found'
            });
        }

        res.json({
            success: true,
            message: 'Battle updated successfully',
            battle
        });
    } catch (error) {
        console.error('Update battle error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update battle'
        });
    }
};

// Delete battle
exports.deleteBattle = async (req, res) => {
    try {
        const battle = await Battle.findOneAndDelete({ roomId: req.params.id });

        if (!battle) {
            return res.status(404).json({
                success: false,
                message: 'Battle not found'
            });
        }

        res.json({
            success: true,
            message: 'Battle deleted successfully'
        });
    } catch (error) {
        console.error('Delete battle error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete battle'
        });
    }
};
