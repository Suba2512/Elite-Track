import { Router, Request, Response } from 'express';
import { ENV } from '../config/env.js';
import { WhatsAppService } from '../services/notifications/WhatsAppService.js';

export const whatsappRouter = Router();

/**
 * Meta WhatsApp Webhook Verification endpoint.
 * Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
 */
whatsappRouter.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === ENV.WHATSAPP_VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook] Verification successful. Challenge confirmed.');
    res.status(200).send(challenge);
  } else {
    console.warn('[WhatsApp Webhook] Verification failed. Tokens do not match.');
    res.sendStatus(403);
  }
});

/**
 * Meta WhatsApp Webhook event intake for message status tracking (sent, delivered, read, failed).
 */
whatsappRouter.post('/webhook', (req: Request, res: Response) => {
  const payload = req.body;
  const result = WhatsAppService.processWebhookPayload(payload);
  res.status(200).json({ status: 'ok', processed: result.processedCount });
});
