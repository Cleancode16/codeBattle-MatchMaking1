import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';

const Battle = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { socket } = useSocket();
    
    const [battle, setBattle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState(null);

    useEffect(() => {
        fetchBattleInfo();
    }, [roomId]);

    useEffect(() => {
        if (!socket) return;

        // Socket event listeners
        socket.on('battle-info', handleBattleInfo);
        socket.on('player-joined', handlePlayerJoined);
        socket.on('player-left', handlePlayerLeft);
        socket.on('battle-updated', fetchBattleInfo);
        socket.on('ready-to-start', handleReadyToStart);
        socket.on('battle-started', handleBattleStarted);
        socket.on('battle-timer', handleBattleTimer);
        socket.on('battle-ended', handleBattleEnded);
        socket.on('battle-draw', handleBattleDraw);
        socket.on('room-closed', handleRoomClosed);
        socket.on('error', handleError);

        return () => {
            socket.off('battle-info');
            socket.off('player-joined');
            socket.off('player-left');
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

    const fetchBattleInfo = async () => {
        try {
            const response = await api.get(`/battles/${roomId}`);
            if (response.data.success) {
                setBattle(response.data.battle);
                setLoading(false);
            }
        } catch (error) {
            console.error('Error fetching battle info:', error);
            setLoading(false);
        }
    };

    const handleBattleInfo = (data) => {
        if (data.success) {
            setBattle(data.battle);
            setLoading(false);
        }
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
        alert('Battle has been closed');
        navigate('/home');
    };

    const handleError = (error) => {
        alert(error.message);
    };

    const handleLeaveBattle = () => {
        if (!confirm('Are you sure you want to leave?')) return;

        socket.emit('leave-battle', {
            roomId,
            userId: user.id
        });

        navigate('/home');
    };

    const handleRemovePlayer = (playerId) => {
        if (!confirm('Are you sure you want to remove this player?')) return;

        socket.emit('remove-player', {
            roomId,
            userId: playerId,
            hostId: user.id
        });
    };

    const handleDeleteBattle = () => {
        if (!confirm('Are you sure you want to delete this battle? This action cannot be undone.')) return;

        socket.emit('delete-battle', {
            roomId,
            userId: user.id
        });

        navigate('/home');
    };

    const isHost = () => {
        return battle?.createdBy?.toString() === user?.id;
    };

    // ...existing helper functions (formatTime, formatDuration, getStatusBadge, getModeBadge)...

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-2xl">Loading battle...</div>
            </div>
        );
    }

    const participants = battle?.players || [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex justify-center items-center p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl p-6 md:p-8 text-white">
                {/* Header */}
                <div className="mb-6 pb-6 border-b border-gray-700">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-2">⚔️ Battle Room</h1>
                            <p className="text-gray-400">Battle ID: <span className="font-mono text-purple-400">{roomId}</span></p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadge(battle?.status)}`}>
                                {battle?.status?.toUpperCase()}
                            </span>
                            <span className="px-4 py-2 rounded-full text-sm font-semibold bg-blue-600">
                                {getModeBadge(battle.mode)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ...existing code for battle details and players... */}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-700">
                    {isHost() && (
                        <button
                            onClick={handleDeleteBattle}
                            className="flex-1 px-6 py-3 bg-red-700 hover:bg-red-800 rounded-lg transition font-semibold text-lg shadow-lg"
                        >
                            Delete Battle
                        </button>
                    )}
                    <button
                        onClick={handleLeaveBattle}
                        className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition font-semibold text-lg shadow-lg"
                    >
                        Leave Battle
                    </button>
                    <button
                        onClick={() => navigate('/home')}
                        className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition font-semibold text-lg shadow-lg"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
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

export default Battle;
