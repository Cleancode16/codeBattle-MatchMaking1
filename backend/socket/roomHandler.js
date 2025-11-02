const Room = require('../models/Room');

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Create room
        socket.on('create-room', async (data) => {
            try {
                const { name, hostId, username, maxParticipants, isPrivate, password } = data;

                if (!name || !hostId || !username) {
                    socket.emit('error', { message: 'Room name, host ID, and username are required' });
                    return;
                }

                const roomId = Room.generateRoomId();

                const room = new Room({
                    roomId,
                    name,
                    host: hostId,
                    maxParticipants: maxParticipants || 10,
                    isPrivate: isPrivate || false,
                    password: password || null,
                    participants: [{
                        userId: hostId,
                        username,
                        joinedAt: new Date()
                    }]
                });

                await room.save();

                // Join socket room
                socket.join(roomId);
                socket.userId = hostId;
                socket.roomId = roomId;

                console.log(`Room created: ${roomId} by ${username}`);

                socket.emit('room-created', {
                    success: true,
                    message: 'Room created successfully',
                    room: {
                        roomId: room.roomId,
                        name: room.name,
                        host: hostId,
                        participants: room.participants,
                        maxParticipants: room.maxParticipants,
                        status: room.status
                    }
                });

                // Broadcast to all users that a new room is available
                io.emit('room-list-updated');

            } catch (error) {
                console.error('Create room error:', error);
                socket.emit('error', { message: 'Failed to create room' });
            }
        });

        // Join room
        socket.on('join-room', async (data) => {
            try {
                const { roomId, userId, username, password } = data;

                if (!roomId || !userId || !username) {
                    socket.emit('error', { message: 'Room ID, user ID, and username are required' });
                    return;
                }

                const room = await Room.findOne({ roomId });

                if (!room) {
                    socket.emit('error', { message: 'Room not found' });
                    return;
                }

                if (room.status === 'completed' || room.status === 'cancelled') {
                    socket.emit('error', { message: 'Room is no longer active' });
                    return;
                }

                if (room.participants.length >= room.maxParticipants) {
                    socket.emit('error', { message: 'Room is full' });
                    return;
                }

                // Check password for private rooms
                if (room.isPrivate && room.password !== password) {
                    socket.emit('error', { message: 'Incorrect password' });
                    return;
                }

                // Add participant
                const added = room.addParticipant(userId, username);

                if (!added) {
                    socket.emit('error', { message: 'Already in room or room is full' });
                    return;
                }

                await room.save();

                // Join socket room
                socket.join(roomId);
                socket.userId = userId;
                socket.roomId = roomId;

                console.log(`${username} joined room: ${roomId}`);

                socket.emit('room-joined', {
                    success: true,
                    message: 'Joined room successfully',
                    room: {
                        roomId: room.roomId,
                        name: room.name,
                        host: room.host,
                        participants: room.participants,
                        maxParticipants: room.maxParticipants,
                        status: room.status
                    }
                });

                // Notify other participants
                socket.to(roomId).emit('user-joined', {
                    userId,
                    username,
                    participants: room.participants
                });

                // Update room list
                io.emit('room-list-updated');

            } catch (error) {
                console.error('Join room error:', error);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        // Leave room
        socket.on('leave-room', async (data) => {
            try {
                const { roomId, userId, username } = data;

                if (!roomId || !userId) {
                    socket.emit('error', { message: 'Room ID and user ID are required' });
                    return;
                }

                const room = await Room.findOne({ roomId });

                if (!room) {
                    socket.emit('error', { message: 'Room not found' });
                    return;
                }

                // Remove participant
                room.removeParticipant(userId);

                // If room is empty or host left, delete room
                if (room.participants.length === 0 || room.host.toString() === userId.toString()) {
                    await Room.findOneAndDelete({ roomId });
                    
                    console.log(`Room deleted: ${roomId}`);
                    
                    // Notify all participants that room is closed
                    io.to(roomId).emit('room-closed', {
                        message: 'Room has been closed'
                    });
                } else {
                    await room.save();
                    
                    // Notify other participants
                    socket.to(roomId).emit('user-left', {
                        userId,
                        username,
                        participants: room.participants
                    });
                }

                // Leave socket room
                socket.leave(roomId);
                socket.userId = null;
                socket.roomId = null;

                console.log(`${username} left room: ${roomId}`);

                socket.emit('room-left', {
                    success: true,
                    message: 'Left room successfully'
                });

                // Update room list
                io.emit('room-list-updated');

            } catch (error) {
                console.error('Leave room error:', error);
                socket.emit('error', { message: 'Failed to leave room' });
            }
        });

        // Get room info
        socket.on('get-room-info', async (data) => {
            try {
                const { roomId } = data;

                const room = await Room.findOne({ roomId })
                    .populate('host', 'username email')
                    .populate('participants.userId', 'username email');

                if (!room) {
                    socket.emit('error', { message: 'Room not found' });
                    return;
                }

                socket.emit('room-info', {
                    success: true,
                    room
                });

            } catch (error) {
                console.error('Get room info error:', error);
                socket.emit('error', { message: 'Failed to get room info' });
            }
        });

        // Remove participant (host only)
        socket.on('remove-participant', async (data) => {
            try {
                const { roomId, userId, hostId } = data;

                const room = await Room.findOne({ roomId });

                if (!room) {
                    socket.emit('error', { message: 'Room not found' });
                    return;
                }

                // Check if requester is host
                if (room.host.toString() !== hostId.toString()) {
                    socket.emit('error', { message: 'Only host can remove participants' });
                    return;
                }

                room.removeParticipant(userId);
                await room.save();

                io.to(roomId).emit('user-left', {
                    userId,
                    participants: room.participants
                });

                io.emit('room-list-updated');

            } catch (error) {
                console.error('Remove participant error:', error);
                socket.emit('error', { message: 'Failed to remove participant' });
            }
        });

        // Delete room (host only)
        socket.on('delete-room', async (data) => {
            try {
                const { roomId, userId } = data;

                const room = await Room.findOne({ roomId });

                if (!room) {
                    socket.emit('error', { message: 'Room not found' });
                    return;
                }

                // Check if requester is host
                if (room.host.toString() !== userId.toString()) {
                    socket.emit('error', { message: 'Only host can delete room' });
                    return;
                }

                await Room.findOneAndDelete({ roomId });

                io.to(roomId).emit('room-closed', {
                    message: 'Room has been deleted by host'
                });

                io.emit('room-list-updated');

            } catch (error) {
                console.error('Delete room error:', error);
                socket.emit('error', { message: 'Failed to delete room' });
            }
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
            console.log('User disconnected:', socket.id);

            if (socket.roomId && socket.userId) {
                try {
                    const room = await Room.findOne({ roomId: socket.roomId });

                    if (room) {
                        room.removeParticipant(socket.userId);

                        if (room.participants.length === 0 || room.host.toString() === socket.userId.toString()) {
                            await Room.findOneAndDelete({ roomId: socket.roomId });
                            io.to(socket.roomId).emit('room-closed', {
                                message: 'Room has been closed'
                            });
                        } else {
                            await room.save();
                            io.to(socket.roomId).emit('user-left', {
                                userId: socket.userId,
                                participants: room.participants
                            });
                        }

                        io.emit('room-list-updated');
                    }
                } catch (error) {
                    console.error('Disconnect cleanup error:', error);
                }
            }
        });
    });
};
