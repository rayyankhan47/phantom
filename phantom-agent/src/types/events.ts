export type SessionStatus =
  | 'IDLE'
  | 'INITIALIZING'
  | 'PERCEIVING'
  | 'PLANNING'
  | 'EXECUTING'
  | 'CRITIQUING'
  | 'COMPLETE'
  | 'FAILED';

export type AgentEventType =
  | 'PERCEPTION'
  | 'PLANNING'
  | 'EXECUTING'
  | 'CRITIQUING'
  | 'MEMORY'
  | 'ERROR'
  | 'STATUS';

export interface AgentEvent {
  id: string;
  type: AgentEventType;
  message: string;
  timestamp: number;
}
