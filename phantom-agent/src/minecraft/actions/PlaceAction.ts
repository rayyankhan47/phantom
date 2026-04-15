import type { Bot } from 'mineflayer';
import { goals } from 'mineflayer-pathfinder';
import type { WorldState } from '../../worldstate/WorldState.js';
import type { ExecutionResult } from '../../types/tasks.js';
import type { Action } from './Action.js';

export class PlaceAction implements Action {
  async run(params: Record<string, unknown>, bot: Bot, worldState: WorldState): Promise<ExecutionResult> {
    const blockName = params['block'] as string;
    const x = params['x'] as number;
    const y = params['y'] as number;
    const z = params['z'] as number;

    worldState.pushEvent({ type: 'EXECUTING', message: `Placing ${blockName} at (${x}, ${y}, ${z})` });

    const item = bot.inventory.items().find((i) => i.name === blockName);
    if (!item) {
      return { subtaskId: '', success: false, failureType: 'ITEM_NOT_FOUND', message: `No ${blockName} in inventory` };
    }

    await bot.equip(item, 'hand');

    try {
      await bot.pathfinder.goto(new goals.GoalNear(x, y, z, 3));
    } catch {
      return { subtaskId: '', success: false, failureType: 'STUCK', message: `Could not navigate to placement site` };
    }

    const referenceBlock = bot.blockAt({ x, y: y - 1, z } as Parameters<typeof bot.blockAt>[0]);
    if (!referenceBlock) {
      return { subtaskId: '', success: false, failureType: 'UNEXPECTED_STATE', message: 'No surface block to place against' };
    }

    try {
      await bot.placeBlock(referenceBlock, { x: 0, y: 1, z: 0 } as Parameters<typeof bot.placeBlock>[1]);
      return { subtaskId: '', success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      worldState.pushEvent({ type: 'ERROR', message: `Place failed: ${message}` });
      return { subtaskId: '', success: false, failureType: 'UNEXPECTED_STATE', message };
    }
  }
}
