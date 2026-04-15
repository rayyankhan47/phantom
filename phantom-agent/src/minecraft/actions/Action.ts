import type { Bot } from 'mineflayer';
import type { WorldState } from '../../worldstate/WorldState.js';
import type { ExecutionResult } from '../../types/tasks.js';

export interface Action {
  run(params: Record<string, unknown>, bot: Bot, worldState: WorldState): Promise<ExecutionResult>;
}
