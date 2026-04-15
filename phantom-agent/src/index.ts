import { Config } from './config.js';
import { createEmpty } from './worldstate/WorldState.js';

console.log('Phantom Agent starting...');
console.log(Config);

// WorldState smoke test
const ws = createEmpty();
ws.inventory.push({ name: 'oak_log', count: 5, slot: 0 });
ws.inventory.push({ name: 'oak_log', count: 3, slot: 1 });
ws.pushEvent({ type: 'STATUS', message: 'WorldState initialised' });

console.log('hasItem oak_log:', ws.hasItem('oak_log'));        // true
console.log('countOf oak_log:', ws.countOf('oak_log'));        // 8
console.log('hasItem iron_sword:', ws.hasItem('iron_sword'));  // false
console.log('events:', ws.events);
