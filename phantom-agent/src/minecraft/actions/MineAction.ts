import type { Bot } from 'mineflayer';
import { goals } from 'mineflayer-pathfinder';
import type { WorldState } from '../../worldstate/WorldState.js';
import type { ExecutionResult } from '../../types/tasks.js';
import type { Action } from './Action.js';

/** Best tool for each ore type */
const ORE_TOOL_MAP: Record<string, string> = {
  coal_ore: 'wooden_pickaxe',
  iron_ore: 'stone_pickaxe',
  gold_ore: 'iron_pickaxe',
  diamond_ore: 'iron_pickaxe',
  deepslate_coal_ore: 'wooden_pickaxe',
  deepslate_iron_ore: 'stone_pickaxe',
  deepslate_gold_ore: 'iron_pickaxe',
  deepslate_diamond_ore: 'iron_pickaxe',
};

export class MineAction implements Action {
  async run(params: Record<string, unknown>, bot: Bot, worldState: WorldState): Promise<ExecutionResult> {
    const blockName = params['block'] as string;
    const count = (params['count'] as number) ?? 1;
    let mined = 0;

    worldState.pushEvent({ type: 'EXECUTING', message: `Mining ${count}x ${blockName}` });

    // Equip best tool if available
    const preferredTool = ORE_TOOL_MAP[blockName];
    if (preferredTool) {
      const tool = bot.inventory.items().find((i) => i.name === preferredTool);
      if (tool) await bot.equip(tool, 'hand').catch(() => {});
    }

    while (mined < count) {
      const blockType = bot.registry.blocksByName[blockName];
      if (!blockType) {
        return { subtaskId: '', success: false, failureType: 'ITEM_NOT_FOUND', message: `Unknown block: ${blockName}` };
      }
      const pos = bot.findBlock({ matching: blockType.id, maxDistance: 64 });
      if (!pos) {
        return { subtaskId: '', success: false, failureType: 'ITEM_NOT_FOUND', message: `No ${blockName} found within 64 blocks` };
      }

      try {
        await bot.pathfinder.goto(new goals.GoalLookAtBlock(pos.position, bot.world));
      } catch {
        return { subtaskId: '', success: false, failureType: 'STUCK', message: `Could not navigate to ${blockName}` };
      }

      try {
        await bot.dig(pos);
        mined++;
        worldState.pushEvent({ type: 'EXECUTING', message: `Mined ${blockName} (${mined}/${count})` });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { subtaskId: '', success: false, failureType: 'STUCK', message };
      }

      await new Promise((r) => setTimeout(r, 400));
    }

    return { subtaskId: '', success: true };
  }
}
