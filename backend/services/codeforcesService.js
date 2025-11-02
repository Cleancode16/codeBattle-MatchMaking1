const axios = require('axios');

const CF_API_BASE = 'https://codeforces.com/api';

// Create axios instance with timeout
const cfAxios = axios.create({
    timeout: 20000, // Increased to 20 seconds
    headers: {
        'User-Agent': 'CodeBattle-App'
    },
    maxRedirects: 5
});

class CodeforcesService {
    // Fetch all problems from Codeforces
    async fetchProblems() {
        try {
            const response = await cfAxios.get(`${CF_API_BASE}/problemset.problems`);
            if (response.data.status === 'OK') {
                return response.data.result.problems;
            }
            throw new Error('Failed to fetch problems from Codeforces');
        } catch (error) {
            console.error('Codeforces API error:', error.code, error.message);
            if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED' || error.code === 'ECONNRESET') {
                throw new Error('Codeforces API timeout. Please try again later.');
            }
            throw error;
        }
    }

    // Fetch user's solved problems
    async fetchUserSubmissions(handle) {
        try {
            const response = await cfAxios.get(`${CF_API_BASE}/user.status`, {
                params: { handle },
                timeout: 20000 // 20 seconds for user submissions
            });
            
            if (response.data.status === 'OK') {
                return response.data.result;
            }
            return [];
        } catch (error) {
            console.error(`Error fetching submissions for ${handle}:`, error.code, error.message);
            // Return empty array on error to continue without user's solved problems
            return [];
        }
    }

    // Get solved problem IDs for a user
    async getSolvedProblems(handle) {
        const submissions = await this.fetchUserSubmissions(handle);
        const solved = new Set();
        
        submissions.forEach(sub => {
            if (sub.verdict === 'OK' && sub.problem) {
                const problemId = `${sub.problem.contestId}-${sub.problem.index}`;
                solved.add(problemId);
            }
        });
        
        return solved;
    }

    // Get unsolved problem for multiple users
    async getUnsolvedProblem(handles, rating, tags = []) {
        try {
            // Fetch all problems
            const allProblems = await this.fetchProblems();
            
            // Fetch solved problems for all handles
            const solvedSets = await Promise.all(
                handles.map(handle => this.getSolvedProblems(handle))
            );
            
            // Filter problems by rating and tags
            let filteredProblems = allProblems.filter(problem => {
                // Check rating
                if (problem.rating !== rating) return false;
                
                // Check tags if specified
                if (tags.length > 0) {
                    const hasAllTags = tags.every(tag => 
                        problem.tags && problem.tags.includes(tag)
                    );
                    if (!hasAllTags) return false;
                }
                
                // Check if problem is unsolved by all players
                const problemId = `${problem.contestId}-${problem.index}`;
                const isSolvedByAny = solvedSets.some(solved => solved.has(problemId));
                
                return !isSolvedByAny;
            });
            
            // Randomly select a problem
            if (filteredProblems.length === 0) {
                // Fallback: just filter by rating if no unsolved found
                filteredProblems = allProblems.filter(p => p.rating === rating);
            }
            
            if (filteredProblems.length === 0) {
                throw new Error('No suitable problem found');
            }
            
            const randomIndex = Math.floor(Math.random() * filteredProblems.length);
            const selectedProblem = filteredProblems[randomIndex];
            
            return {
                contestId: selectedProblem.contestId,
                index: selectedProblem.index,
                name: selectedProblem.name,
                rating: selectedProblem.rating,
                tags: selectedProblem.tags || [],
                link: `https://codeforces.com/problemset/problem/${selectedProblem.contestId}/${selectedProblem.index}`
            };
        } catch (error) {
            console.error('Error getting unsolved problem:', error);
            throw error;
        }
    }

    // Check if user solved a specific problem after a given time
    async checkProblemSolved(handle, contestId, index, afterTime) {
        try {
            const submissions = await this.fetchUserSubmissions(handle);
            
            const solved = submissions.find(sub => {
                const submissionTime = new Date(sub.creationTimeSeconds * 1000);
                return (
                    sub.problem &&
                    sub.problem.contestId === contestId &&
                    sub.problem.index === index &&
                    sub.verdict === 'OK' &&
                    submissionTime >= afterTime
                );
            });
            
            return !!solved;
        } catch (error) {
            console.error(`Error checking solution for ${handle}:`, error);
            return false;
        }
    }
}

module.exports = new CodeforcesService();
