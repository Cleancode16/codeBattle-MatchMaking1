const express = require('express');
const router = express.Router();
const battleController = require('../controllers/battleController');

router.get('/battles', battleController.getAllBattles);
router.get('/battles/:id', battleController.getBattle);
router.post('/battles', battleController.createBattle);
router.patch('/battles/:id', battleController.updateBattle);
router.delete('/battles/:id', battleController.deleteBattle);

module.exports = router;
