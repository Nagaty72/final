import express from 'express';
import * as chatController from '../controllers/chat.controller.js';

const router = express.Router();

/**
 * Chat Routes
 * ===========
 */

router.get('/conversations', chatController.getConversations);
router.post('/conversations', chatController.createConversation);
router.delete('/conversations/:id', chatController.deleteConversation);

router.get('/conversations/:id/messages', chatController.getMessages);
router.post('/send', chatController.sendMessage);

export default router;
