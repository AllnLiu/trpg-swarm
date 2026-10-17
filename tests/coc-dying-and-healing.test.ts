/**
 * Regression checks for two engine fixes:
 * 1. CoC 7e: 0 HP no longer kills an investigator outright (major wound -> dying, else unconscious).
 * 2. D&D 5e: prepared healing spells in `spellcasting` become heal actions, with spell slots.
 *
 * Run: node --experimental-strip-types tests/coc-dying-and-healing.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { campaignBookToWorldState } from '../src/engine/campaignImport.ts';
import { adjustDamageForType, applyCoC7eDamage } from '../src/engine/rulesEngine.ts';
import { stepCombatTurn } from '../src/engine/stateStore.ts';

const load = (name: string) =>
  JSON.parse(readFileSync(new URL(`../examples/campaign-${name}.json`, import.meta.url), 'utf8'));

// 1a. Major wound at 0 HP -> unconscious + dying, still alive.
const coc = campaignBookToWorldState(load('arkham-shadow'));
const hero = coc.combatants['trpg-companion-vanguard'];
hero.hp = 8;
applyCoC7eDamage(hero, 11);
assert.equal(hero.hp, 0);
assert.equal(hero.isAlive, true);
for (const c of ['major_wound', 'unconscious', 'dying']) assert.ok(hero.conditions.includes(c), c);

// 1b. No major wound at 0 HP -> unconscious only.
const rogue = coc.combatants['trpg-companion-rogue'];
rogue.hp = 2;
applyCoC7eDamage(rogue, 2);
assert.equal(rogue.isAlive, true);
assert.ok(rogue.conditions.includes('unconscious'));
assert.ok(!rogue.conditions.includes('dying'));

// 1c. Monsters still die at 0 HP.
const cultist = Object.values(coc.combatants).find((c) => c.faction === 'enemy');
if (cultist) {
  applyCoC7eDamage(cultist, 999);
  assert.equal(cultist.isAlive, false);
}

// 1d. A dying actor's turn is a CON check, never an attack; a downed one just loses the turn.
const state = campaignBookToWorldState(load('arkham-shadow'));
const dying = state.combatants['trpg-companion-vanguard'];
dying.hp = 0;
dying.conditions.push('unconscious', 'dying');
const turn = stepCombatTurn(state, 'trpg-companion-vanguard');
assert.match(turn.resolutionNarrative, /CON/);

// 2. Healing spells and slots from `spellcasting`.
const dnd = campaignBookToWorldState(load('crimson-crypt'));
const healer = dnd.combatants['trpg-companion-healer'];
const ids = healer.actions.filter((a) => a.type === 'heal').map((a) => a.id);
assert.ok(ids.includes('cure_wounds') && ids.includes('healing_word'), `heal ids: ${ids}`);
assert.equal(healer.stats.spellSlots?.[1]?.max, 4);

// 3. Damage-type modifiers read from the campaign book (skeleton: vulnerable to bludgeoning, immune to poison).
const skeleton = Object.values(dnd.combatants).find((c) => c.id.startsWith('enemy-skeleton'));
assert.ok(skeleton, 'skeleton present');
assert.deepEqual(skeleton.stats.vulnerabilities, ['bludgeoning']);
assert.deepEqual(skeleton.stats.immunities, ['poison']);
assert.equal(adjustDamageForType(6, 'bludgeoning', skeleton), 12);
assert.equal(adjustDamageForType(6, 'poison', skeleton), 0);
assert.equal(adjustDamageForType(6, 'slashing', skeleton), 6);
assert.equal(adjustDamageForType(7, undefined, skeleton), 7);
const wightLike = { ...skeleton, stats: { ...skeleton.stats, resistances: ['necrotic'], vulnerabilities: [] } };
assert.equal(adjustDamageForType(7, 'necrotic', wightLike), 3);

// 4. Villain actions: summoned skeletons wait in reserve and join on the boss's turn.
const finale = load('crimson-crypt');
finale.sessionState.sceneId = 'area-3-abyssal-sanctum';
const boss = campaignBookToWorldState(finale);
assert.equal(boss.villainActions?.length, 2);
assert.deepEqual(Object.keys(boss.reserve ?? {}).sort(), ['enemy-honor-guard-skeleton-1', 'enemy-honor-guard-skeleton-2']);
assert.ok(!('enemy-honor-guard-skeleton-1' in boss.combatants));
assert.ok(!boss.initiativeOrder.includes('enemy-honor-guard-skeleton-1'));
stepCombatTurn(boss, 'boss-sir-malcolm-wight');
assert.ok('enemy-honor-guard-skeleton-1' in boss.combatants && 'enemy-honor-guard-skeleton-2' in boss.combatants);
assert.ok(boss.initiativeOrder.includes('enemy-honor-guard-skeleton-2'));
assert.equal(Object.keys(boss.reserve ?? {}).length, 0);
assert.equal(boss.villainActions?.filter((v) => v.fired).length, 1, 'round-2 action not fired yet');

// 5. CoC First Aid: the healer gets a heal action; a failed roll changes nothing, a success stabilises.
const aid = campaignBookToWorldState(load('arkham-shadow'));
const medic = aid.combatants['trpg-companion-healer'];
const firstAid = medic.actions.find((a) => a.id === 'first_aid');
assert.ok(firstAid && firstAid.type === 'heal', 'first aid heal action');
const downed = aid.combatants['trpg-companion-vanguard'];
downed.hp = 0;
downed.conditions.push('unconscious', 'dying');
firstAid.attackBonus = 0;
stepCombatTurn(aid, 'trpg-companion-healer', 0.65, 'first_aid');
assert.ok(downed.conditions.includes('dying'), 'failed first aid leaves the investigator dying');
firstAid.attackBonus = 100;
stepCombatTurn(aid, 'trpg-companion-healer', 0.65, 'first_aid');
assert.ok(!downed.conditions.includes('dying') && downed.hp === 1, 'successful first aid stabilises');

console.log('coc-dying-and-healing: all assertions passed');
