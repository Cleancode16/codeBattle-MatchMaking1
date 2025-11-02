const express = require('express');
const router = express.Router();
const User = require('../models/User');
const axios = require('axios');

// Password validation function
const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < minLength) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!hasUpperCase || !hasLowerCase) {
        return { valid: false, message: 'Password must contain both uppercase and lowercase letters' };
    }
    if (!hasNumber) {
        return { valid: false, message: 'Password must contain at least one number' };
    }
    if (!hasSpecialChar) {
        return { valid: false, message: 'Password must contain at least one special character' };
    }
    
    return { valid: true };
};

// Signup API
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        console.log('Signup attempt:', { username, email });

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username, email, and password are required' 
            });
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({ 
                success: false, 
                message: passwordValidation.message 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            console.log('User already exists:', email);
            return res.status(400).json({ 
                success: false, 
                message: 'User with this email or username already exists' 
            });
        }

        // Create new user
        const user = new User({
            username,
            email,
            password
        });

        await user.save();
        
        console.log('User created successfully:', user._id);

        res.status(201).json({ 
            success: true, 
            message: 'User registered successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during signup' 
        });
    }
});

// Signin API
router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('Signin attempt:', email);

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        // Find user by email
        const user = await User.findOne({ email });
        
        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // Compare password
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            console.log('Invalid password for user:', email);
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        console.log('User signed in successfully:', user._id);

        res.status(200).json({ 
            success: true, 
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during signin' 
        });
    }
});

// Update user profile
router.patch('/profile', async (req, res) => {
    try {
        const { userId, codeforcesHandle } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update Codeforces handle if provided
        if (codeforcesHandle !== undefined) {
            user.codeforcesHandle = codeforcesHandle;
        }

        await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                codeforcesHandle: user.codeforcesHandle,
                score: user.score
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// Verify Codeforces handle
router.post('/verify-codeforces', async (req, res) => {
    try {
        const { handle } = req.body;

        if (!handle) {
            return res.status(400).json({
                success: false,
                message: 'Codeforces handle is required'
            });
        }

        // Check if handle exists on Codeforces with timeout and retry
        try {
            const response = await axios.get(`https://codeforces.com/api/user.info`, {
                params: { handles: handle },
                timeout: 15000, // Increased to 15 seconds
                headers: {
                    'User-Agent': 'CodeBattle-App'
                },
                maxRedirects: 5
            });

            if (response.data.status === 'OK' && response.data.result.length > 0) {
                const userInfo = response.data.result[0];
                
                res.json({
                    success: true,
                    message: 'Codeforces handle verified',
                    userData: {
                        handle: userInfo.handle,
                        rating: userInfo.rating || 0,
                        rank: userInfo.rank || 'unrated'
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Invalid Codeforces handle'
                });
            }
        } catch (axiosError) {
            console.error('Codeforces API error:', axiosError.code, axiosError.message);
            
            // If it's a timeout or network error, still allow the handle but warn user
            if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ECONNABORTED' || axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNRESET') {
                res.json({
                    success: true,
                    message: 'Handle saved (verification unavailable)',
                    warning: 'Could not verify handle with Codeforces API due to network timeout. Your handle has been saved - please ensure it is correct.',
                    userData: {
                        handle: handle,
                        rating: 0,
                        rank: 'unverified'
                    }
                });
            } else {
                throw axiosError;
            }
        }

    } catch (error) {
        console.error('Verify Codeforces error:', error);
        res.status(200).json({
            success: true,
            message: 'Handle saved without verification',
            warning: 'Verification service unavailable. Your handle has been saved.',
            userData: {
                handle: req.body.handle,
                rating: 0,
                rank: 'unverified'
            }
        });
    }
});

module.exports = router;
