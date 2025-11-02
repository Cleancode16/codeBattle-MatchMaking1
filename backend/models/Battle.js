const mongoose = require('mongoose');

const battleSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    mode: {
        type: String,
        enum: ['duo', 'trio', 'squad'],
        required: true
    },
    duration: {
        type: Number, // in minutes
        required: true
    },
    problemRating: {
        type: Number,
        required: true
    },
    topics: [{
        type: String
    }],
    players: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String,
        codeforcesHandle: String,
        score: {
            type: Number,
            default: 0
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    problem: {
        contestId: Number,
        index: String,
        name: String,
        rating: Number,
        tags: [String],
        link: String
    },
    status: {
        type: String,
        enum: ['waiting', 'active', 'finished', 'draw'],
        default: 'waiting'
    },
    winner: {
        userId: mongoose.Schema.Types.ObjectId,
        username: String,
        codeforcesHandle: String
    },
    startTime: Date,
    endTime: Date,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Get max players based on mode
battleSchema.methods.getMaxPlayers = function() {
    const modeLimits = {
        duo: 2,
        trio: 3,
        squad: 4
    };
    return modeLimits[this.mode] || 2;
};

// Check if battle is ready to start
battleSchema.methods.isReadyToStart = function() {
    return this.players.length === this.getMaxPlayers() && this.status === 'waiting';
};

// Add player to battle
battleSchema.methods.addPlayer = function(userId, username, codeforcesHandle) {
    const exists = this.players.some(p => p.userId.toString() === userId.toString());
    const maxPlayers = this.getMaxPlayers();
    
    if (!exists && this.players.length < maxPlayers) {
        this.players.push({
            userId,
            username,
            codeforcesHandle,
            joinedAt: new Date()
        });
        return true;
    }
    return false;
};

// Remove player from battle
battleSchema.methods.removePlayer = function(userId) {
    this.players = this.players.filter(
        p => p.userId.toString() !== userId.toString()
    );
};

module.exports = mongoose.model('Battle', battleSchema);
