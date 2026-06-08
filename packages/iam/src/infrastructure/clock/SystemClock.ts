import type { ClockPort } from '@oserp-community/iam/application/ports/ClockPort';

/** Gerçek sistem saatini kullanan ClockPort adapter'ı. */
export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
