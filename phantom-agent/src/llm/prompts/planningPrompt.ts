import type { WorldState } from '../../worldstate/WorldState.js';
import { VALID_ACTION_TYPES } from '../../types/tasks.js';

export function buildPlanningPrompt(worldState: WorldState, sessionContext: string): string {
  const { bot, inventory, world, session } = worldState;

  const inventorySummary = inventory.length === 0
    ? 'empty'
    : inventory.map((i) => `${i.count}x ${i.name}`).join(', ');

  const blocksSummary = world.nearbyBlocks.slice(0, 15)
    .map((b) => `${b.name} at (${b.position.x}, ${b.position.y}, ${b.position.z}) [${b.distance.toFixed(1)}m]`)
    .join('\n  ') || 'none';

  const entitiesSummary = world.nearbyEntities.slice(0, 10)
    .map((e) => `${e.name} (${e.type}) at (${e.position.x.toFixed(1)}, ${e.position.y.toFixed(1)}, ${e.position.z.toFixed(1)}) [${e.distance.toFixed(1)}m]`)
    .join('\n  ') || 'none';

  return `You are the planning brain of an autonomous Minecraft bot named PhantomBot.

## Bot Status
- Position: (${bot.position.x.toFixed(1)}, ${bot.position.y.toFixed(1)}, ${bot.position.z.toFixed(1)})
- Health: ${bot.health}/20  Food: ${bot.food}/20
- Game mode: ${bot.gameMode}

## Inventory
${inventorySummary}

## Nearby Blocks
  ${blocksSummary}

## Nearby Entities
  ${entitiesSummary}

## Session Context
${sessionContext || 'No prior actions this session.'}

## Goal
${session.goal}

## Instructions
Break the goal into an ordered list of subtasks. Each subtask must use exactly one of these action types:
${VALID_ACTION_TYPES.join(', ')}

Action parameter schemas:
- CHOP:         { "block": string, "count": number }
- NAVIGATE:     { "x": number, "y": number, "z": number }
- CRAFT:        { "item": string, "quantity": number }
- MINE:         { "block": string, "count": number }
- PLACE:        { "block": string, "x": number, "y": number, "z": number }
- KILL:         { "entity": string, "count": number }
- EXPLORE_CAVE: { "direction"?: string }
- WAIT:         { "seconds": number }

Rules:
- Resolve all dependencies in order (e.g. chop logs before crafting planks).
- Only include subtasks that are actually needed given the current inventory.
- Be specific with block/item names (use Minecraft IDs like "oak_log", "oak_planks").
- Do not add commentary outside the JSON array.

Respond with ONLY a valid JSON array, no markdown fences:
[
  { "id": "1", "action_type": "CHOP", "parameters": { "block": "oak_log", "count": 3 }, "description": "Chop 3 oak logs" },
  ...
]`;
}
