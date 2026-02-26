import { Router } from 'express';
import { settingsRepository } from '../../db/repositories/settingsRepository.js';
import type { AppSettings } from '../../db/repositories/settingsRepository.js';

export function settingsRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(settingsRepository.getAll());
  });

  router.put('/', (req, res) => {
    const body = req.body as Partial<AppSettings>;
    const allowed: Array<keyof AppSettings> = [
      'system_prompt',
      'model',
      'max_tokens',
      'max_history_messages',
    ];

    const updates: Partial<AppSettings> = {};
    for (const key of allowed) {
      if (key in body) {
        updates[key] = body[key] as never;
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No valid fields provided' });
      return;
    }

    settingsRepository.setMany(updates);
    res.json({ success: true, settings: settingsRepository.getAll() });
  });

  return router;
}
