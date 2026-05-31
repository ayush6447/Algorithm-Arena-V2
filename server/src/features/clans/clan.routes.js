const express = require('express');
const router = express.Router();
const { protect, admin } = require('../../../middleware/auth');
const { validate } = require('../../../middleware/validate');
const {
  getClans,
  getClan,
  getMyClan,
  getClanLeaderboard,
  createClan,
  updateClan,
  archiveClan,
  restoreClan,
  deleteClan,
  joinClan,
  leaveClan,
  assignChief,
  addMember,
  removeMember,
  approveJoinRequest,
  rejectJoinRequest,
  addClanNotice,
  removeClanNotice,
  getClanAdminStats,
} = require('./clan.controller');
const {
  clanIdParamsSchema,
  clanUserParamsSchema,
  clanNoticeIndexParamsSchema,
  clanCreateSchema,
  clanUpdateSchema,
  clanAssignChiefSchema,
  clanAddMemberSchema,
  clanNoticeCreateSchema,
  clanLeaderboardQuerySchema,
} = require('../../../validators/clanSchemas');

// Public / authenticated routes
router.get('/', protect, getClans);
router.get('/leaderboard', protect, validate(clanLeaderboardQuerySchema), getClanLeaderboard);
router.get('/mine', protect, getMyClan); // MUST be before /:id
router.get('/:id', protect, validate(clanIdParamsSchema), getClan);

// User actions
router.post('/:id/join', protect, validate(clanIdParamsSchema), joinClan);
router.post('/:id/leave', protect, validate(clanIdParamsSchema), leaveClan);
router.post('/:id/approve/:userId', protect, validate(clanUserParamsSchema), approveJoinRequest);
router.post('/:id/reject/:userId', protect, validate(clanUserParamsSchema), rejectJoinRequest);
router.post('/:id/notices', protect, validate(clanIdParamsSchema), validate(clanNoticeCreateSchema), addClanNotice);
router.delete('/:id/notices/:index', protect, validate(clanNoticeIndexParamsSchema), removeClanNotice);

// Admin-only routes
router.get('/:id/admin-stats', protect, admin, validate(clanIdParamsSchema), getClanAdminStats);
router.post('/', protect, admin, validate(clanCreateSchema), createClan);
router.put('/:id', protect, admin, validate(clanIdParamsSchema), validate(clanUpdateSchema), updateClan);
router.patch('/:id/archive', protect, validate(clanIdParamsSchema), archiveClan);
router.patch('/:id/restore', protect, admin, validate(clanIdParamsSchema), restoreClan);
router.delete('/:id', protect, admin, validate(clanIdParamsSchema), deleteClan);
router.put('/:id/chief', protect, admin, validate(clanIdParamsSchema), validate(clanAssignChiefSchema), assignChief);
router.post('/:id/members', protect, admin, validate(clanIdParamsSchema), validate(clanAddMemberSchema), addMember);
router.delete('/:id/members/:userId', protect, validate(clanUserParamsSchema), removeMember);

module.exports = router;
