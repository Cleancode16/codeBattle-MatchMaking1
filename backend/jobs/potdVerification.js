const cron = require('node-cron');
const potdService = require('../services/potdService');

// Run every 2 hours
// Cron pattern: '0 */2 * * *' means "at minute 0 of every 2nd hour"
const startPOTDVerificationJob = () => {
    console.log('🕐 Starting POTD auto-verification job (runs every 2 hours)...');
    
    // Run every 2 hours
    cron.schedule('0 */2 * * *', async () => {
        console.log('\n=================================');
        console.log('🔍 Running POTD auto-verification...');
        console.log(`Time: ${new Date().toLocaleString()}`);
        console.log('=================================\n');
        
        try {
            await potdService.verifyAllSubmissions();
        } catch (error) {
            console.error('❌ POTD verification job failed:', error);
        }
    });

    // Also run once on startup
    console.log('🚀 Running initial POTD verification...');
    setTimeout(async () => {
        try {
            await potdService.verifyAllSubmissions();
        } catch (error) {
            console.error('❌ Initial POTD verification failed:', error);
        }
    }, 5000); // Wait 5 seconds after server start
};

module.exports = { startPOTDVerificationJob };
