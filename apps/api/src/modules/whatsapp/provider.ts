import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';

// Provider adapter isolates the WhatsApp provider (Meta Cloud API) behind a
// narrow interface so the platform never depends on a specific vendor.
// MetaProvider talks to the real Meta Graph API; MockProvider is used in dev
// until a real number + token are configured.

export type OutboundMessage = {
  tenantId: string;
  to: string;
  messageType: string;
  content?: string | null;
  media?: unknown;
};

export type SendTextInput = { to: string; text: string; previewUrl?: boolean };
export type SendTemplateInput = {
  to: string;
  template: { name: string; language: { code: string }; components?: unknown[] };
};
export type SendInteractiveInput = { to: string; interactive: unknown };
export type SendMediaInput = {
  to: string;
  media: { type: 'image' | 'document' | 'audio' | 'video' | 'sticker'; link?: string; caption?: string; filename?: string };
};
export type MarkAsReadInput = { messageId: string };
export type DeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'unknown';

export type SendResult = { providerMessageId: string };

export interface WhatsAppProvider {
  send(outbound: OutboundMessage): Promise<SendResult>;
  sendText(input: SendTextInput): Promise<SendResult>;
  sendTemplate(input: SendTemplateInput): Promise<SendResult>;
  sendInteractive(input: SendInteractiveInput): Promise<SendResult>;
  sendMedia(input: SendMediaInput): Promise<SendResult>;
  markAsRead(input: MarkAsReadInput): Promise<void>;
  getMessageStatus(messageId: string): Promise<DeliveryStatus>;
}

export class ProviderError extends Error {
  constructor(message: string, readonly status?: number, readonly meta?: unknown) {
    super(message);
    this.name = 'ProviderError';
  }
}

const META_ENDPOINT = (version: string, phoneNumberId: string) =>
  `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

async function metaPost(path: string, body: unknown): Promise<SendResult> {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new ProviderError(`Meta API error ${res.status}`, res.status, detail);
  }
  const payload = (await res.json()) as { messages?: { id?: string }[] };
  return { providerMessageId: payload.messages?.[0]?.id ?? `meta_${randomUUID()}` };
}

function assertMetaConfig(): void {
  if (!env.WHATSAPP_API_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new ProviderError('WhatsApp Meta provider is not configured (WHATSAPP_API_TOKEN / WHATSAPP_PHONE_NUMBER_ID)');
  }
}

class MetaProvider implements WhatsAppProvider {
  private endpoint(): string {
    assertMetaConfig();
    return META_ENDPOINT(env.WHATSAPP_API_VERSION, env.WHATSAPP_PHONE_NUMBER_ID);
  }

  async sendText(input: SendTextInput): Promise<SendResult> {
    return metaPost(this.endpoint(), {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: input.to,
      type: 'text',
      text: { preview_url: input.previewUrl ?? false, body: input.text },
    });
  }

  async sendTemplate(input: SendTemplateInput): Promise<SendResult> {
    return metaPost(this.endpoint(), {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: input.to,
      type: 'template',
      template: input.template,
    });
  }

  async sendInteractive(input: SendInteractiveInput): Promise<SendResult> {
    return metaPost(this.endpoint(), {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: input.to,
      type: 'interactive',
      interactive: input.interactive,
    });
  }

  async sendMedia(input: SendMediaInput): Promise<SendResult> {
    return metaPost(this.endpoint(), {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: input.to,
      type: input.media.type,
      [input.media.type]: {
        link: input.media.link,
        caption: input.media.caption,
        filename: input.media.filename,
      },
    });
  }

  async markAsRead(input: MarkAsReadInput): Promise<void> {
    await metaPost(this.endpoint(), {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: input.messageId,
    });
  }

  async getMessageStatus(messageId: string): Promise<DeliveryStatus> {
    if (!env.WHATSAPP_API_TOKEN) throw new ProviderError('Meta provider is not configured');
    const res = await fetch(`https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${messageId}`, {
      headers: { Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}` },
    });
    if (!res.ok) return 'unknown';
    const payload = (await res.json()) as { statuses?: { status?: string; [k: string]: unknown }[] };
    const status = payload.statuses?.[0]?.status;
    switch (status) {
      case 'sent':
      case 'delivered':
      case 'read':
      case 'failed':
        return status;
      default:
        return 'unknown';
    }
  }

  async send(outbound: OutboundMessage): Promise<SendResult> {
    switch (outbound.messageType) {
      case 'TEXT':
        return this.sendText({ to: outbound.to, text: outbound.content ?? '' });
      case 'IMAGE':
      case 'DOCUMENT':
      case 'AUDIO':
      case 'VIDEO':
      case 'STICKER': {
        const media = outbound.media as { link?: string; type?: string; caption?: string; filename?: string } | undefined;
        return this.sendMedia({
          to: outbound.to,
          media: {
            type: (media?.type as SendMediaInput['media']['type']) ?? outbound.messageType.toLowerCase(),
            link: media?.link,
            caption: media?.caption,
            filename: media?.filename,
          },
        });
      }
      default:
        return this.sendText({ to: outbound.to, text: outbound.content ?? '' });
    }
  }
}

class MockProvider implements WhatsAppProvider {
  private async simulate(): Promise<void> {
    await new Promise((r) => setTimeout(r, 120));
  }

  async sendText(): Promise<SendResult> {
    await this.simulate();
    return { providerMessageId: `mock_${randomUUID()}` };
  }

  async sendTemplate(): Promise<SendResult> {
    await this.simulate();
    return { providerMessageId: `mock_${randomUUID()}` };
  }

  async sendInteractive(): Promise<SendResult> {
    await this.simulate();
    return { providerMessageId: `mock_${randomUUID()}` };
  }

  async sendMedia(): Promise<SendResult> {
    await this.simulate();
    return { providerMessageId: `mock_${randomUUID()}` };
  }

  async markAsRead(): Promise<void> {
    await this.simulate();
  }

  async getMessageStatus(): Promise<DeliveryStatus> {
    await this.simulate();
    return 'sent';
  }

  async send(): Promise<SendResult> {
    await this.simulate();
    return { providerMessageId: `mock_${randomUUID()}` };
  }
}

export function getProvider(): WhatsAppProvider {
  return env.WHATSAPP_API_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID ? new MetaProvider() : new MockProvider();
}

export const provider: WhatsAppProvider = getProvider();