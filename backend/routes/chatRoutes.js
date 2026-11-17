import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { messagingRateLimiter } from '../middleware/rateLimiter.js';
import {
    sendMessage,
    getMessages,
    getConversations,
    markAsRead,
    getUnreadCount
} from '../controllers/chatController.js';

const router = express.Router();

router.use(protect);

router.post('/messages', messagingRateLimiter, sendMessage);
router.get('/messages/:otherUserId', getMessages);
router.get('/conversations', getConversations);
router.put('/read/:otherUserId', markAsRead);
router.get('/unread-count', getUnreadCount);

export default router;
