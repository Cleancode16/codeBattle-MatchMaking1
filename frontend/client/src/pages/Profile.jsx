import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Profile = () => {
    const navigate = useNavigate();
    const { user, login } = useAuth();
    
    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        codeforcesHandle: user?.codeforcesHandle || ''
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [warning, setWarning] = useState('');
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || '',
                email: user.email || '',
                codeforcesHandle: user.codeforcesHandle || ''
            });
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
        setSuccess('');
        setWarning('');
    };

    const verifyCodeforcesHandle = async () => {
        if (!formData.codeforcesHandle.trim()) {
            setError('Please enter a Codeforces handle');
            return false;
        }

        setVerifying(true);
        setWarning('');
        setError('');
        setSuccess('');
        
        try {
            const response = await api.post('/auth/verify-codeforces', {
                handle: formData.codeforcesHandle
            }, {
                timeout: 20000 // 20 second timeout
            });
            
            if (response.data.success) {
                if (response.data.warning) {
                    setWarning(response.data.warning);
                    setSuccess(response.data.message);
                } else {
                    setSuccess('Codeforces handle verified successfully! ✓');
                }
                return true;
            }
            return false;
        } catch (err) {
            // Even on error, allow saving
            setWarning('Verification timed out. You can still save your handle - just make sure it\'s correct.');
            setSuccess('Handle will be saved without verification');
            return true;
        } finally {
            setVerifying(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        setLoading(true);
        setError('');
        setSuccess('');
        setWarning('');

        try {
            const response = await api.patch('/auth/profile', {
                userId: user.id,
                codeforcesHandle: formData.codeforcesHandle
            });

            if (response.data.success) {
                setSuccess('Profile updated successfully!');
                // Update user in context
                login({
                    ...user,
                    codeforcesHandle: formData.codeforcesHandle
                });
            }
        } catch (err) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
            {/* Header */}
            <header className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Profile Settings</h1>
                            <p className="text-sm text-gray-600">Manage your account information</p>
                        </div>
                        <button
                            onClick={() => navigate('/home')}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm sm:text-base"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8">
                    {/* Profile Header */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 pb-8 border-b">
                        <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                            {user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-center sm:text-left">
                            <h2 className="text-2xl font-bold text-gray-800">{user?.username}</h2>
                            <p className="text-gray-600">{user?.email}</p>
                            <div className="mt-2 flex items-center gap-2 justify-center sm:justify-start">
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                                    Score: {user?.score || 0}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Error/Success/Warning Messages */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        </div>
                    )}

                    {warning && (
                        <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-lg">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {warning}
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                {success}
                            </div>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    disabled
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed outline-none"
                                />
                                <p className="mt-1 text-xs text-gray-500">Username cannot be changed</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    disabled
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed outline-none"
                                />
                                <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Codeforces Handle <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    name="codeforcesHandle"
                                    value={formData.codeforcesHandle}
                                    onChange={handleChange}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                                    placeholder="Enter your Codeforces handle"
                                />
                                <button
                                    type="button"
                                    onClick={verifyCodeforcesHandle}
                                    disabled={verifying || !formData.codeforcesHandle}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    {verifying ? 'Verifying...' : 'Verify'}
                                </button>
                            </div>
                            <p className="mt-2 text-sm text-gray-600">
                                <span className="font-medium">Important:</span> Required to participate in Codeforces battles. 
                                Enter your Codeforces username (e.g., "tourist")
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                Note: Verification may take 15-20 seconds or fail due to network issues. You can save without verification.
                            </p>
                            <a 
                                href="https://codeforces.com" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center text-sm text-purple-600 hover:text-purple-700"
                            >
                                Don't have a Codeforces account? Create one →
                            </a>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-4 focus:ring-purple-300 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                                {loading ? 'Updating...' : 'Save Changes'}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/home')}
                                className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>

                    {/* Info Section */}
                    <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="text-sm font-semibold text-blue-900 mb-2">Why Codeforces Handle?</h3>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Required to participate in coding battles</li>
                            <li>• We fetch problems based on your skill level</li>
                            <li>• Track your progress and solved problems</li>
                            <li>• Compete with other coders in real-time</li>
                        </ul>
                    </div>

                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Troubleshooting</h3>
                        <ul className="text-xs text-gray-700 space-y-1">
                            <li>• If verification fails, check your internet connection</li>
                            <li>• Ensure your Codeforces handle is spelled correctly</li>
                            <li>• You can save without verification and verify later</li>
                            <li>• Contact support if issues persist</li>
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Profile;
