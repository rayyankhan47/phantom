import type { Bot } from 'mineflayer';
import type { WorldState } from '../../worldstate/WorldState.js';
import type { ExecutionResult } from '../../types/tasks.js';
import type { Action } from './Action.js';

export class WaitAction implements Action {
  async run(params: Record<string, unknown>, _bot: Bot, worldState: WorldState): Promise<ExecutionResult> {
    const seconds = typeof params['seconds'] === 'number' ? params['seconds'] : 1;
    worldState.pushEvent({ type: 'EXECUTING', message: `Waiting ${seconds}s` });
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    return { subtaskId: '', success: true };
  }
}
