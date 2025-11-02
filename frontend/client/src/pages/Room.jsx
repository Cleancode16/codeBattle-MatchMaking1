import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';

const Room = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { socket } = useSocket();
    
    const [room, setRoom] = useState(null);
    const [battle, setBattle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState(null);

    useEffect(() => {
        fetchRoomInfo();
    }, [roomId]);

    useEffect(() => {
        if (!socket) return;

        // Socket event listeners
        socket.on('room-info', handleRoomInfo);
        socket.on('battle-info', handleBattleInfo);
        socket.on('user-joined', handleUserJoined);
        socket.on('user-left', handleUserLeft);
        socket.on('player-joined', handlePlayerJoined);
        socket.on('player-left', handlePlayerLeft);
        socket.on('room-updated', fetchRoomInfo);
        socket.on('battle-updated', fetchRoomInfo);
        socket.on('ready-to-start', handleReadyToStart);
        socket.on('battle-started', handleBattleStarted);
        socket.on('battle-timer', handleBattleTimer);
        socket.on('battle-ended', handleBattleEnded);
        socket.on('battle-draw', handleBattleDraw);
        socket.on('room-closed', handleRoomClosed);
        socket.on('error', handleError);

        // Request initial room info
        socket.emit('get-room-info', { roomId });

        return () => {
            socket.off('room-info');
            socket.off('battle-info');
            socket.off('user-joined');
            socket.off('user-left');
            socket.off('player-joined');
            socket.off('player-left');
            socket.off('room-updated');
            socket.off('battle-updated');
            socket.off('ready-to-start');
            socket.off('battle-started');
            socket.off('battle-timer');
            socket.off('battle-ended');
            socket.off('battle-draw');
            socket.off('room-closed');
            socket.off('error');
        };
    }, [socket, roomId]);

    const fetchRoomInfo = async () => {
        try {
            console.log('Fetching room info for:', roomId);
            
            // Try battle first since we removed regular rooms
            const battleResponse = await api.get(`/battles/${roomId}`);
            if (battleResponse.data.success) {
                console.log('Battle found:', battleResponse.data.battle);
                setBattle(battleResponse.data.battle);
                setLoading(false);
                return;
            }
        } catch (error) {
            console.error('Error fetching battle info:', error);
            
            // Fallback to regular room
            try {
                const roomResponse = await api.get(`/rooms/${roomId}`);
                if (roomResponse.data.success) {
                    console.log('Room found:', roomResponse.data.room);
                    setRoom(roomResponse.data.room);
                    setLoading(false);
                    return;
                }
            } catch (roomError) {
                console.error('Error fetching room info:', roomError);
                setError('Room not found');
                setLoading(false);
            }
        }
    };

    const handleRoomInfo = (data) => {
        if (data.success) {
            setRoom(data.room);
            setLoading(false);
        }
    };

    const handleBattleInfo = (data) => {
        if (data.success) {
            setBattle(data.battle);
            setLoading(false);
        }
    };

    const handleUserJoined = (data) => {
        setRoom((prev) => ({
            ...prev,
            participants: data.participants
        }));
    };

    const handleUserLeft = (data) => {
        setRoom((prev) => ({
            ...prev,
            participants: data.participants
        }));
    };

    const handlePlayerJoined = (data) => {
        setBattle((prev) => ({
            ...prev,
            players: data.players
        }));
    };

    const handlePlayerLeft = (data) => {
        setBattle((prev) => ({
            ...prev,
            players: data.players
        }));
    };

    const handleReadyToStart = (data) => {
        alert(data.message);
    };

    const handleBattleStarted = (data) => {
        setBattle((prev) => ({
            ...prev,
            status: 'active',
            problem: data.problem,
            startTime: new Date(),
            endTime: new Date(data.endTime)
        }));
    };

    const handleBattleTimer = (data) => {
        setTimeRemaining(data.remaining);
    };

    const handleBattleEnded = (data) => {
        setBattle(data.battle);
        alert(`Battle ended! Winner: ${data.winner.username}`);
    };

    const handleBattleDraw = (data) => {
        setBattle(data.battle);
        alert(data.message);
    };

    const handleRoomClosed = () => {
        alert('Room has been closed');
        navigate('/home');
    };

    const handleError = (error) => {
        alert(error.message);
    };

    const handleLeaveRoom = () => {
        if (!confirm('Are you sure you want to leave?')) return;

        if (battle) {
            socket.emit('leave-battle', {
                roomId,
                userId: user.id
            });
        } else if (room) {
            socket.emit('leave-room', {
                roomId,
                userId: user.id,
                username: user.username
            });
        }

        navigate('/home');
    };

    const handleRemoveParticipant = (participantId) => {
        if (!confirm('Are you sure you want to remove this participant?')) return;

        if (battle) {
            socket.emit('remove-player', {
                roomId,
                userId: participantId,
                hostId: user.id
            });
        } else if (room) {
            socket.emit('remove-participant', {
                roomId,
                userId: participantId,
                hostId: user.id
            });
        }
    };

    const handleDeleteRoom = () => {
        const confirmMessage = isHost() 
            ? 'Are you sure you want to delete this battle? All participants will be removed and the battle will end.'
            : 'Are you sure you want to delete this room? This action cannot be undone.';
            
        if (!confirm(confirmMessage)) return;

        if (battle) {
            socket.emit('delete-battle', {
                roomId,
                userId: user.id
            });
        } else if (room) {
            socket.emit('delete-room', {
                roomId,
                userId: user.id
            });
        }

        // Navigate immediately to avoid waiting for server response
        setTimeout(() => {
            navigate('/home');
        }, 500);
    };

    const handleExitBattle = () => {
        if (!confirm('Are you sure you want to exit? If you are the host, the battle will be deleted and all participants will be removed.')) return;

        if (isHost()) {
            // Host exits = delete battle
            socket.emit('delete-battle', {
                roomId,
                userId: user.id
            });
        } else {
            // Regular participant leaves
            socket.emit('leave-battle', {
                roomId,
                userId: user.id
            });
        }

        navigate('/home');
    };

    const isHost = () => {
        if (battle) {
            return battle.createdBy?.toString() === user?.id;
        }
        if (room) {
            return room.host?.toString() === user?.id || room.host?._id?.toString() === user?.id;
        }
        return false;
    };

    const formatTime = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString();
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusBadge = (status) => {
        const styles = {
            waiting: 'bg-yellow-500 animate-pulse',
            active: 'bg-green-500 animate-pulse',
            finished: 'bg-red-500',
            draw: 'bg-gray-500'
        };
        return styles[status] || 'bg-gray-500';
    };

    const getModeBadge = (mode) => {
        const labels = {
            duo: '2v2',
            trio: '3v3',
            squad: '4v4'
        };
        return labels[mode] || mode;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-2xl flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
                    <p>Loading battle room...</p>
                </div>
            </div>
        );
    }

    if (!battle && !room) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-center">
                    <h2 className="text-2xl font-bold mb-4">Room not found</h2>
                    <button
                        onClick={() => navigate('/home')}
                        className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    const displayData = battle || room;
    const participants = battle?.players || room?.participants || [];
    const isBattle = !!battle;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex justify-center items-center p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl p-6 md:p-8 text-white">
                {/* Header */}
                <div className="mb-6 pb-6 border-b border-gray-700">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-2">
                                {isBattle ? 'Battle Room' : (displayData?.name || 'Room')}
                            </h1>
                            <p className="text-gray-400">Room ID: <span className="font-mono text-purple-400">{roomId}</span></p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadge(displayData?.status)}`}>
                                {displayData?.status?.toUpperCase()}
                            </span>
                            {isBattle && (
                                <span className="px-4 py-2 rounded-full text-sm font-semibold bg-blue-600">
                                    {getModeBadge(battle.mode)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {/* Left: Room Details */}
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold mb-4 text-purple-400">Room Details</h2>
                        
                        {isBattle ? (
                            // Battle Information
                            <>
                                <InfoItem label="Duration" value={`${battle.duration} minutes`} />
                                <InfoItem label="Problem Rating" value={battle.problemRating} />
                                <InfoItem 
                                    label="Topics" 
                                    value={battle.topics?.length > 0 ? battle.topics.join(', ') : 'Any'} 
                                />
                                {battle.startTime && (
                                    <InfoItem label="Start Time" value={formatTime(battle.startTime)} />
                                )}
                                {battle.endTime && (
                                    <InfoItem label="End Time" value={formatTime(battle.endTime)} />
                                )}
                                {timeRemaining !== null && battle.status === 'active' && (
                                    <InfoItem 
                                        label="Time Remaining" 
                                        value={formatDuration(timeRemaining)}
                                        highlight 
                                    />
                                )}
                                {battle.problem && battle.problem.link && (
                                    <div className="mt-4 p-4 bg-gradient-to-r from-green-900 to-teal-900 rounded-lg border-2 border-green-500">
                                        <h3 className="font-bold text-lg mb-2 text-green-300">🎯 Problem</h3>
                                        <p className="text-white font-semibold mb-2">{battle.problem.name}</p>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            <span className="px-2 py-1 bg-green-700 text-white text-xs rounded">
                                                Rating: {battle.problem.rating}
                                            </span>
                                            {battle.problem.tags?.map((tag, idx) => (
                                                <span key={idx} className="px-2 py-1 bg-blue-700 text-white text-xs rounded">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                        <a 
                                            href={battle.problem.link} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition font-bold text-white shadow-lg"
                                        >
                                            Solve Problem on Codeforces →
                                        </a>
                                    </div>
                                )}
                                {battle.winner && (
                                    <div className="mt-4 p-4 bg-gradient-to-r from-yellow-900 to-orange-900 rounded-lg border-2 border-yellow-500">
                                        <h3 className="font-bold text-lg mb-2 text-yellow-300">🏆 Winner</h3>
                                        <p className="text-xl text-white font-bold">{battle.winner.username}</p>
                                        <p className="text-sm text-gray-300">CF: {battle.winner.codeforcesHandle}</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            // Regular Room Information
                            <>
                                <InfoItem 
                                    label="Participants" 
                                    value={`${room?.participants?.length || 0} / ${room?.maxParticipants || 0}`} 
                                />
                                <InfoItem 
                                    label="Room Type" 
                                    value={room?.isPrivate ? 'Private' : 'Public'} 
                                />
                                <InfoItem label="Created At" value={formatTime(room?.createdAt)} />
                            </>
                        )}
                    </div>

                    {/* Right: Players List */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4 text-purple-400">
                            {isBattle ? 'Players' : 'Participants'} ({participants.length})
                        </h2>
                        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                            {participants.map((participant, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
                                >
                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                        {participant.username?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-lg">{participant.username}</p>
                                        {participant.codeforcesHandle && (
                                            <p className="text-sm text-gray-400">
                                                CF: {participant.codeforcesHandle}
                                            </p>
                                        )}
                                        {participant.score !== undefined && (
                                            <p className="text-sm text-green-400">
                                                Score: {participant.score}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {(participant.userId?.toString() === displayData?.host?.toString() || 
                                          participant.userId?.toString() === displayData?.createdBy?.toString()) && (
                                            <span className="px-2 py-1 bg-yellow-600 text-xs rounded-full">
                                                Host
                                            </span>
                                        )}
                                        {participant.userId?.toString() === user?.id && (
                                            <span className="px-2 py-1 bg-blue-600 text-xs rounded-full">
                                                You
                                            </span>
                                        )}
                                        {isHost() && participant.userId?.toString() !== user?.id && (
                                            <button
                                                onClick={() => handleRemoveParticipant(participant.userId)}
                                                className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-xs rounded-full transition"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-700">
                    {isBattle ? (
                        <>
                            {isHost() && battle?.status === 'waiting' && (
                                <button
                                    onClick={handleDeleteRoom}
                                    className="flex-1 px-6 py-3 bg-red-700 hover:bg-red-800 rounded-lg transition font-semibold text-lg shadow-lg"
                                >
                                    🗑️ Delete Battle
                                </button>
                            )}
                            <button
                                onClick={handleExitBattle}
                                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition font-semibold text-lg shadow-lg"
                            >
                                {isHost() ? '🚪 Exit & Close Battle' : '👋 Leave Battle'}
                            </button>
                        </>
                    ) : (
                        <>
                            {isHost() && (
                                <button
                                    onClick={handleDeleteRoom}
                                    className="flex-1 px-6 py-3 bg-red-700 hover:bg-red-800 rounded-lg transition font-semibold text-lg shadow-lg"
                                >
                                    Delete Room
                                </button>
                            )}
                            <button
                                onClick={handleLeaveRoom}
                                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition font-semibold text-lg shadow-lg"
                            >
                                Leave Room
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => navigate('/home')}
                        className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition font-semibold text-lg shadow-lg"
                    >
                        Back to Home
                    </button>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #374151;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #6b7280;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #9ca3af;
                }
            `}</style>
        </div>
    );
};

// Helper component for displaying info items
const InfoItem = ({ label, value, highlight = false }) => (
    <div className={`p-3 rounded-lg ${highlight ? 'bg-purple-900 border-2 border-purple-500' : 'bg-gray-700'}`}>
        <p className="text-sm text-gray-400 mb-1">{label}</p>
        <p className={`font-semibold ${highlight ? 'text-2xl text-purple-300' : 'text-lg'}`}>{value}</p>
    </div>
);

export default Room;
