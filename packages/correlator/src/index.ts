import { SentinelEvent } from '@sentinelops/graph';

// In-process event queue — interface allows swapping to Redis/Bull later
export interface IEventQueue {
  enqueue(event: SentinelEvent): Promise<void>;
  process(handler: (event: SentinelEvent) => Promise<void>): void;
}

// TODO: Members 3/4 implement SimpleEventQueue
export class SimpleEventQueue implements IEventQueue {
  private queue: SentinelEvent[] = [];
  private handler?: (event: SentinelEvent) => Promise<void>;

  async enqueue(event: SentinelEvent): Promise<void> {
    this.queue.push(event);
    if (this.handler) {
      const next = this.queue.shift();
      if (next) await this.handler(next);
    }
  }

  process(handler: (event: SentinelEvent) => Promise<void>): void {
    this.handler = handler;
  }
}

export const eventQueue = new SimpleEventQueue();
