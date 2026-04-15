import type { Bot } from 'mineflayer';
import type { WorldState } from '../worldstate/WorldState.js';
import type { CriticVerdict, Subtask } from '../types/tasks.js';

/** Expected drops per entity type */
const ENTITY_DROP_MAP: Record<string, string[]> = {
  sheep: ['white_wool'],
  cow: ['leather', 'beef'],
  pig: ['porkchop'],
  chicken: ['feather', 'chicken'],
  spider: ['string'],
  skeleton: ['bone', 'arrow'],
  zombie: ['rotten_flesh'],
  creeper: ['gunpowder'],
  enderman: ['ender_pearl'],
  blaze: ['blaze_rod'],
};

export class CriticAgent {
  verify(subtask: Subtask, _bot: Bot, worldState: WorldState): CriticVerdict {
    const params = subtask.parameters;

    switch (subtask.action_type) {
      case 'CHOP':
      case 'MINE': {
        const block = params['block'] as string;
        const expected = params['count'] as number;
        // Map block name to expected item drop
        const itemName = block
          .replace('_log', '_log')      // logs drop as logs
          .replace(/_ore$/, '')         // ores → drop names vary; check for any ore drop
          .replace('deepslate_', '');

        // Accept if inventory has the item or any raw/drop variant
        const hasLog = worldState.hasItem(block);
        const hasRaw = worldState.inventory.some((i) =>
          i.name.includes(itemName) && i.count > 0
        );
        if (!hasLog && !hasRaw) {
          return {
            success: false,
            failureType: 'ITEM_NOT_FOUND',
            message: `Expected ${expected}x ${block} in inventory after ${subtask.action_type}`,
          };
        }
        return { success: true };
      }

      case 'CRAFT': {
        const item = params['item'] as string;
        const quantity = params['quantity'] as number;
        if (!worldState.hasItem(item)) {
          return {
            success: false,
            failureType: 'CRAFT_FAILED',
            message: `Expected ${quantity}x ${item} in inventory after CRAFT`,
          };
        }
        return { success: true };
      }

      case 'KILL': {
        const entity = params['entity'] as string;
        const expectedDrops = ENTITY_DROP_MAP[entity] ?? [];
        if (expectedDrops.length > 0) {
          const hasAnyDrop = expectedDrops.some((drop) => worldState.hasItem(drop));
          if (!hasAnyDrop) {
            return {
              success: false,
              failureType: 'ITEM_NOT_FOUND',
              message: `No drops from ${entity} found in inventory`,
            };
          }
        }
        return { success: true };
      }

      case 'NAVIGATE': {
        const x = params['x'] as number;
        const y = params['y'] as number;
        const z = params['z'] as number;
        const pos = worldState.bot.position;
        const dist = Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2 + (pos.z - z) ** 2);
        if (dist > 5) {
          return {
            success: false,
            failureType: 'STUCK',
            message: `Bot is ${dist.toFixed(1)}m away from target (${x}, ${y}, ${z})`,
          };
        }
        return { success: true };
      }

      case 'PLACE': {
        // Trust the action's own success result — PlaceAction throws on failure
        return { success: true };
      }

      case 'EXPLORE_CAVE': {
        // Success if bot moved underground (y < spawn y) or acquired any ore
        const hasOre = worldState.inventory.some((i) =>
          ['coal', 'iron_ingot', 'gold_ingot', 'diamond', 'raw_iron', 'raw_gold'].some((ore) =>
            i.name.includes(ore)
          )
        );
        if (!hasOre && worldState.bot.position.y > 60) {
          return {
            success: false,
            failureType: 'UNEXPECTED_STATE',
            message: 'Cave exploration ended without finding ore or going underground',
          };
        }
        return { success: true };
      }

      case 'WAIT':
      default:
        return { success: true };
    }
  }
}
