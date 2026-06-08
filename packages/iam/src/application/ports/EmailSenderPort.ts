export type EmailMessage = {
  to: string;
  subject: string;
  /** Düz metin gövde. */
  text: string;
  /** Opsiyonel HTML gövde. */
  html?: string;
};

export interface EmailSenderPort {
  send(message: EmailMessage): Promise<void>;
}
