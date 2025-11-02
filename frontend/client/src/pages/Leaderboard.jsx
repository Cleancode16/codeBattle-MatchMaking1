import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Leaderboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            setLoading(true);
            const response = await api.get('/users/leaderboard');
            setUsers(response.data.users || []);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRankBadge = (rank) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    const getRankColor = (rank) => {
        if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
        if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500';
        if (rank === 3) return 'bg-gradient-to-r from-orange-400 to-orange-600';
        return 'bg-gray-600';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
            {/* Header */}
            <header className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">🏆 Leaderboard</h1>
                            <p className="text-sm text-gray-600">Top performers in CodeBattle</p>
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
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading leaderboard...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                        <div className="text-6xl mb-4">🏆</div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">No Rankings Yet</h3>
                        <p className="text-gray-600">Be the first to compete and earn points!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Top 3 Podium */}
                        {users.slice(0, 3).length > 0 && (
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                {users.slice(0, 3).map((u, index) => (
                                    <div
                                        key={u._id}
                                        className={`${
                                            index === 0
                                                ? 'order-2 transform scale-110'
                                                : index === 1
                                                ? 'order-1'
                                                : 'order-3'
                                        }`}
                                    >
                                        <div className={`bg-white rounded-lg shadow-xl p-6 text-center ${
                                            u._id === user?.id ? 'ring-4 ring-purple-500' : ''
                                        }`}>
                                            <div className="text-4xl mb-2">{getRankBadge(index + 1)}</div>
                                            <div className={`w-16 h-16 ${getRankColor(index + 1)} rounded-full mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold`}>
                                                {u.username.charAt(0).toUpperCase()}
                                            </div>
                                            <h3 className="font-bold text-lg text-gray-800">{u.username}</h3>
                                            {u.codeforcesHandle && (
                                                <p className="text-xs text-gray-600 mb-2">CF: {u.codeforcesHandle}</p>
                                            )}
                                            <div className="mt-3 px-4 py-2 bg-purple-100 text-purple-800 rounded-full font-bold">
                                                {u.score} points
                                            </div>
                                            {u._id === user?.id && (
                                                <span className="mt-2 inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Rest of the Rankings */}
                        {users.slice(3).map((u, index) => (
                            <div
                                key={u._id}
                                className={`bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition ${
                                    u._id === user?.id ? 'ring-4 ring-purple-500' : ''
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="text-2xl font-bold text-gray-600 w-12 text-center">
                                        #{index + 4}
                                    </div>
                                    <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                                        {u.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-800">{u.username}</h3>
                                            {u._id === user?.id && (
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                        {u.codeforcesHandle && (
                                            <p className="text-sm text-gray-600">CF: {u.codeforcesHandle}</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-purple-600">{u.score}</div>
                                        <div className="text-xs text-gray-600">points</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Leaderboard;
