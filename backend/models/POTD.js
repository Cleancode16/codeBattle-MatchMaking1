const mongoose = require('mongoose');

const potdSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        unique: true,
        index: true
    },
    problems: [{
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            required: true
        },
        contestId: {
            type: Number,
            required: true
        },
        index: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        rating: {
            type: Number,
            required: true
        },
        tags: [String],
        link: {
            type: String,
            required: true
        }
    }],
    solvedBy: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        problemIndex: Number, // 0, 1, or 2 (easy, medium, hard)
        solvedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('POTD', potdSchema);
