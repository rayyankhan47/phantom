import type { Bot } from 'mineflayer';
import { goals } from 'mineflayer-pathfinder';
import type { WorldState } from '../../worldstate/WorldState.js';
import type { ExecutionResult } from '../../types/tasks.js';
import type { Action } from './Action.js';

type CraftState =
  | 'CHECK_HAVE_TABLE'
  | 'PLACE_TABLE'
  | 'NAVIGATE_TO_TABLE'
  | 'CRAFT'
  | 'PICK_UP_TABLE';

export class CraftAction implements Action {
  async run(params: Record<string, unknown>, bot: Bot, worldState: WorldState): Promise<ExecutionResult> {
    const itemName = params['item'] as string;
    const quantity = (params['quantity'] as number) ?? 1;

    worldState.pushEvent({ type: 'EXECUTING', message: `Crafting ${quantity}x ${itemName}` });

    const itemData = bot.registry.itemsByName[itemName];
    if (!itemData) {
      return { subtaskId: '', success: false, failureType: 'CRAFT_FAILED', message: `Unknown item: ${itemName}` };
    }

    // Check if recipe needs a crafting table
    const recipes = bot.recipesFor(itemData.id, null, 1, null);
    const tableRecipes = bot.recipesFor(itemData.id, null, 1, bot.findBlock({ matching: bot.registry.blocksByName['crafting_table']?.id ?? -1, maxDistance: 32 }));
    const needsTable = recipes.length === 0 && tableRecipes.length === 0
      ? true
      : recipes.length === 0;

    let state: CraftState = 'CHECK_HAVE_TABLE';
    let placedTable = false;
    let tablePos: { x: number; y: number; z: number } | null = null;

    while (true) {
      switch (state) {
        case 'CHECK_HAVE_TABLE': {
          if (!needsTable) {
            state = 'CRAFT';
          } else {
            // Look for an existing nearby table first
            const existingTable = bot.findBlock({
              matching: bot.registry.blocksByName['crafting_table']?.id ?? -1,
              maxDistance: 32,
            });
            if (existingTable) {
              tablePos = existingTable.position;
              state = 'NAVIGATE_TO_TABLE';
            } else {
              state = 'PLACE_TABLE';
            }
          }
          break;
        }

        case 'PLACE_TABLE': {
          const tableItem = bot.inventory.items().find((i) => i.name === 'crafting_table');
          if (!tableItem) {
            return { subtaskId: '', success: false, failureType: 'ITEM_NOT_FOUND', message: 'No crafting table in inventory' };
          }
          await bot.equip(tableItem, 'hand');
          const pos = bot.entity.position.floored();
          const refBlock = bot.blockAt({ x: pos.x, y: pos.y - 1, z: pos.z + 1 } as Parameters<typeof bot.blockAt>[0]);
          if (!refBlock) {
            return { subtaskId: '', success: false, failureType: 'UNEXPECTED_STATE', message: 'No surface to place crafting table' };
          }
          try {
            await bot.placeBlock(refBlock, { x: 0, y: 1, z: 0 } as Parameters<typeof bot.placeBlock>[1]);
            placedTable = true;
            const placed = bot.findBlock({
              matching: bot.registry.blocksByName['crafting_table']?.id ?? -1,
              maxDistance: 4,
            });
            tablePos = placed?.position ?? null;
            state = 'NAVIGATE_TO_TABLE';
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return { subtaskId: '', success: false, failureType: 'CRAFT_FAILED', message };
          }
          break;
        }

        case 'NAVIGATE_TO_TABLE': {
          if (!tablePos) {
            return { subtaskId: '', success: false, failureType: 'UNEXPECTED_STATE', message: 'Lost track of crafting table position' };
          }
          try {
            await bot.pathfinder.goto(new goals.GoalNear(tablePos.x, tablePos.y, tablePos.z, 2));
          } catch {
            return { subtaskId: '', success: false, failureType: 'STUCK', message: 'Could not navigate to crafting table' };
          }
          state = 'CRAFT';
          break;
        }

        case 'CRAFT': {
          const craftingTable = tablePos
            ? bot.blockAt(tablePos as Parameters<typeof bot.blockAt>[0])
            : null;
          const availableRecipes = bot.recipesFor(itemData.id, null, quantity, craftingTable);
          if (availableRecipes.length === 0) {
            return { subtaskId: '', success: false, failureType: 'CRAFT_FAILED', message: `No recipe available for ${itemName}` };
          }
          try {
            await bot.craft(availableRecipes[0]!, quantity, craftingTable ?? undefined);
            worldState.pushEvent({ type: 'EXECUTING', message: `Crafted ${quantity}x ${itemName}` });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return { subtaskId: '', success: false, failureType: 'CRAFT_FAILED', message };
          }
          state = placedTable ? 'PICK_UP_TABLE' : 'CRAFT'; // exit loop below
          if (!placedTable) {
            return { subtaskId: '', success: true };
          }
          break;
        }

        case 'PICK_UP_TABLE': {
          if (tablePos) {
            const tableBlock = bot.blockAt(tablePos as Parameters<typeof bot.blockAt>[0]);
            if (tableBlock?.name === 'crafting_table') {
              try {
                await bot.dig(tableBlock);
              } catch {
                // Non-fatal — table pick-up is best-effort
              }
            }
          }
          return { subtaskId: '', success: true };
        }
      }
    }
  }
}
