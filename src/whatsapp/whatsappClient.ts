import makeWASocket, {
  DisconnectReason,
  type WASocket,
  type ConnectionState,
  type WAMessage,
  type MessageUpsertType,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { getDb } from '../db/database.js';
import { useSQLiteAuthState } from './authState.js';
import type { ClaudeAgent } from '../agent/claudeAgent.js';
import { handleMessagesUpsert } from './messageHandler.js';

type ConnectionStatus = 'disconnected' | 'connecting' | 'open';

export class WhatsAppClient {
  private sock: WASocket | null = null;
  private qrCode: string | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private agent: ClaudeAgent | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_DELAY = 60_000;

  async connect(agent: ClaudeAgent): Promise<void> {
    this.agent = agent;
    await this.createSocket();
  }

  private async createSocket(): Promise<void> {
    const { state, saveCreds } = await useSQLiteAuthState(getDb());

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: 'silent' }),
      browser: ['ChatMCP', 'Chrome', '1.0.0'],
      syncFullHistory: false,
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrCode = qr;
        console.log('[WA] QR code ready — scan with WhatsApp');
      }

      if (connection === 'open') {
        this.connectionStatus = 'open';
        this.qrCode = null;
        this.reconnectAttempts = 0;
        console.log('[WA] Connected');
      } else if (connection === 'connecting') {
        this.connectionStatus = 'connecting';
      } else if (connection === 'close') {
        this.connectionStatus = 'disconnected';
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        console.log(`[WA] Disconnected — code: ${statusCode}`);

        if (statusCode === DisconnectReason.loggedOut) {
          console.log('[WA] Logged out — clear auth and restart to re-authenticate');
          return;
        }

        const delay = this.nextReconnectDelay();
        console.log(`[WA] Reconnecting in ${Math.round(delay / 1000)}s...`);
        setTimeout(() => this.createSocket(), delay);
      }
    });

    this.sock.ev.on(
      'messages.upsert',
      ({ messages, type }: { messages: WAMessage[]; type: MessageUpsertType }) => {
        if (this.agent) {
          handleMessagesUpsert({ messages, type }, this.sock!, this.agent);
        }
      }
    );
  }

  private nextReconnectDelay(): number {
    const base = Math.min(1_000 * Math.pow(2, this.reconnectAttempts), this.MAX_RECONNECT_DELAY);
    const jitter = Math.random() * 0.3 * base;
    this.reconnectAttempts++;
    return base + jitter;
  }

  getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  getQrCode(): string | null {
    return this.qrCode;
  }

  getSock(): WASocket | null {
    return this.sock;
  }
}

export const whatsappClient = new WhatsAppClient();
