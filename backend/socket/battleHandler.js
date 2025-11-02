const Battle = require('../models/Battle');
const codeforcesService = require('../services/codeforcesService');
const { updateBattleScores } = require('../utils/scoring');

const activeBattles = new Map(); // roomId -> { timer, checkInterval }

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected to battle:', socket.id);

        // Create battle
        socket.on('create-battle', async (data) => {
            try {
                const { mode, duration, problemRating, topics, userId, username, codeforcesHandle } = data;

                if (!mode || !duration || !problemRating || !userId || !username) {
                    socket.emit('error', { message: 'All fields are required' });
                    return;
                }

                if (!codeforcesHandle) {
                    socket.emit('error', { message: 'Codeforces handle is required to participate in battles' });
                    return;
                }

                const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

                const battle = new Battle({
                    roomId,
                    mode,
                    duration,
                    problemRating,
                    topics: topics || [],
                    createdBy: userId,
                    players: [{
                        userId,
                        username,
                        codeforcesHandle
                    }]
                });

                await battle.save();

                socket.join(roomId);
                socket.battleRoomId = roomId;
                socket.userId = userId;

                console.log(`Battle created: ${roomId} by ${username} (Mode: ${mode}, Rating: ${problemRating})`);

                socket.emit('battle-created', {
                    success: true,
                    message: 'Battle created successfully',
                    battle: {
                        roomId: battle.roomId,
                        mode: battle.mode,
                        duration: battle.duration,
                        problemRating: battle.problemRating,
                        topics: battle.topics,
                        players: battle.players,
                        status: battle.status
                    }
                });

                io.emit('battle-list-updated');

            } catch (error) {
                console.error('Create battle error:', error);
                socket.emit('error', { message: 'Failed to create battle' });
            }
        });

        // Join battle
        socket.on('join-battle', async (data) => {
            try {
                const { roomId, userId, username, codeforcesHandle } = data;

                if (!roomId || !userId || !username) {
                    socket.emit('error', { message: 'All fields are required' });
                    return;
                }

                if (!codeforcesHandle) {
                    socket.emit('error', { message: 'Codeforces handle is required to participate in battles' });
                    return;
                }

                const battle = await Battle.findOne({ roomId });

                if (!battle) {
                    socket.emit('error', { message: 'Battle not found' });
                    return;
                }

                if (battle.status !== 'waiting') {
                    socket.emit('error', { message: 'Battle already started' });
                    return;
                }

                const added = battle.addPlayer(userId, username, codeforcesHandle);

                if (!added) {
                    socket.emit('error', { message: 'Battle is full or you are already in it' });
                    return;
                }

                await battle.save();

                socket.join(roomId);
                socket.battleRoomId = roomId;
                socket.userId = userId;

                console.log(`${username} joined battle: ${roomId}`);

                socket.emit('battle-joined', {
                    success: true,
                    battle
                });

                io.to(roomId).emit('player-joined', {
                    userId,
                    username,
                    codeforcesHandle,
                    players: battle.players
                });

                // Check if ready to start
                if (battle.isReadyToStart()) {
                    io.to(roomId).emit('ready-to-start', {
                        message: 'All players joined! Battle will start soon...'
                    });

                    // Start battle automatically after 3 seconds
                    setTimeout(() => startBattle(io, roomId), 3000);
                }

                io.emit('battle-list-updated');

            } catch (error) {
                console.error('Join battle error:', error);
                socket.emit('error', { message: 'Failed to join battle' });
            }
        });

        // Leave battle
        socket.on('leave-battle', async (data) => {
            try {
                const { roomId, userId } = data;

                const battle = await Battle.findOne({ roomId });

                if (!battle) {
                    socket.emit('error', { message: 'Battle not found' });
                    return;
                }

                // Check if user is the host
                const isHost = battle.createdBy.toString() === userId.toString();

                if (isHost) {
                    // If host leaves, delete the entire battle
                    const participantIds = battle.players.map(p => p.userId.toString());
                    
                    await Battle.findOneAndDelete({ roomId });
                    cleanupBattle(roomId);

                    console.log(`Host left battle ${roomId}, deleting battle and removing ${participantIds.length} participants`);

                    // Notify all participants
                    io.to(roomId).emit('room-closed', {
                        message: 'Host has left the battle. Battle has been closed.',
                        reason: 'host_left'
                    });

                    // Force disconnect all sockets
                    const socketsInRoom = await io.in(roomId).fetchSockets();
                    for (const s of socketsInRoom) {
                        s.leave(roomId);
                        s.battleRoomId = null;
                        s.userId = null;
                    }

                    io.emit('battle-list-updated');

                } else {
                    // Regular participant leaving
                    if (battle.status === 'active') {
                        socket.emit('error', { message: 'Cannot leave an active battle' });
                        return;
                    }

                    battle.removePlayer(userId);

                    if (battle.players.length === 0) {
                        await Battle.findOneAndDelete({ roomId });
                        cleanupBattle(roomId);
                    } else {
                        await battle.save();
                        
                        io.to(roomId).emit('player-left', {
                            userId,
                            players: battle.players
                        });
                    }

                    io.emit('battle-list-updated');
                }

                socket.leave(roomId);
                socket.battleRoomId = null;
                socket.userId = null;

                socket.emit('battle-left', {
                    success: true,
                    message: 'Left battle successfully'
                });

            } catch (error) {
                console.error('Leave battle error:', error);
                socket.emit('error', { message: 'Failed to leave battle' });
            }
        });

        // Remove player (host only)
        socket.on('remove-player', async (data) => {
            try {
                const { roomId, userId, hostId } = data;

                const battle = await Battle.findOne({ roomId });

                if (!battle) {
                    socket.emit('error', { message: 'Battle not found' });
                    return;
                }

                // Check if requester is host
                if (battle.createdBy.toString() !== hostId.toString()) {
                    socket.emit('error', { message: 'Only host can remove players' });
                    return;
                }

                if (battle.status !== 'waiting') {
                    socket.emit('error', { message: 'Cannot remove players from active battle' });
                    return;
                }

                battle.removePlayer(userId);
                await battle.save();

                io.to(roomId).emit('player-left', {
                    userId,
                    players: battle.players
                });

                io.emit('battle-list-updated');

            } catch (error) {
                console.error('Remove player error:', error);
                socket.emit('error', { message: 'Failed to remove player' });
            }
        });

        // Delete battle (host only)
        socket.on('delete-battle', async (data) => {
            try {
                const { roomId, userId } = data;

                const battle = await Battle.findOne({ roomId });

                if (!battle) {
                    socket.emit('error', { message: 'Battle not found' });
                    return;
                }

                // Check if requester is host
                if (battle.createdBy.toString() !== userId.toString()) {
                    socket.emit('error', { message: 'Only host can delete battle' });
                    return;
                }

                // Get all participants before deleting
                const participantIds = battle.players.map(p => p.userId.toString());

                // Delete the battle
                await Battle.findOneAndDelete({ roomId });
                cleanupBattle(roomId);

                console.log(`Battle deleted by host: ${roomId}, removing ${participantIds.length} participants`);

                // Notify all participants in the room that battle has been closed
                io.to(roomId).emit('room-closed', {
                    message: 'Battle has been closed by the host. All participants have been removed.',
                    reason: 'host_exit'
                });

                // Force disconnect all sockets in this room
                const socketsInRoom = await io.in(roomId).fetchSockets();
                for (const s of socketsInRoom) {
                    s.leave(roomId);
                    s.battleRoomId = null;
                    s.userId = null;
                }

                // Update battle list
                io.emit('battle-list-updated');

                // Confirm to host
                socket.emit('battle-deleted', {
                    success: true,
                    message: 'Battle deleted successfully'
                });

            } catch (error) {
                console.error('Delete battle error:', error);
                socket.emit('error', { message: 'Failed to delete battle' });
            }
        });

        // Disconnect handler
        socket.on('disconnect', async () => {
            console.log('User disconnected from battle:', socket.id);

            if (socket.battleRoomId && socket.userId) {
                try {
                    const battle = await Battle.findOne({ roomId: socket.battleRoomId });

                    if (battle && battle.status === 'waiting') {
                        battle.removePlayer(socket.userId);

                        if (battle.players.length === 0) {
                            await Battle.findOneAndDelete({ roomId: socket.battleRoomId });
                            cleanupBattle(socket.battleRoomId);
                        } else {
                            await battle.save();
                        }

                        io.to(socket.battleRoomId).emit('player-left', {
                            userId: socket.userId,
                            players: battle.players
                        });

                        io.emit('battle-list-updated');
                    }
                } catch (error) {
                    console.error('Disconnect cleanup error:', error);
                }
            }
        });
    });

    // Start battle function
    async function startBattle(io, roomId) {
        try {
            const battle = await Battle.findOne({ roomId });

            if (!battle || battle.status !== 'waiting') return;

            // Get Codeforces handles
            const handles = battle.players.map(p => p.codeforcesHandle);

            // Fetch unsolved problem
            const problem = await codeforcesService.getUnsolvedProblem(
                handles,
                battle.problemRating,
                battle.topics
            );

            battle.problem = problem;
            battle.status = 'active';
            battle.startTime = new Date();
            battle.endTime = new Date(Date.now() + battle.duration * 60 * 1000);

            await battle.save();

            io.to(roomId).emit('battle-started', {
                problem,
                duration: battle.duration,
                endTime: battle.endTime
            });

            // Start timer and winner checking
            startBattleTimer(io, roomId, battle);

        } catch (error) {
            console.error('Start battle error:', error);
            io.to(roomId).emit('error', { message: 'Failed to start battle' });
        }
    }

    // Battle timer and winner detection
    function startBattleTimer(io, roomId, battle) {
        const durationMs = battle.duration * 60 * 1000;
        const startTime = battle.startTime;

        // Timer updates every 30 seconds
        const timerInterval = setInterval(() => {
            const elapsed = Date.now() - startTime.getTime();
            const remaining = Math.max(0, durationMs - elapsed);

            io.to(roomId).emit('battle-timer', {
                remaining: Math.floor(remaining / 1000), // in seconds
                elapsed: Math.floor(elapsed / 1000)
            });

            if (remaining <= 0) {
                clearInterval(timerInterval);
            }
        }, 30000);

        // Check for winner every 10 seconds
        const checkInterval = setInterval(async () => {
            await checkForWinner(io, roomId);
        }, 10000);

        // End battle after duration
        const battleTimer = setTimeout(async () => {
            await endBattle(io, roomId, 'draw');
        }, durationMs);

        activeBattles.set(roomId, { battleTimer, timerInterval, checkInterval });
    }

    // Check for winner
    async function checkForWinner(io, roomId) {
        try {
            const battle = await Battle.findOne({ roomId });

            if (!battle || battle.status !== 'active') return;

            const { contestId, index } = battle.problem;

            for (const player of battle.players) {
                const solved = await codeforcesService.checkProblemSolved(
                    player.codeforcesHandle,
                    contestId,
                    index,
                    battle.startTime
                );

                if (solved) {
                    await endBattle(io, roomId, 'finished', player);
                    return;
                }
            }
        } catch (error) {
            console.error('Check winner error:', error);
        }
    }

    // End battle
    async function endBattle(io, roomId, status, winner = null) {
        try {
            const battle = await Battle.findOne({ roomId });

            if (!battle || battle.status === 'finished' || battle.status === 'draw') return;

            battle.status = status;

            if (winner) {
                battle.winner = {
                    userId: winner.userId,
                    username: winner.username,
                    codeforcesHandle: winner.codeforcesHandle
                };
            }

            await battle.save();

            // Update scores
            await updateBattleScores(battle);

            // Emit event
            if (status === 'finished' && winner) {
                io.to(roomId).emit('battle-ended', {
                    winner,
                    battle
                });
            } else {
                io.to(roomId).emit('battle-draw', {
                    message: 'Time expired! No winner.',
                    battle
                });
            }

            // Cleanup
            cleanupBattle(roomId);
            io.emit('battle-list-updated');

        } catch (error) {
            console.error('End battle error:', error);
        }
    }

    // Cleanup battle resources
    function cleanupBattle(roomId) {
        const battleData = activeBattles.get(roomId);
        if (battleData) {
            if (battleData.battleTimer) clearTimeout(battleData.battleTimer);
            if (battleData.timerInterval) clearInterval(battleData.timerInterval);
            if (battleData.checkInterval) clearInterval(battleData.checkInterval);
            activeBattles.delete(roomId);
        }
    }
};
