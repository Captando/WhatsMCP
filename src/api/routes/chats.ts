import { Router } from 'express';
import { chatRepository } from '../../db/repositories/chatRepository.js';

export function chatsRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(chatRepository.getAll());
  });

  router.patch('/:jid/agent', (req, res) => {
    const { jid } = req.params;
    const { active } = req.body as { active: boolean };

    if (typeof active !== 'boolean') {
      res.status(400).json({ error: '"active" must be a boolean' });
      return;
    }

    const chat = chatRepository.findByJid(jid);
    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }

    chatRepository.setAgentActive(jid, active);
    res.json({ success: true, jid, agent_active: active });
  });

  return router;
}
