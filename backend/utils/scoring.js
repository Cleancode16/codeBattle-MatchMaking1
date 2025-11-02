const User = require('../models/User');

const POINTS = {
    WIN: 10,
    LOSS: 2,
    DRAW: 5
};

async function updatePlayerScore(userId, result) {
    try {
        let points = 0;
        
        switch(result) {
            case 'win':
                points = POINTS.WIN;
                break;
            case 'loss':
                points = POINTS.LOSS;
                break;
            case 'draw':
                points = POINTS.DRAW;
                break;
        }
        
        await User.findByIdAndUpdate(
            userId,
            { $inc: { score: points } },
            { new: true }
        );
        
        return points;
    } catch (error) {
        console.error('Error updating score:', error);
        return 0;
    }
}

async function updateBattleScores(battle) {
    try {
        const updates = [];
        
        if (battle.status === 'finished' && battle.winner) {
            // Update winner
            for (const player of battle.players) {
                const isWinner = player.userId.toString() === battle.winner.userId.toString();
                const result = isWinner ? 'win' : 'loss';
                updates.push(updatePlayerScore(player.userId, result));
            }
        } else if (battle.status === 'draw') {
            // Update all players with draw points
            for (const player of battle.players) {
                updates.push(updatePlayerScore(player.userId, 'draw'));
            }
        }
        
        await Promise.all(updates);
    } catch (error) {
        console.error('Error updating battle scores:', error);
    }
}

module.exports = {
    updatePlayerScore,
    updateBattleScores,
    POINTS
};
