import type { GeminiClient } from '../llm/GeminiClient.js';
import type { WorldState } from '../worldstate/WorldState.js';
import { VALID_ACTION_TYPES, type Subtask } from '../types/tasks.js';
import { buildPlanningPrompt } from '../llm/prompts/planningPrompt.js';

export class PlanningError extends Error {
  constructor(message: string, public readonly rawResponse: string) {
    super(message);
    this.name = 'PlanningError';
  }
}

export class PlanningAgent {
  constructor(private readonly gemini: GeminiClient) {}

  async generatePlan(worldState: WorldState, sessionContext: string): Promise<Subtask[]> {
    worldState.pushEvent({ type: 'PLANNING', message: `Generating plan for: "${worldState.session.goal}"` });

    const prompt = buildPlanningPrompt(worldState, sessionContext);
    const raw = await this.gemini.plan(prompt);

    // Strip markdown code fences if present
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new PlanningError(`Failed to parse Gemini response as JSON`, raw);
    }

    if (!Array.isArray(parsed)) {
      throw new PlanningError('Gemini response is not a JSON array', raw);
    }

    const subtasks: Subtask[] = [];
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) {
        throw new PlanningError('Subtask is not an object', raw);
      }
      const obj = item as Record<string, unknown>;

      if (typeof obj['id'] !== 'string') throw new PlanningError('Subtask missing string "id"', raw);
      if (typeof obj['action_type'] !== 'string') throw new PlanningError('Subtask missing "action_type"', raw);
      if (typeof obj['parameters'] !== 'object' || obj['parameters'] === null) {
        throw new PlanningError('Subtask missing "parameters" object', raw);
      }
      if (!(VALID_ACTION_TYPES as readonly string[]).includes(obj['action_type'])) {
        throw new PlanningError(`Unknown action_type: ${obj['action_type']}`, raw);
      }

      subtasks.push({
        id: obj['id'] as string,
        action_type: obj['action_type'] as Subtask['action_type'],
        parameters: obj['parameters'] as Record<string, unknown>,
        description: typeof obj['description'] === 'string' ? obj['description'] : undefined,
      });
    }

    worldState.pushEvent({ type: 'PLANNING', message: `Plan generated: ${subtasks.length} subtasks` });
    return subtasks;
  }
}
