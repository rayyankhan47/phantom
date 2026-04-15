import EventEmitter from 'events';
import type { Bot } from 'mineflayer';
import type { AppConfig } from '../config.js';
import { createBot, disconnect } from '../minecraft/BotManager.js';
import { perceive } from '../agents/PerceptionAgent.js';
import type { PlanningAgent } from '../agents/PlanningAgent.js';
import type { ExecutionAgent } from '../agents/ExecutionAgent.js';
import type { CriticAgent } from '../agents/CriticAgent.js';
import type { MemoryAgent } from '../agents/MemoryAgent.js';
import type { WorldState } from '../worldstate/WorldState.js';
import type { CriticVerdict } from '../types/tasks.js';
import type { SessionStatus } from '../types/events.js';

const VALID_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  IDLE:         ['INITIALIZING'],
  INITIALIZING: ['PERCEIVING', 'FAILED'],
  PERCEIVING:   ['PLANNING', 'FAILED'],
  PLANNING:     ['EXECUTING', 'FAILED'],
  EXECUTING:    ['CRITIQUING', 'FAILED'],
  CRITIQUING:   ['EXECUTING', 'COMPLETE', 'FAILED', 'PERCEIVING'],
  COMPLETE:     ['IDLE'],
  FAILED:       ['IDLE'],
};

export class Orchestrator extends EventEmitter {
  constructor(
    private readonly config: AppConfig,
    private readonly planningAgent: PlanningAgent,
    private readonly executionAgent: ExecutionAgent,
    private readonly criticAgent: CriticAgent,
    private readonly memoryAgent: MemoryAgent,
    private readonly worldState: WorldState,
  ) {
    super();
  }

  private transition(to: SessionStatus): void {
    const from = this.worldState.session.status;
    if (!VALID_TRANSITIONS[from].includes(to)) {
      throw new Error(`Invalid state transition: ${from} → ${to}`);
    }
    this.worldState.session.status = to;
    this.worldState.pushEvent({ type: 'STATUS', message: `${from} → ${to}` });
  }

  async run(goal: string): Promise<void> {
    this.transition('INITIALIZING');

    // Create bot and wait for spawn + packet settle time
    const bot = createBot(this.config);
    await new Promise<void>((resolve, reject) => {
      bot.once('spawn', () => { setTimeout(resolve, 3000); });
      bot.once('error', (err: Error) => reject(err));
    });

    this.worldState.session.goal = goal;
    this.worldState.session.startTime = Date.now();

    // PERCEIVING
    this.transition('PERCEIVING');
    perceive(bot, this.worldState);

    // PLANNING
    this.transition('PLANNING');
    const initialContext = this.memoryAgent.buildSessionContext(this.worldState);
    this.worldState.session.plan = await this.planningAgent.generatePlan(this.worldState, initialContext);
    this.worldState.session.currentSubtaskIndex = 0;
    this.emit('PLAN_READY', this.worldState.session.plan);

    // Main execution loop
    while (
      this.worldState.session.status !== 'FAILED' &&
      this.worldState.session.currentSubtaskIndex < this.worldState.session.plan.length
    ) {
      const subtask = this.worldState.session.plan[this.worldState.session.currentSubtaskIndex];

      this.transition('EXECUTING');
      await this.executionAgent.execute(subtask, bot, this.worldState);

      // Re-perceive after each action — world has changed
      perceive(bot, this.worldState);

      this.transition('CRITIQUING');
      const verdict = this.criticAgent.verify(subtask, bot, this.worldState);

      if (verdict.success) {
        this.worldState.session.completedSubtasks.push(subtask);
        this.worldState.session.currentSubtaskIndex++;
        this.worldState.session.attempts = 0;
        this.emit('SUBTASK_COMPLETE', subtask);
        // Status stays CRITIQUING; next iteration: CRITIQUING → EXECUTING
      } else {
        await this.handleFailure(verdict, bot);
      }
    }

    if (this.worldState.session.status !== 'FAILED') {
      this.transition('COMPLETE');
      this.emit('SESSION_COMPLETE', this.worldState);
    }

    disconnect(bot);
  }

  private async handleFailure(
    verdict: Extract<CriticVerdict, { success: false }>,
    bot: Bot,
  ): Promise<void> {
    this.worldState.session.attempts++;

    const currentSubtask = this.worldState.session.plan[this.worldState.session.currentSubtaskIndex];
    this.worldState.session.failures.push({
      subtaskId: currentSubtask.id,
      failureType: verdict.failureType,
      message: verdict.message,
      timestamp: Date.now(),
    });

    if (this.worldState.session.attempts > 3) {
      this.transition('FAILED');
      return;
    }

    switch (verdict.failureType) {
      case 'STUCK': {
        this.worldState.pushEvent({ type: 'ERROR', message: 'Stuck. Retrying...' });
        // Stay CRITIQUING; loop will transition CRITIQUING → EXECUTING
        break;
      }

      case 'ITEM_NOT_FOUND':
      case 'CRAFT_FAILED':
      case 'UNEXPECTED_STATE':
      case 'ENTITY_GONE': {
        this.worldState.pushEvent({ type: 'ERROR', message: `${verdict.failureType}. Replanning...` });
        this.transition('PERCEIVING');
        perceive(bot, this.worldState);
        this.transition('PLANNING');
        const context = this.memoryAgent.buildSessionContext(this.worldState);
        this.worldState.session.plan = await this.planningAgent.generatePlan(this.worldState, context);
        this.worldState.session.currentSubtaskIndex = 0;
        this.worldState.session.attempts = 0;
        // Status is PLANNING; loop will transition PLANNING → EXECUTING
        break;
      }

      case 'TIMEOUT': {
        this.worldState.pushEvent({ type: 'ERROR', message: 'Timed out. Skipping subtask.' });
        this.worldState.session.currentSubtaskIndex++;
        // Stay CRITIQUING; loop will transition CRITIQUING → EXECUTING
        break;
      }
    }
  }
}
