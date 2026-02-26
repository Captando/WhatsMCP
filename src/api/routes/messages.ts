import { Router } from 'express';
import { messageRepository } from '../../db/repositories/messageRepository.js';
import { chatRepository } from '../../db/repositories/chatRepository.js';

export function messagesRouter(): Router {
  const router = Router();

  router.get('/:jid', (req, res) => {
    const jid = decodeURIComponent(req.params.jid);
    const limit = Math.min(parseInt((req.query.limit as string) ?? '50', 10), 200);

    const chat = chatRepository.findByJid(jid);
    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }

    const messages = messageRepository.getForJid(jid, limit);
    res.json({ jid, chat, messages });
  });

  router.delete('/:jid', (req, res) => {
    const jid = decodeURIComponent(req.params.jid);
    messageRepository.clearForJid(jid);
    res.json({ success: true });
  });

  return router;
}
