import 'dotenv/config';

function require_env(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const Config = {
  geminiApiKey: process.env['GEMINI_API_KEY'] ?? '',
  mcHost: process.env['MC_HOST'] ?? '127.0.0.1',
  mcPort: parseInt(process.env['MC_PORT'] ?? '25565', 10),
  mcUsername: process.env['MC_USERNAME'] ?? 'PhantomBot',
  agentHttpPort: parseInt(process.env['AGENT_HTTP_PORT'] ?? '3000', 10),
} as const;

export type AppConfig = typeof Config;
