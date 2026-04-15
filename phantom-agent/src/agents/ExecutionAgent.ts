import type { Bot } from 'mineflayer';
import type { WorldState } from '../worldstate/WorldState.js';
import type { ActionType, ExecutionResult, Subtask } from '../types/tasks.js';
import type { Action } from '../minecraft/actions/Action.js';
import { WaitAction } from '../minecraft/actions/WaitAction.js';
import { NavigateAction } from '../minecraft/actions/NavigateAction.js';
import { ChopAction } from '../minecraft/actions/ChopAction.js';
import { MineAction } from '../minecraft/actions/MineAction.js';
import { PlaceAction } from '../minecraft/actions/PlaceAction.js';
import { CraftAction } from '../minecraft/actions/CraftAction.js';
import { KillAction } from '../minecraft/actions/KillAction.js';
import { ExploreCaveAction } from '../minecraft/actions/ExploreCaveAction.js';

export class ExecutionAgent {
  private readonly router: Map<ActionType, Action>;

  constructor() {
    this.router = new Map<ActionType, Action>([
      ['WAIT', new WaitAction()],
      ['NAVIGATE', new NavigateAction()],
      ['CHOP', new ChopAction()],
      ['MINE', new MineAction()],
      ['PLACE', new PlaceAction()],
      ['CRAFT', new CraftAction()],
      ['KILL', new KillAction()],
      ['EXPLORE_CAVE', new ExploreCaveAction()],
    ]);
  }

  async execute(subtask: Subtask, bot: Bot, worldState: WorldState): Promise<ExecutionResult> {
    worldState.pushEvent({
      type: 'EXECUTING',
      message: `Starting subtask [${subtask.id}] ${subtask.action_type}: ${subtask.description ?? ''}`,
    });

    const action = this.router.get(subtask.action_type);
    if (!action) {
      return {
        subtaskId: subtask.id,
        success: false,
        failureType: 'UNEXPECTED_STATE',
        message: `No action handler for type: ${subtask.action_type}`,
      };
    }

    const result = await action.run(subtask.parameters, bot, worldState);
    return { ...result, subtaskId: subtask.id };
  }
}
