import type { Bot } from 'mineflayer';
import { pathfinder, goals } from 'mineflayer-pathfinder';
import type { WorldState } from '../../worldstate/WorldState.js';
import type { ExecutionResult } from '../../types/tasks.js';
import type { Action } from './Action.js';

export class NavigateAction implements Action {
  async run(params: Record<string, unknown>, bot: Bot, worldState: WorldState): Promise<ExecutionResult> {
    const x = params['x'] as number;
    const y = params['y'] as number;
    const z = params['z'] as number;

    worldState.pushEvent({ type: 'EXECUTING', message: `Navigating to (${x}, ${y}, ${z})` });

    try {
      await bot.pathfinder.goto(new goals.GoalBlock(x, y, z));
      return { subtaskId: '', success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      worldState.pushEvent({ type: 'ERROR', message: `Navigate failed: ${message}` });
      return { subtaskId: '', success: false, failureType: 'STUCK', message };
    }
  }
}
