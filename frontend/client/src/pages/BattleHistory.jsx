import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const BattleHistory = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [battles, setBattles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, created, joined

    useEffect(() => {
        fetchBattleHistory();
    }, [filter]);

    const fetchBattleHistory = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/battles/history/${user.id}?filter=${filter}`);
            setBattles(response.data.battles || []);
        } catch (error) {
            console.error('Error fetching battle history:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            finished: 'bg-green-100 text-green-800',
            draw: 'bg-yellow-100 text-yellow-800',
            active: 'bg-blue-100 text-blue-800',
            waiting: 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getUserResult = (battle) => {
        if (battle.status === 'draw') return '🤝 Draw';
        if (battle.status === 'waiting') return '⏳ Waiting';
        if (battle.status === 'active') return '⚔️ Active';
        
        if (battle.winner) {
            const isWinner = battle.winner.userId.toString() === user.id;
            return isWinner ? '🏆 Winner' : '❌ Lost';
        }
        return '—';
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
            {/* Header */}
            <header className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Battle History</h1>
                            <p className="text-sm text-gray-600">View your past battles</p>
                        </div>
                        <button
                            onClick={() => navigate('/home')}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filters */}
                <div className="mb-6 flex flex-wrap gap-3">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-6 py-2 rounded-lg font-medium transition ${
                            filter === 'all'
                                ? 'bg-white text-purple-600 shadow-lg'
                                : 'bg-white bg-opacity-50 text-white hover:bg-opacity-75'
                        }`}
                    >
                        All Battles
                    </button>
                    <button
                        onClick={() => setFilter('created')}
                        className={`px-6 py-2 rounded-lg font-medium transition ${
                            filter === 'created'
                                ? 'bg-white text-purple-600 shadow-lg'
                                : 'bg-white bg-opacity-50 text-white hover:bg-opacity-75'
                        }`}
                    >
                        Created by Me
                    </button>
                    <button
                        onClick={() => setFilter('joined')}
                        className={`px-6 py-2 rounded-lg font-medium transition ${
                            filter === 'joined'
                                ? 'bg-white text-purple-600 shadow-lg'
                                : 'bg-white bg-opacity-50 text-white hover:bg-opacity-75'
                        }`}
                    >
                        Joined Battles
                    </button>
                </div>

                {/* Battle List */}
                {loading ? (
                    <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading battles...</p>
                    </div>
                ) : battles.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                        <div className="text-6xl mb-4">📜</div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">No Battles Found</h3>
                        <p className="text-gray-600 mb-6">You haven't participated in any battles yet.</p>
                        <button
                            onClick={() => navigate('/home')}
                            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                        >
                            Start Your First Battle
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {battles.map((battle) => (
                            <div
                                key={battle._id}
                                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    {/* Battle Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-gray-800">
                                                {battle.mode.toUpperCase()} Battle
                                            </h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(battle.status)}`}>
                                                {battle.status}
                                            </span>
                                            {battle.createdBy === user.id && (
                                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                                                    Created by You
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                            <div>
                                                <span className="text-gray-600">Rating:</span>
                                                <span className="ml-2 font-semibold">{battle.problemRating}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Duration:</span>
                                                <span className="ml-2 font-semibold">{battle.duration} min</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Players:</span>
                                                <span className="ml-2 font-semibold">{battle.players.length}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Result:</span>
                                                <span className="ml-2 font-semibold">{getUserResult(battle)}</span>
                                            </div>
                                        </div>
                                        {battle.problem && (
                                            <div className="mt-2 text-sm text-gray-600">
                                                <span className="font-medium">Problem:</span> {battle.problem.name}
                                            </div>
                                        )}
                                        <div className="mt-2 text-xs text-gray-500">
                                            {formatDate(battle.createdAt)}
                                        </div>
                                    </div>

                                    {/* Winner Info */}
                                    {battle.winner && (
                                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border-2 border-yellow-300">
                                            <div className="text-center">
                                                <div className="text-2xl mb-1">🏆</div>
                                                <div className="font-bold text-gray-800">{battle.winner.username}</div>
                                                <div className="text-xs text-gray-600">{battle.winner.codeforcesHandle}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default BattleHistory;
