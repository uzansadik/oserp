import type {
  EmailMessage,
  EmailSenderPort,
} from '@oserp-community/iam/application/ports/EmailSenderPort';

/**
 * Dev/test ortamı için e-posta gönderici. Gerçek gönderim yapmaz; mesajı
 * konsola yazar ve gönderilen mesajları bellekte tutar (test doğrulaması için).
 */
export class ConsoleEmailAdapter implements EmailSenderPort {
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
    process.stdout.write(`[email] -> ${message.to}: ${message.subject}\n${message.text}\n`);
  }
}
