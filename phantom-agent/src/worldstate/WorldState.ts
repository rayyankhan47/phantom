import type { InventoryItem, NearbyBlock, NearbyEntity, Vec3Like } from '../types/minecraft.js';
import type { AgentEvent, SessionStatus } from '../types/events.js';
import type { FailureRecord, Subtask } from '../types/tasks.js';

export interface BotSnapshot {
  username: string;
  position: Vec3Like;
  health: number;
  food: number;
  gameMode: string;
}

export interface WorldSnapshot {
  nearbyBlocks: NearbyBlock[];
  nearbyEntities: NearbyEntity[];
  timeOfDay: number;
  isRaining: boolean;
}

export interface SessionState {
  goal: string;
  status: SessionStatus;
  plan: Subtask[];
  currentSubtaskIndex: number;
  completedSubtasks: Subtask[];
  failures: FailureRecord[];
  attempts: number;
  startTime: number;
}

export interface WorldState {
  bot: BotSnapshot;
  inventory: InventoryItem[];
  world: WorldSnapshot;
  session: SessionState;
  events: AgentEvent[];

  hasItem(name: string): boolean;
  countOf(name: string): number;
  pushEvent(event: Omit<AgentEvent, 'id' | 'timestamp'>): void;
}

export function createEmpty(): WorldState {
  const inventory: InventoryItem[] = [];
  const events: AgentEvent[] = [];
  let _eventCounter = 0;

  return {
    bot: {
      username: '',
      position: { x: 0, y: 0, z: 0 },
      health: 20,
      food: 20,
      gameMode: 'survival',
    },
    inventory,
    world: {
      nearbyBlocks: [],
      nearbyEntities: [],
      timeOfDay: 0,
      isRaining: false,
    },
    session: {
      goal: '',
      status: 'IDLE',
      plan: [],
      currentSubtaskIndex: 0,
      completedSubtasks: [],
      failures: [],
      attempts: 0,
      startTime: 0,
    },
    events,

    hasItem(name: string): boolean {
      return inventory.some((i) => i.name === name && i.count > 0);
    },

    countOf(name: string): number {
      return inventory
        .filter((i) => i.name === name)
        .reduce((sum, i) => sum + i.count, 0);
    },

    pushEvent(event: Omit<AgentEvent, 'id' | 'timestamp'>): void {
      events.push({
        ...event,
        id: `evt-${++_eventCounter}`,
        timestamp: Date.now(),
      });
      // Keep only the last 100 events in memory
      if (events.length > 100) events.splice(0, events.length - 100);
    },
  };
}
