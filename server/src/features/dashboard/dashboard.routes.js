const express = require('express');
const { protect, admin } = require('../../../middleware/auth');
const { getDashboardSummary, getAdminDashboardSummary, getPendingTasks } = require('./dashboard.controller');

const router = express.Router();

router.get('/summary', protect, getDashboardSummary);
router.get('/admin-summary', protect, admin, getAdminDashboardSummary);
router.get('/pending-tasks', protect, getPendingTasks);

module.exports = router;

