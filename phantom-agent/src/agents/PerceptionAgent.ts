import type { Bot } from 'mineflayer';
import type { WorldState } from '../worldstate/WorldState.js';
import type { InventoryItem, NearbyBlock, NearbyEntity } from '../types/minecraft.js';

/** Block types the agent cares about tracking */
const TRACKED_BLOCK_TYPES = [
  'oak_log', 'birch_log', 'spruce_log', 'jungle_log', 'acacia_log', 'dark_oak_log',
  'crafting_table', 'furnace', 'chest',
  'coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore', 'deepslate_coal_ore',
  'deepslate_iron_ore', 'deepslate_gold_ore', 'deepslate_diamond_ore',
  'torch', 'cave_air',
];

const SCAN_RADIUS = 32;

function vec3dist(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

export function scanBlocks(bot: Bot, types: string[], radius: number): NearbyBlock[] {
  const results: NearbyBlock[] = [];
  const botPos = bot.entity.position;

  for (const type of types) {
    const blockType = bot.registry.blocksByName[type];
    if (!blockType) continue;

    const blocks = bot.findBlocks({
      matching: blockType.id,
      maxDistance: radius,
      count: 10,
    });

    for (const pos of blocks) {
      results.push({
        name: type,
        position: { x: pos.x, y: pos.y, z: pos.z },
        distance: vec3dist(botPos, pos),
      });
    }
  }

  return results.sort((a, b) => a.distance - b.distance);
}

export function perceive(bot: Bot, worldState: WorldState): void {
  const pos = bot.entity.position;

  // Bot snapshot
  worldState.bot = {
    username: bot.username,
    position: { x: pos.x, y: pos.y, z: pos.z },
    health: bot.health,
    food: bot.food,
    gameMode: bot.game?.gameMode ?? 'survival',
  };

  // Inventory
  const items: InventoryItem[] = [];
  for (const item of bot.inventory.items()) {
    items.push({ name: item.name, count: item.count, slot: item.slot });
  }
  worldState.inventory.length = 0;
  worldState.inventory.push(...items);

  // Nearby blocks
  worldState.world.nearbyBlocks = scanBlocks(bot, TRACKED_BLOCK_TYPES, SCAN_RADIUS);

  // Nearby entities
  const entities: NearbyEntity[] = [];
  for (const entity of Object.values(bot.entities)) {
    if (entity === bot.entity) continue;
    const dist = vec3dist(pos, entity.position);
    if (dist > SCAN_RADIUS) continue;
    entities.push({
      name: entity.name ?? entity.username ?? 'unknown',
      type: entity.type,
      position: { x: entity.position.x, y: entity.position.y, z: entity.position.z },
      distance: dist,
      health: (entity as { health?: number }).health,
    });
  }
  worldState.world.nearbyEntities = entities.sort((a, b) => a.distance - b.distance);

  // World conditions
  worldState.world.timeOfDay = bot.time.timeOfDay;
  worldState.world.isRaining = bot.isRaining;

  worldState.pushEvent({ type: 'PERCEPTION', message: 'World snapshot taken' });
}
