import type { Bot } from 'mineflayer';
import { goals } from 'mineflayer-pathfinder';
import type { WorldState } from '../../worldstate/WorldState.js';
import type { ExecutionResult } from '../../types/tasks.js';
import type { Action } from './Action.js';

export class ChopAction implements Action {
  async run(params: Record<string, unknown>, bot: Bot, worldState: WorldState): Promise<ExecutionResult> {
    const blockName = params['block'] as string;
    const count = (params['count'] as number) ?? 1;
    let chopped = 0;

    worldState.pushEvent({ type: 'EXECUTING', message: `Chopping ${count}x ${blockName}` });

    while (chopped < count) {
      // FINDING_BLOCK
      const blockType = bot.registry.blocksByName[blockName];
      if (!blockType) {
        return { subtaskId: '', success: false, failureType: 'ITEM_NOT_FOUND', message: `Unknown block: ${blockName}` };
      }
      const pos = bot.findBlock({ matching: blockType.id, maxDistance: 64 });
      if (!pos) {
        return { subtaskId: '', success: false, failureType: 'ITEM_NOT_FOUND', message: `No ${blockName} found within 64 blocks` };
      }

      // NAVIGATING
      try {
        await bot.pathfinder.goto(new goals.GoalLookAtBlock(pos.position, bot.world));
      } catch {
        return { subtaskId: '', success: false, failureType: 'STUCK', message: `Could not navigate to ${blockName}` };
      }

      // CHOPPING
      try {
        await bot.dig(pos);
        chopped++;
        worldState.pushEvent({ type: 'EXECUTING', message: `Chopped ${blockName} (${chopped}/${count})` });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { subtaskId: '', success: false, failureType: 'STUCK', message };
      }

      // COLLECTING — brief wait for drops
      await new Promise((r) => setTimeout(r, 500));
      await bot.collectBlock.collect(bot.findBlock({ matching: (b) => b.name === blockName.replace('_log', '_planks') || false, maxDistance: 3 }) ?? pos).catch(() => {});
    }

    return { subtaskId: '', success: true };
  }
}
