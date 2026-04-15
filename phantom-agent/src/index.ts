import { Config } from './config.js';
import { createBot, disconnect } from './minecraft/BotManager.js';
import { createEmpty } from './worldstate/WorldState.js';
import { perceive } from './agents/PerceptionAgent.js';

console.log('Phantom Agent starting...');

const bot = createBot(Config);
const worldState = createEmpty();

bot.once('spawn', () => {
  console.log(`[Bot] Spawned as ${bot.username} at`, bot.entity.position);

  // Wait for health + chunk packets to arrive before snapshotting
  setTimeout(() => {
  perceive(bot, worldState);

  console.log('\n--- WorldState Snapshot ---');
  console.log('Bot:', worldState.bot);
  console.log('Inventory:', worldState.inventory);
  console.log('Nearby blocks:', worldState.world.nearbyBlocks.slice(0, 5));
  console.log('Nearby entities:', worldState.world.nearbyEntities.slice(0, 5));
  console.log('Time of day:', worldState.world.timeOfDay);
  console.log('Is raining:', worldState.world.isRaining);
  console.log('Events:', worldState.events);
  }, 3000);
});

process.on('SIGINT', () => {
  console.log('\n[Bot] Shutting down...');
  disconnect(bot);
  setTimeout(() => process.exit(0), 1000);
});
