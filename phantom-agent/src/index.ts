import { Config } from './config.js';
import { createEmpty } from './worldstate/WorldState.js';
import { GeminiClient } from './llm/GeminiClient.js';
import { PlanningAgent } from './agents/PlanningAgent.js';
import { ExecutionAgent } from './agents/ExecutionAgent.js';
import { CriticAgent } from './agents/CriticAgent.js';
import { MemoryAgent } from './agents/MemoryAgent.js';
import { Orchestrator } from './orchestrator/Orchestrator.js';

console.log('Phantom Agent starting...');

if (!Config.geminiApiKey) {
  console.error('[Config] GEMINI_API_KEY is not set — add it to .env before running.');
  process.exit(1);
}

const worldState = createEmpty();

const gemini       = new GeminiClient(Config.geminiApiKey);
const planningAgent  = new PlanningAgent(gemini);
const executionAgent = new ExecutionAgent();
const criticAgent    = new CriticAgent();
const memoryAgent    = new MemoryAgent();

const orchestrator = new Orchestrator(
  Config,
  planningAgent,
  executionAgent,
  criticAgent,
  memoryAgent,
  worldState,
);

orchestrator.on('PLAN_READY', (plan) => {
  console.log(`[Orchestrator] Plan ready — ${plan.length} subtasks:`);
  for (const subtask of plan) {
    console.log(`  [${subtask.id}] ${subtask.action_type}: ${subtask.description ?? JSON.stringify(subtask.parameters)}`);
  }
});

orchestrator.on('SUBTASK_COMPLETE', (subtask) => {
  console.log(`[Orchestrator] ✓ [${subtask.id}] ${subtask.action_type}`);
});

orchestrator.on('SESSION_COMPLETE', () => {
  console.log('[Orchestrator] Session complete.');
  console.log('Final inventory:', worldState.inventory);
});

process.on('SIGINT', () => {
  console.log('\n[Bot] Shutting down...');
  setTimeout(() => process.exit(0), 500);
});

orchestrator.run('chop 3 oak logs and craft oak planks').catch((err: Error) => {
  console.error('[Orchestrator] Fatal error:', err.message);
  process.exit(1);
});
