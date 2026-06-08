import type IDomainEvent from '@oserp-community/iam/interfaces/IDomainEvent';
import { describe, expect, it, vi } from 'vitest';
import { InMemoryEventBus } from '../../../src/infrastructure/event-store/InMemoryEventBus';

function makeEvent(eventName: string): IDomainEvent {
  return {
    eventName,
    aggregateId: '11111111-1111-4111-8111-111111111111',
    occurredOn: new Date(),
  };
}

describe('InMemoryEventBus', () => {
  it('event adina kayitli handlerlari cagirir', async () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();
    bus.subscribe('UserCreated', handler);

    const event = makeEvent('UserCreated');
    await bus.publish(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('kayitli olmayan event icin sessizce gecer', async () => {
    const bus = new InMemoryEventBus();
    await expect(bus.publish(makeEvent('Unknown'))).resolves.toBeUndefined();
  });

  it('ayni event icin birden fazla handler calistirir', async () => {
    const bus = new InMemoryEventBus();
    const first = vi.fn();
    const second = vi.fn();
    bus.subscribe('RoleCreated', first);
    bus.subscribe('RoleCreated', second);

    await bus.publish(makeEvent('RoleCreated'));

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('bir handler hata firlatsa bile digerleri calisir ve hata toplanir', async () => {
    const bus = new InMemoryEventBus();
    const failing = vi.fn().mockRejectedValue(new Error('patladi'));
    const succeeding = vi.fn();
    bus.subscribe('SessionStarted', failing);
    bus.subscribe('SessionStarted', succeeding);

    await expect(bus.publish(makeEvent('SessionStarted'))).rejects.toBeInstanceOf(AggregateError);
    expect(succeeding).toHaveBeenCalledTimes(1);
  });

  it('publishAll tum eventleri yayinlar', async () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();
    bus.subscribe('A', handler);
    bus.subscribe('B', handler);

    await bus.publishAll([makeEvent('A'), makeEvent('B')]);

    expect(handler).toHaveBeenCalledTimes(2);
  });
});
