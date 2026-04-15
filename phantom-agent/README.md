# phantom-agent

The Node.js/TypeScript autonomous Minecraft bot agent.

## Setup

```bash
cp .env.example .env
# Fill in GEMINI_API_KEY and adjust other values as needed
npm install
```

## Running

```bash
# Dev mode (tsx, no compile step)
npm run dev

# Production
npm run build
npm start
```

## Environment variables

| Variable          | Default      | Description                        |
|-------------------|--------------|------------------------------------|
| `GEMINI_API_KEY`  | —            | Gemini 2.0 Flash API key (required for planning) |
| `MC_HOST`         | `127.0.0.1`  | Minecraft server host              |
| `MC_PORT`         | `25565`      | Minecraft server port              |
| `MC_USERNAME`     | `PhantomBot` | Bot's in-game username             |
| `AGENT_HTTP_PORT` | `3000`       | Port for the agent's HTTP API      |
