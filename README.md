# Phantom

Phantom is an autonomous Minecraft bot that accepts natural language goals and executes them fully autonomously. Built on Mineflayer + Gemini 2.0 Flash, it uses a horizontal multi-agent architecture (Perception, Planning, Execution, Critic, Memory) that all communicate through a single shared `WorldState` — no agent calls another directly. A companion Fabric client mod lets you send goals via `/ph <goal>` and watch the bot's inventory and event stream live.

- Technical specification: `project_details.md`
- Build plan: `project_plan.md`
