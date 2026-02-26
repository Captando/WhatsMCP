import { Router } from 'express';
import QRCode from 'qrcode';
import type { WhatsAppClient } from '../../whatsapp/whatsappClient.js';

export function statusRouter(whatsapp: WhatsAppClient): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    const qrString = whatsapp.getQrCode();
    let qrDataUrl: string | null = null;

    if (qrString) {
      try {
        qrDataUrl = await QRCode.toDataURL(qrString);
      } catch {
        qrDataUrl = null;
      }
    }

    res.json({
      status: whatsapp.getStatus(),
      qr: qrDataUrl,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
