import type { WorldState } from '../worldstate/WorldState.js';

export class MemoryAgent {
  buildSessionContext(worldState: WorldState): string {
    const { session, inventory } = worldState;
    const lines: string[] = [];

    if (session.completedSubtasks.length > 0) {
      lines.push('## Completed subtasks');
      for (const subtask of session.completedSubtasks) {
        lines.push(`  - [${subtask.id}] ${subtask.action_type}: ${subtask.description ?? JSON.stringify(subtask.parameters)}`);
      }
    }

    if (session.failures.length > 0) {
      lines.push('## Failures');
      for (const f of session.failures) {
        lines.push(`  - subtask ${f.subtaskId}: ${f.failureType} — ${f.message}`);
      }
    }

    if (inventory.length > 0) {
      const summary = inventory.map((i) => `${i.count}x ${i.name}`).join(', ');
      lines.push(`## Current inventory\n  ${summary}`);
    }

    lines.push(`## Attempt #${session.attempts}`);

    return lines.join('\n');
  }
}
