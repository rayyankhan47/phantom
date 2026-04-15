import { Config } from './config.js';
import { createBot, disconnect } from './minecraft/BotManager.js';

console.log('Phantom Agent starting...');

const bot = createBot(Config);

bot.once('spawn', () => {
  console.log(`[Bot] Spawned as ${bot.username} at`, bot.entity.position);
});

// Clean shutdown on SIGINT
process.on('SIGINT', () => {
  console.log('\n[Bot] Shutting down...');
  disconnect(bot);
  setTimeout(() => process.exit(0), 1000);
});
