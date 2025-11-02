const codeforcesService = require('./codeforcesService');
const POTD = require('../models/POTD');
const User = require('../models/User');

class POTDService {
    // Generate POTD for a specific date
    async generatePOTD(date = new Date()) {
        try {
            // Normalize date to start of day
            const targetDate = new Date(date);
            targetDate.setHours(0, 0, 0, 0);

            // Check if POTD already exists for this date
            const existing = await POTD.findOne({ date: targetDate });
            if (existing) {
                return existing;
            }

            // Fetch all problems from Codeforces
            const allProblems = await codeforcesService.fetchProblems();

            // Filter problems by difficulty
            const easyProblems = allProblems.filter(p => p.rating && p.rating <= 1000);
            const mediumProblems = allProblems.filter(p => p.rating && p.rating > 1000 && p.rating <= 1400);
            const hardProblems = allProblems.filter(p => p.rating && p.rating > 1400 && p.rating <= 1800);

            if (easyProblems.length === 0 || mediumProblems.length === 0 || hardProblems.length === 0) {
                throw new Error('Not enough problems available');
            }

            // Use date as seed for consistent random selection
            const seed = targetDate.getTime();
            const random = (max, offset = 0) => {
                const x = Math.sin(seed + offset) * 10000;
                return Math.floor((x - Math.floor(x)) * max);
            };

            // Select one problem from each difficulty
            const selectedProblems = [
                {
                    difficulty: 'easy',
                    ...this.formatProblem(easyProblems[random(easyProblems.length, 1)])
                },
                {
                    difficulty: 'medium',
                    ...this.formatProblem(mediumProblems[random(mediumProblems.length, 2)])
                },
                {
                    difficulty: 'hard',
                    ...this.formatProblem(hardProblems[random(hardProblems.length, 3)])
                }
            ];

            // Create POTD document
            const potd = new POTD({
                date: targetDate,
                problems: selectedProblems,
                solvedBy: []
            });

            await potd.save();
            console.log(`POTD generated for ${targetDate.toDateString()}`);

            return potd;
        } catch (error) {
            console.error('Error generating POTD:', error);
            throw error;
        }
    }

    // Format problem data
    formatProblem(problem) {
        return {
            contestId: problem.contestId,
            index: problem.index,
            name: problem.name,
            rating: problem.rating,
            tags: problem.tags || [],
            link: `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`
        };
    }

    // Get today's POTD
    async getTodayPOTD() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let potd = await POTD.findOne({ date: today });

            if (!potd) {
                potd = await this.generatePOTD(today);
            }

            return potd;
        } catch (error) {
            console.error('Error getting today\'s POTD:', error);
            throw error;
        }
    }

    // NEW: Verify if user actually solved the problem
    async verifyUserSubmission(userId, problemIndex) {
        try {
            const potd = await this.getTodayPOTD();
            const user = await User.findById(userId);
            
            if (!user || !user.codeforcesHandle) {
                return { verified: false, reason: 'No Codeforces handle' };
            }

            const problem = potd.problems[problemIndex];
            if (!problem) {
                return { verified: false, reason: 'Invalid problem index' };
            }

            // Check if user solved the problem on Codeforces
            const solved = await codeforcesService.checkProblemSolved(
                user.codeforcesHandle,
                problem.contestId,
                problem.index,
                potd.date // Check submissions after POTD date
            );

            if (solved) {
                // Mark as solved in database
                await this.markProblemSolved(userId, problemIndex);
                
                // Update user streak
                await this.updateUserStreak(userId);
                
                return { verified: true, problem: problem.name };
            }

            return { verified: false, reason: 'Not solved on Codeforces' };
        } catch (error) {
            console.error('Error verifying submission:', error);
            return { verified: false, reason: error.message };
        }
    }

    // NEW: Verify all users' submissions for today's POTD
    async verifyAllSubmissions() {
        try {
            const potd = await this.getTodayPOTD();
            const users = await User.find({ codeforcesHandle: { $exists: true, $ne: null } });
            
            console.log(`🔍 Starting POTD verification for ${users.length} users...`);
            
            let verifiedCount = 0;
            
            for (const user of users) {
                for (let i = 0; i < potd.problems.length; i++) {
                    // Skip if already verified today
                    const alreadySolved = potd.solvedBy.some(
                        s => s.userId.toString() === user._id.toString() && s.problemIndex === i
                    );
                    
                    if (!alreadySolved) {
                        const result = await this.verifyUserSubmission(user._id, i);
                        if (result.verified) {
                            verifiedCount++;
                            console.log(`✅ ${user.username} solved: ${result.problem}`);
                        }
                    }
                }
            }
            
            console.log(`✅ POTD verification complete. ${verifiedCount} new solutions verified.`);
            return { success: true, verifiedCount };
        } catch (error) {
            console.error('Error in bulk verification:', error);
            return { success: false, error: error.message };
        }
    }

    // NEW: Update user streak when they solve a problem
    async updateUserStreak(userId) {
        try {
            const user = await User.findById(userId);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (!user.streakData) {
                user.streakData = {
                    currentStreak: 0,
                    longestStreak: 0,
                    lastSolvedDate: null,
                    solvedDates: []
                };
            }

            // Check if already counted today
            const solvedToday = user.streakData.solvedDates.some(date => {
                const d = new Date(date);
                d.setHours(0, 0, 0, 0);
                return d.getTime() === today.getTime();
            });

            if (!solvedToday) {
                user.streakData.solvedDates.push(today);

                const lastSolvedDate = user.streakData.lastSolvedDate 
                    ? new Date(user.streakData.lastSolvedDate) 
                    : null;

                if (lastSolvedDate) {
                    lastSolvedDate.setHours(0, 0, 0, 0);
                    const daysDiff = Math.floor((today - lastSolvedDate) / (1000 * 60 * 60 * 24));

                    if (daysDiff === 1) {
                        user.streakData.currentStreak += 1;
                    } else if (daysDiff > 1) {
                        user.streakData.currentStreak = 1;
                    }
                } else {
                    user.streakData.currentStreak = 1;
                }

                if (user.streakData.currentStreak > user.streakData.longestStreak) {
                    user.streakData.longestStreak = user.streakData.currentStreak;
                }

                user.streakData.lastSolvedDate = today;
                await user.save();
            }

            return user.streakData;
        } catch (error) {
            console.error('Error updating streak:', error);
            throw error;
        }
    }

    // MODIFIED: Remove manual marking, only for internal use
    async markProblemSolved(userId, problemIndex) {
        try {
            const potd = await this.getTodayPOTD();

            const alreadySolved = potd.solvedBy.some(
                s => s.userId.toString() === userId.toString() && s.problemIndex === problemIndex
            );

            if (!alreadySolved) {
                potd.solvedBy.push({
                    userId,
                    problemIndex,
                    solvedAt: new Date()
                });
                await potd.save();
            }

            return potd;
        } catch (error) {
            console.error('Error marking problem as solved:', error);
            throw error;
        }
    }

    // Get user's POTD stats
    async getUserPOTDStats(userId) {
        try {
            const potds = await POTD.find({
                'solvedBy.userId': userId
            }).sort({ date: -1 });

            const solvedDates = potds.map(p => p.date);
            const totalSolved = potds.reduce((sum, p) => {
                return sum + p.solvedBy.filter(s => s.userId.toString() === userId.toString()).length;
            }, 0);

            return {
                totalSolved,
                solvedDates,
                totalDays: potds.length
            };
        } catch (error) {
            console.error('Error getting user POTD stats:', error);
            throw error;
        }
    }
}

module.exports = new POTDService();
