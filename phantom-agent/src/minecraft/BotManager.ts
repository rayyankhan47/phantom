import mineflayer, { type Bot } from 'mineflayer';
import { pathfinder } from 'mineflayer-pathfinder';
import collectblock from 'mineflayer-collectblock';
import type { AppConfig } from '../config.js';

export function createBot(config: AppConfig): Bot {
  const bot = mineflayer.createBot({
    host: config.mcHost,
    port: config.mcPort,
    username: config.mcUsername,
    version: '1.21.1',
  });

  bot.loadPlugin(pathfinder);
  bot.loadPlugin(collectblock.plugin);

  bot.on('error', (err) => {
    console.error('[BotManager] error:', err.message);
  });

  bot.on('end', (reason) => {
    console.log('[BotManager] connection ended:', reason);
  });

  bot.on('kicked', (reason) => {
    console.warn('[BotManager] kicked:', reason);
  });

  return bot;
}

export function disconnect(bot: Bot): void {
  bot.quit();
}
