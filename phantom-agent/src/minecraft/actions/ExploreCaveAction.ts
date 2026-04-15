import type { Bot } from 'mineflayer';
import { goals } from 'mineflayer-pathfinder';
import type { WorldState } from '../../worldstate/WorldState.js';
import type { ExecutionResult } from '../../types/tasks.js';
import type { Action } from './Action.js';

type CaveState = 'FINDING_ENTRANCE' | 'ENTERING' | 'SCAN' | 'NAVIGATE' | 'MINE' | 'TORCH_CHECK' | 'DONE';

const ORE_BLOCKS = [
  'coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore',
  'deepslate_coal_ore', 'deepslate_iron_ore', 'deepslate_gold_ore', 'deepslate_diamond_ore',
];
const DARK_THRESHOLD_BLOCKS = 12; // place a torch every N blocks of travel

export class ExploreCaveAction implements Action {
  async run(params: Record<string, unknown>, bot: Bot, worldState: WorldState): Promise<ExecutionResult> {
    worldState.pushEvent({ type: 'EXECUTING', message: 'Starting cave exploration' });

    let state: CaveState = 'FINDING_ENTRANCE';
    let blocksTravelled = 0;
    let lastTorchPos = bot.entity.position.clone();
    const maxIterations = 200;
    let iter = 0;

    while (state !== 'DONE' && iter++ < maxIterations) {
      switch (state) {
        case 'FINDING_ENTRANCE': {
          // Look for cave_air below ground level
          const caveAir = bot.findBlock({
            matching: (b) => b.name === 'air' && b.position.y < bot.entity.position.y - 3,
            maxDistance: 32,
          });
          if (caveAir) {
            worldState.pushEvent({ type: 'EXECUTING', message: `Cave entrance found at (${caveAir.position.x}, ${caveAir.position.y}, ${caveAir.position.z})` });
            state = 'ENTERING';
          } else {
            worldState.pushEvent({ type: 'EXECUTING', message: 'No cave entrance found nearby' });
            return { subtaskId: '', success: false, failureType: 'ITEM_NOT_FOUND', message: 'No cave entrance within 32 blocks' };
          }
          break;
        }

        case 'ENTERING': {
          // Navigate downward into the cave by following the lowest reachable air pocket
          const target = bot.findBlock({
            matching: (b) => b.name === 'air' && b.position.y < bot.entity.position.y - 2,
            maxDistance: 20,
          });
          if (target) {
            try {
              await bot.pathfinder.goto(new goals.GoalBlock(target.position.x, target.position.y, target.position.z));
              state = 'SCAN';
            } catch {
              state = 'SCAN'; // proceed even if pathfinder fails
            }
          } else {
            state = 'SCAN';
          }
          break;
        }

        case 'SCAN': {
          // Look for ore within range
          const oreBlockIds = ORE_BLOCKS.map((name) => bot.registry.blocksByName[name]?.id).filter((id): id is number => id !== undefined);
          const ore = bot.findBlock({ matching: oreBlockIds, maxDistance: 16 });
          if (ore) {
            state = 'MINE';
          } else {
            state = 'NAVIGATE';
          }
          break;
        }

        case 'NAVIGATE': {
          // Explore deeper — pick a random reachable air block below current y
          const nextPos = bot.findBlock({
            matching: (b) => b.name === 'air' && b.position.y <= bot.entity.position.y,
            maxDistance: 16,
          });
          if (!nextPos) {
            state = 'DONE';
            break;
          }
          try {
            const before = bot.entity.position.clone();
            await bot.pathfinder.goto(new goals.GoalNear(nextPos.position.x, nextPos.position.y, nextPos.position.z, 1));
            blocksTravelled += bot.entity.position.distanceTo(before);
          } catch {
            // continue
          }
          state = 'TORCH_CHECK';
          break;
        }

        case 'MINE': {
          const oreBlockIds = ORE_BLOCKS.map((name) => bot.registry.blocksByName[name]?.id).filter((id): id is number => id !== undefined);
          const ore = bot.findBlock({ matching: oreBlockIds, maxDistance: 16 });
          if (!ore) { state = 'SCAN'; break; }

          try {
            await bot.pathfinder.goto(new goals.GoalLookAtBlock(ore.position, bot.world));
            await bot.dig(ore);
            worldState.pushEvent({ type: 'EXECUTING', message: `Mined ${ore.name}` });
          } catch {
            // non-fatal
          }
          await new Promise((r) => setTimeout(r, 400));
          state = 'TORCH_CHECK';
          break;
        }

        case 'TORCH_CHECK': {
          if (blocksTravelled - lastTorchPos.distanceTo(bot.entity.position) > DARK_THRESHOLD_BLOCKS) {
            const torchItem = bot.inventory.items().find((i) => i.name === 'torch');
            if (torchItem) {
              await bot.equip(torchItem, 'hand');
              const wallBlock = bot.findBlock({
                matching: (b) => b.name !== 'air' && b.name !== 'cave_air',
                maxDistance: 2,
              });
              if (wallBlock) {
                try {
                  await bot.placeBlock(wallBlock, { x: 0, y: 1, z: 0 } as Parameters<typeof bot.placeBlock>[1]);
                  worldState.pushEvent({ type: 'EXECUTING', message: 'Placed torch' });
                  lastTorchPos = bot.entity.position.clone();
                } catch {
                  // non-fatal
                }
              }
            }
          }
          state = 'SCAN';
          break;
        }
      }
    }

    worldState.pushEvent({ type: 'EXECUTING', message: 'Cave exploration complete' });
    return { subtaskId: '', success: true };
  }
}
