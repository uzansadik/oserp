import type { ClockPort } from '@oserp-community/inventory/application/ports/ClockPort';

/** Test'lerde deterministik zaman için kullanılır. */
export class FakeClock implements ClockPort {
  private current: Date;

  constructor(initial: Date = new Date('2026-01-01T00:00:00Z')) {
    this.current = initial;
  }

  now(): Date {
    return new Date(this.current);
  }

  set(d: Date): void {
    this.current = d;
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
