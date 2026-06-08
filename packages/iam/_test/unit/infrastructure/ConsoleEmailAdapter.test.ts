import { describe, expect, it } from 'vitest';
import { ConsoleEmailAdapter } from '../../../src/infrastructure/email/ConsoleEmailAdapter';

describe('ConsoleEmailAdapter', () => {
  it('gonderilen mesajlari bellekte tutar', async () => {
    const adapter = new ConsoleEmailAdapter();
    await adapter.send({ to: 'a@b.com', subject: 'Merhaba', text: 'Govde' });
    await adapter.send({ to: 'c@d.com', subject: 'Tekrar', text: 'Govde2' });

    expect(adapter.sent).toHaveLength(2);
    expect(adapter.sent[0]).toMatchObject({ to: 'a@b.com', subject: 'Merhaba' });
    expect(adapter.sent[1]).toMatchObject({ to: 'c@d.com', subject: 'Tekrar' });
  });
});
