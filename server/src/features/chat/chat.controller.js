const ChatMessage = require('./ChatMessage.model');
const Clan = require('../clans/Clan.model');
const { emitToRoom } = require('../../../config/socket');

/**
 * Verify the requesting user is a member or chief of the given clan.
 * Returns the clan document on success, or sends a 403 and returns null.
 */
const requireClanMembership = async (req, res, clanId) => {
  const userId = req.user._id;
  const clan = await Clan.findOne({
    _id: clanId,
    $or: [{ members: userId }, { chief: userId }],
  });
  if (!clan || clan.status === 'archived') {
    res.status(403).json({ success: false, message: 'This clan is archived and chat is disabled' });
    return null;
  }
  return clan;
};

// @desc    Get chat history for a clan
// @route   GET /api/chat/:clanId
// @access  Private (clan members only)
exports.getChatHistory = async (req, res, next) => {
  try {
    const { clanId } = req.params;

    const clan = await requireClanMembership(req, res, clanId);
    if (!clan) return; // 403 already sent

    const messages = await ChatMessage.find({ clanId })
      .populate('sender', 'username role profilePicture')
      .sort('-createdAt')
      .limit(50);

    // Reverse to send oldest to newest for UI
    res.status(200).json({ success: true, data: messages.reverse() });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message to a clan
// @route   POST /api/chat/:clanId
// @access  Private (clan members only)
exports.sendMessage = async (req, res, next) => {
  try {
    const { clanId } = req.params;
    const { content, isDoubt } = req.body;

    const clan = await requireClanMembership(req, res, clanId);
    if (!clan) return; // 403 already sent

    const message = await ChatMessage.create({
      clanId,
      sender: req.user._id,
      content,
      isDoubt: isDoubt || false,
    });

    const populatedMessage = await ChatMessage.findById(message._id)
      .populate('sender', 'username role profilePicture');

    emitToRoom(`clan_${clanId}`, 'new_message', populatedMessage);

    res.status(201).json({ success: true, data: populatedMessage });
  } catch (error) {
    next(error);
  }
};
