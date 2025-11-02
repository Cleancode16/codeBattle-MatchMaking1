import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';

const Homepage = () => {
    const { user, logout } = useAuth();
    const { socket, connected } = useSocket();
    const navigate = useNavigate();
    
    const [battles, setBattles] = useState([]);
    const [showCreateBattleModal, setShowCreateBattleModal] = useState(false);
    const [selectedBattle, setSelectedBattle] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const [createBattleForm, setCreateBattleForm] = useState({
        mode: 'duo',
        duration: 15,
        problemRating: 1200,
        topics: [],
        showTopicsDropdown: false
    });
    
    // Common Codeforces tags
    const codeforcesTopics = [
        'dp', 'greedy', 'math', 'constructive algorithms', 'binary search',
        'number theory', 'prefix sums', 'backtracking', 'recursion', 
        'sliding window', 'graphs', 'two pointers', 'dfs and similar', 
        'bfs', 'trees', 'arrays', 'sortings', 'strings', 'hashing',
        'implementation', 'brute force', 'divide and conquer',
        'shortest paths', 'data structures', 'combinatorics'
    ];

    useEffect(() => {
        fetchBattles();
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('battle-created', (data) => {
            if (data.success) {
                setShowCreateBattleModal(false);
                navigate(`/room/${data.battle.roomId}`);
            }
        });

        socket.on('battle-joined', (data) => {
            if (data.success) {
                navigate(`/room/${data.battle.roomId}`);
            }
        });

        socket.on('battle-list-updated', () => {
            fetchBattles();
        });

        socket.on('error', (error) => {
            alert(error.message);
            setLoading(false);
        });

        return () => {
            socket.off('battle-created');
            socket.off('battle-joined');
            socket.off('battle-list-updated');
            socket.off('error');
        };
    }, [socket, navigate]);

    const fetchBattles = async () => {
        try {
            const response = await api.get('/battles');
            setBattles(response.data.battles || []);
        } catch (error) {
            console.error('Error fetching battles:', error);
        }
    };

    const handleCreateBattle = () => {
        if (!user.codeforcesHandle) {
            alert('Please set your Codeforces handle in your profile before creating a battle!');
            navigate('/profile');
            return;
        }

        setLoading(true);
        socket.emit('create-battle', {
            mode: createBattleForm.mode,
            duration: createBattleForm.duration,
            problemRating: createBattleForm.problemRating,
            topics: createBattleForm.topics,
            userId: user.id,
            username: user.username,
            codeforcesHandle: user.codeforcesHandle
        });
    };

    const handleJoinBattle = (battle) => {
        if (!user.codeforcesHandle) {
            alert('Please set your Codeforces handle in your profile before joining a battle!');
            navigate('/profile');
            return;
        }

        setLoading(true);
        socket.emit('join-battle', {
            roomId: battle.roomId,
            userId: user.id,
            username: user.username,
            codeforcesHandle: user.codeforcesHandle
        });
    };

    const getMaxPlayers = (mode) => {
        const modes = { duo: 2, trio: 3, squad: 4 };
        return modes[mode] || 2;
    };

    const handleTopicToggle = (topic) => {
        setCreateBattleForm(prev => ({
            ...prev,
            topics: prev.topics.includes(topic)
                ? prev.topics.filter(t => t !== topic)
                : [...prev.topics, topic]
        }));
    };

    const handleLogout = () => {
        logout();
        navigate('/signin');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
            {/* Header */}
            <header className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">CodeBattle</h1>
                            <p className="text-sm text-gray-600">Welcome, {user?.username}!</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-sm text-gray-600 hidden sm:inline">
                                    {connected ? 'Connected' : 'Disconnected'}
                                </span>
                            </div>
                            <button
                                onClick={() => navigate('/leaderboard')}
                                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm sm:text-base"
                            >
                                🏆 Leaderboard
                            </button>
                            <button
                                onClick={() => navigate('/history')}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm sm:text-base"
                            >
                                📜 History
                            </button>
                            <button
                                onClick={() => navigate('/profile')}
                                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition text-sm sm:text-base"
                            >
                                Profile
                            </button>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm sm:text-base"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Action Buttons */}
                <div className="mb-8 flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={() => setShowCreateBattleModal(true)}
                        className="flex-1 sm:flex-none px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium shadow-lg text-lg"
                    >
                        ⚔️ Create New Battle
                    </button>
                    <button
                        onClick={() => navigate('/join')}
                        className="flex-1 sm:flex-none px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium shadow-lg text-lg"
                    >
                        📝 Join Battle with Code
                    </button>
                </div>

                {/* Battles Section */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-white mb-6">
                        Available Battles ({battles.filter(b => b.status === 'waiting').length})
                    </h2>
                    {battles.filter(b => b.status === 'waiting').length === 0 ? (
                        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                            <div className="text-6xl mb-4">⚔️</div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Active Battles</h3>
                            <p className="text-gray-600 mb-6">Create a new battle to start competing with other coders!</p>
                            <button
                                onClick={() => setShowCreateBattleModal(true)}
                                className="px-8 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-semibold"
                            >
                                Create Your First Battle
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {battles.filter(b => b.status === 'waiting').map((battle) => (
                                <div key={battle._id} className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl shadow-lg p-6 hover:shadow-2xl transition border-2 border-orange-300 transform hover:scale-105">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-2xl font-bold text-gray-800">
                                            {getMaxPlayers(battle.mode)} Player Battle
                                        </h3>
                                        <span className="px-3 py-1 bg-orange-500 text-white text-sm rounded-full font-bold">
                                            {battle.mode.toUpperCase()}
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-3 mb-4">
                                        <div className="flex items-center">
                                            <span className="text-2xl mr-2">⏱️</span>
                                            <p className="text-sm text-gray-700">
                                                <span className="font-bold">{battle.duration}</span> minutes
                                            </p>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="text-2xl mr-2">⭐</span>
                                            <p className="text-sm text-gray-700">
                                                Rating: <span className="font-bold">{battle.problemRating}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="text-2xl mr-2">👥</span>
                                            <p className="text-sm text-gray-700">
                                                <span className="font-bold">{battle.players.length}/{getMaxPlayers(battle.mode)}</span> players
                                            </p>
                                        </div>
                                        {battle.topics?.length > 0 && (
                                            <div className="mt-2">
                                                <p className="text-xs text-gray-600 mb-1">Topics:</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {battle.topics.slice(0, 3).map((topic, idx) => (
                                                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                                            {topic}
                                                        </span>
                                                    ))}
                                                    {battle.topics.length > 3 && (
                                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                                            +{battle.topics.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => handleJoinBattle(battle)}
                                        disabled={battle.players.length >= getMaxPlayers(battle.mode) || loading}
                                        className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-lg"
                                    >
                                        {battle.players.length >= getMaxPlayers(battle.mode) ? '🔒 Battle Full' : '⚔️ Join Battle'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Active Battles Info */}
                <div className="mt-8 p-6 bg-white bg-opacity-90 rounded-lg shadow-lg">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">How It Works</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="flex items-start">
                            <span className="text-3xl mr-3">1️⃣</span>
                            <div>
                                <h4 className="font-bold text-gray-800 mb-1">Create or Join</h4>
                                <p className="text-sm text-gray-600">Create a new battle or join an existing one</p>
                            </div>
                        </div>
                        <div className="flex items-start">
                            <span className="text-3xl mr-3">2️⃣</span>
                            <div>
                                <h4 className="font-bold text-gray-800 mb-1">Wait for Players</h4>
                                <p className="text-sm text-gray-600">Battle starts when all players join</p>
                            </div>
                        </div>
                        <div className="flex items-start">
                            <span className="text-3xl mr-3">3️⃣</span>
                            <div>
                                <h4 className="font-bold text-gray-800 mb-1">Solve & Win</h4>
                                <p className="text-sm text-gray-600">First to solve the problem wins!</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Create Battle Modal */}
            {showCreateBattleModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md my-8">
                        <h2 className="text-2xl font-bold mb-4">Create Codeforces Battle</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Battle Mode
                                </label>
                                <select
                                    value={createBattleForm.mode}
                                    onChange={(e) => setCreateBattleForm({ ...createBattleForm, mode: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                >
                                    <option value="duo">Duo (2 players)</option>
                                    <option value="trio">Trio (3 players)</option>
                                    <option value="squad">Squad (4 players)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Duration (minutes)
                                </label>
                                <select
                                    value={createBattleForm.duration}
                                    onChange={(e) => setCreateBattleForm({ ...createBattleForm, duration: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                >
                                    <option value={5}>5 minutes</option>
                                    <option value={10}>10 minutes</option>
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                    <option value={60}>60 minutes</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Problem Rating
                                </label>
                                <select
                                    value={createBattleForm.problemRating}
                                    onChange={(e) => setCreateBattleForm({ ...createBattleForm, problemRating: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                >
                                    <option value={800}>800 (Beginner)</option>
                                    <option value={900}>900</option>
                                    <option value={1000}>1000</option>
                                    <option value={1100}>1100</option>
                                    <option value={1200}>1200 (Easy)</option>
                                    <option value={1300}>1300</option>
                                    <option value={1400}>1400</option>
                                    <option value={1500}>1500 (Medium)</option>
                                    <option value={1600}>1600</option>
                                    <option value={1700}>1700</option>
                                    <option value={1800}>1800 (Hard)</option>
                                    <option value={1900}>1900</option>
                                    <option value={2000}>2000+</option>
                                </select>
                            </div>

                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Topics (Optional - {createBattleForm.topics.length} selected)
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setCreateBattleForm({ 
                                        ...createBattleForm, 
                                        showTopicsDropdown: !createBattleForm.showTopicsDropdown 
                                    })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-left bg-white"
                                >
                                    {createBattleForm.topics.length > 0 
                                        ? createBattleForm.topics.join(', ') 
                                        : 'Select topics...'}
                                </button>
                                
                                {createBattleForm.showTopicsDropdown && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {codeforcesTopics.map((topic) => (
                                            <label
                                                key={topic}
                                                className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={createBattleForm.topics.includes(topic)}
                                                    onChange={() => handleTopicToggle(topic)}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm">{topic}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={() => {
                                    setShowCreateBattleModal(false);
                                    setCreateBattleForm({ mode: 'duo', duration: 15, problemRating: 1200, topics: [], showTopicsDropdown: false });
                                }}
                                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateBattle}
                                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Create Battle'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Homepage;
