import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const POTD = () => {
    const { user } = useAuth();
    const [potd, setPotd] = useState(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(null);
    const [verifying, setVerifying] = useState({}); // Track verification status per problem

    useEffect(() => {
        fetchPOTD();
        if (user) {
            fetchProgress();
        }
    }, [user]);

    const fetchPOTD = async () => {
        try {
            const response = await api.get('/potd/today');
            setPotd(response.data.potd);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching POTD:', error);
            setLoading(false);
        }
    };

    const fetchProgress = async () => {
        try {
            const response = await api.get(`/potd/progress/${user.id}`);
            setProgress(response.data);
        } catch (error) {
            console.error('Error fetching progress:', error);
        }
    };

    // MODIFIED: Check solution with loading state
    const checkSolution = async (problemIndex) => {
        try {
            setVerifying(prev => ({ ...prev, [problemIndex]: true }));
            
            const response = await api.post(`/potd/verify/${user.id}/${problemIndex}`);
            
            setVerifying(prev => ({ ...prev, [problemIndex]: false }));
            
            if (response.data.verified) {
                // Success - refresh data
                await Promise.all([fetchPOTD(), fetchProgress()]);
                
                // Show success message
                const message = `✅ Solution verified!\n\n` +
                    `Problem: ${response.data.problem}\n` +
                    `Streak updated: ${response.data.streakData?.currentStreak || 0} days 🔥`;
                alert(message);
            } else {
                // Not solved yet
                alert(`❌ Solution not found on Codeforces.\n\n${response.data.reason}\n\nMake sure you:\n1. Solved the problem on Codeforces\n2. Got "Accepted" verdict\n3. Used your registered Codeforces handle`);
            }
        } catch (error) {
            setVerifying(prev => ({ ...prev, [problemIndex]: false }));
            console.error('Error checking solution:', error);
            alert('❌ Failed to verify solution. Please try again later.');
        }
    };

    // NEW: Refresh all solutions at once
    const refreshAllSolutions = async () => {
        if (!user?.codeforcesHandle) {
            alert('⚠️ Please set your Codeforces handle in your profile first!');
            return;
        }

        try {
            setLoading(true);
            
            // Verify all problems for this user
            const promises = potd.problems.map((_, index) => 
                api.post(`/potd/verify/${user.id}/${index}`).catch(err => {
                    console.error(`Error verifying problem ${index}:`, err);
                    return { data: { verified: false } };
                })
            );
            
            const results = await Promise.all(promises);
            
            // Refresh data
            await Promise.all([fetchPOTD(), fetchProgress()]);
            
            const verifiedCount = results.filter(r => r.data.verified).length;
            
            if (verifiedCount > 0) {
                alert(`✅ Verification complete!\n\n${verifiedCount} problem(s) verified and streak updated! 🎉`);
            } else {
                alert(`ℹ️ No new solutions found.\n\nIf you've solved problems on Codeforces, make sure:\n• You got "Accepted" verdict\n• You're using the correct handle: ${user.codeforcesHandle}`);
            }
            
            setLoading(false);
        } catch (error) {
            setLoading(false);
            console.error('Error refreshing solutions:', error);
            alert('❌ Failed to refresh solutions. Please try again later.');
        }
    };

    const getDifficultyColor = (difficulty) => {
        const colors = {
            easy: 'text-green-600',
            medium: 'text-orange-600',
            hard: 'text-red-600'
        };
        return colors[difficulty] || 'text-gray-600';
    };

    const isProblemSolved = (index) => {
        if (!potd || !potd.solvedBy) return false;
        return potd.solvedBy.some(
            s => s.userId === user?.id && s.problemIndex === index
        );
    };

    if (loading) {
        return (
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/20">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">
            {/* LeetCode-style Layout: Problems on Left, Calendar on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                {/* LEFT: Problems Section (2/3 width) */}
                <div className="lg:col-span-2 p-6 border-r border-gray-200">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-2xl font-bold text-gray-800">Daily Coding Challenge</h2>
                            
                            {/* NEW: Refresh All Button */}
                            <button
                                onClick={refreshAllSolutions}
                                disabled={loading || !user?.codeforcesHandle}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                title="Check all problems and update streak"
                            >
                                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                {loading ? 'Checking...' : 'Refresh Status'}
                            </button>
                        </div>
                        <p className="text-sm text-gray-600">
                            {new Date().toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                month: 'long', 
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </p>
                    </div>

                    {/* Problems List - LeetCode Style */}
                    <div className="space-y-3">
                        {potd?.problems?.map((problem, index) => {
                            const solved = isProblemSolved(index);
                            
                            return (
                                <div
                                    key={index}
                                    className={`group relative border rounded-lg p-4 transition-all hover:shadow-md ${
                                        solved 
                                            ? 'bg-green-50 border-green-200' 
                                            : 'bg-white border-gray-200 hover:border-purple-300'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Status Icon */}
                                        <div className="flex-shrink-0 mt-1">
                                            {solved ? (
                                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                                            )}
                                        </div>

                                        {/* Problem Info */}
                                        <div className="flex-1 min-w-0">
                                            {/* Title Row */}
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-gray-800 text-sm">
                                                    {index + 1}. {problem.name}
                                                </h3>
                                            </div>

                                            {/* Metadata Row */}
                                            <div className="flex items-center gap-3 text-xs mb-2">
                                                <span className={`font-semibold ${getDifficultyColor(problem.difficulty)}`}>
                                                    {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                                                </span>
                                                <span className="text-gray-500">•</span>
                                                <span className="text-gray-600">Rating: {problem.rating}</span>
                                            </div>

                                            {/* Tags */}
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {problem.tags?.slice(0, 4).map((tag, idx) => (
                                                    <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                                                        {tag}
                                                    </span>
                                                ))}
                                                {problem.tags?.length > 4 && (
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                                        +{problem.tags.length - 4}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-2">
                                                <a
                                                    href={problem.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition font-medium"
                                                >
                                                    Solve on Codeforces
                                                </a>
                                                {/* Check Solution button */}
                                                {!solved && (
                                                    <button
                                                        onClick={() => checkSolution(index)}
                                                        disabled={verifying[index] || !user?.codeforcesHandle}
                                                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                        title="Check if you've solved this on Codeforces"
                                                    >
                                                        {verifying[index] ? (
                                                            <>
                                                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                                Checking...
                                                            </>
                                                        ) : (
                                                            'Check Solution'
                                                        )}
                                                    </button>
                                                )}
                                                {/* Show when solved */}
                                                {solved && (
                                                    <button
                                                        onClick={() => checkSolution(index)}
                                                        disabled={verifying[index]}
                                                        className="px-4 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-lg transition font-medium disabled:opacity-50 flex items-center gap-1"
                                                        title="Re-verify solution"
                                                    >
                                                        {verifying[index] ? (
                                                            <>
                                                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                                Verifying...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                </svg>
                                                                Refresh
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Info Footer */}
                    <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div className="text-xs text-blue-900">
                                <p className="font-semibold mb-1">Auto-Verification System:</p>
                                <ul className="space-y-0.5 list-disc list-inside">
                                    <li>Solutions are automatically verified every 2 hours</li>
                                    <li>Solve problems on Codeforces to get credit</li>
                                    <li>Click "Check Solution" for immediate verification</li>
                                    <li>Streak updates automatically when verified</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Streak & Calendar Sidebar (1/3 width) */}
                <div className="p-6 bg-gradient-to-br from-gray-50 to-purple-50">
                    {/* Streak Stats */}
                    <div className="mb-6">
                        <div className="text-center mb-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full mb-2 shadow-lg">
                                <span className="text-3xl">🔥</span>
                            </div>
                            <div className="text-4xl font-bold text-orange-600 mb-1">
                                {progress?.streakData?.currentStreak || 0}
                            </div>
                            <div className="text-sm text-gray-600 font-medium">Day Streak</div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                                <div className="text-xl font-bold text-purple-600">
                                    {progress?.streakData?.longestStreak || 0}
                                </div>
                                <div className="text-xs text-gray-600">Longest</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                                <div className="text-xl font-bold text-green-600">
                                    {progress?.stats?.totalDays || 0}
                                </div>
                                <div className="text-xs text-gray-600">Total Days</div>
                            </div>
                        </div>
                    </div>

                    {/* Compact Calendar */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 mb-3">Activity Calendar</h3>
                        
                        {/* Month/Week Headers */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                                <div key={i} className="text-center text-xs font-medium text-gray-500">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid - Last 35 days (5 weeks) */}
                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: 35 }, (_, i) => {
                                const date = new Date();
                                date.setDate(date.getDate() - (34 - i));
                                date.setHours(0, 0, 0, 0);
                                
                                const isSolved = progress?.streakData?.solvedDates?.some(d => {
                                    const solvedDate = new Date(d);
                                    solvedDate.setHours(0, 0, 0, 0);
                                    return solvedDate.getTime() === date.getTime();
                                });

                                const isToday = new Date().toDateString() === date.toDateString();

                                return (
                                    <div
                                        key={i}
                                        className={`aspect-square rounded flex items-center justify-center text-xs font-medium transition-all cursor-pointer ${
                                            isSolved
                                                ? 'bg-green-500 text-white shadow-sm hover:scale-110'
                                                : isToday
                                                ? 'bg-purple-200 text-purple-800 border-2 border-purple-500 hover:scale-110'
                                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                        }`}
                                        title={`${date.toDateString()}${isSolved ? ' - Solved' : ''}`}
                                    >
                                        {date.getDate()}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-green-500 rounded"></div>
                                <span className="text-gray-600">Solved</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-purple-200 border-2 border-purple-500 rounded"></div>
                                <span className="text-gray-600">Today</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-gray-100 rounded"></div>
                                <span className="text-gray-600">Missed</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="mt-6 p-3 bg-white rounded-lg shadow-sm">
                        <div className="text-xs text-gray-600 mb-2">Progress This Month</div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all"
                                    style={{ 
                                        width: `${Math.min(100, ((progress?.stats?.totalDays || 0) / 30) * 100)}%` 
                                    }}
                                ></div>
                            </div>
                            <span className="text-xs font-bold text-gray-700">
                                {progress?.stats?.totalDays || 0}/30
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default POTD;
