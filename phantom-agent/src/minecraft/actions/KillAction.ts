import type { Bot } from 'mineflayer';
import { goals } from 'mineflayer-pathfinder';
import type { WorldState } from '../../worldstate/WorldState.js';
import type { ExecutionResult } from '../../types/tasks.js';
import type { Action } from './Action.js';

const ATTACK_COOLDOWN_MS = 600;

export class KillAction implements Action {
  async run(params: Record<string, unknown>, bot: Bot, worldState: WorldState): Promise<ExecutionResult> {
    const entityName = params['entity'] as string;
    const count = (params['count'] as number) ?? 1;
    let killed = 0;

    worldState.pushEvent({ type: 'EXECUTING', message: `Killing ${count}x ${entityName}` });

    while (killed < count) {
      // Locate nearest matching entity
      const target = Object.values(bot.entities).find(
        (e) => e !== bot.entity && (e.name === entityName || e.username === entityName)
      );

      if (!target) {
        return { subtaskId: '', success: false, failureType: 'ENTITY_GONE', message: `No ${entityName} found nearby` };
      }

      // Navigate close enough to attack
      try {
        await bot.pathfinder.goto(new goals.GoalFollow(target, 2));
      } catch {
        // Best-effort — try to attack even if pathfinder fails
      }

      // Attack until dead
      const startId = target.id;
      let attempts = 0;
      while (bot.entities[startId] && attempts < 60) {
        bot.attack(target);
        await new Promise((r) => setTimeout(r, ATTACK_COOLDOWN_MS));
        attempts++;
      }

      if (bot.entities[startId]) {
        return { subtaskId: '', success: false, failureType: 'STUCK', message: `${entityName} survived after 60 attacks` };
      }

      killed++;
      worldState.pushEvent({ type: 'EXECUTING', message: `Killed ${entityName} (${killed}/${count})` });

      // Wait for drops to land
      await new Promise((r) => setTimeout(r, 1500));
    }

    return { subtaskId: '', success: true };
  }
}
