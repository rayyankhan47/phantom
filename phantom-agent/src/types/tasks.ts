export const VALID_ACTION_TYPES = [
  'CHOP',
  'NAVIGATE',
  'CRAFT',
  'MINE',
  'PLACE',
  'KILL',
  'EXPLORE_CAVE',
  'WAIT',
] as const;

export type ActionType = (typeof VALID_ACTION_TYPES)[number];

export interface Subtask {
  id: string;
  action_type: ActionType;
  parameters: Record<string, unknown>;
  description?: string;
}

export type FailureType =
  | 'STUCK'
  | 'ITEM_NOT_FOUND'
  | 'CRAFT_FAILED'
  | 'TIMEOUT'
  | 'ENTITY_GONE'
  | 'UNEXPECTED_STATE';

export interface FailureRecord {
  subtaskId: string;
  failureType: FailureType;
  message: string;
  timestamp: number;
}

export type CriticVerdict =
  | { success: true }
  | { success: false; failureType: FailureType; message: string };

export interface ExecutionResult {
  subtaskId: string;
  success: boolean;
  failureType?: FailureType;
  message?: string;
}
