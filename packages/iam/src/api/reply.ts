import type { FastifyReply } from 'fastify';
import type { ControllerResult } from './types';

/** Controller sonucunu Fastify yanıtına yazar. 204'te gövde gönderilmez. */
export async function sendResult(reply: FastifyReply, result: ControllerResult): Promise<void> {
  if (result.statusCode === 204 || result.body === null) {
    await reply.code(result.statusCode).send();
    return;
  }
  await reply.code(result.statusCode).send(result.body);
}
