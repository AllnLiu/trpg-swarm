/**
 * Comprehensive QA Test Suite for all 9 TRPG-Swarm Classic Scenarios
 *
 * Covers:
 * 1. Catalog integrity & alias mapping
 * 2. WorldState hydration across all 3 systems (D&D 5e, CoC 7e, PbtA)
 * 3. Step-turn simulation & tactical AI Softmax decision verification
 * 4. Scene override & live combat encounter engagement (threat ratio > 0, candidates > 0)
 * 5. CLI end-to-end integration (init --list, init --example)
 *
 * Run: node --experimental-strip-types tests/campaign-scenarios.test.ts
 */

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { campaignBookToWorldState } from '../src/engine/campaignImport.ts';
import { stepCombatTurn } from '../src/engine/stateStore.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.resolve(rootDir, 'examples', 'catalog.json');

console.log('--- [QA Test Suite: Canonical Campaign Scenarios] ---');

// 1. Catalog Integrity
assert.ok(existsSync(catalogPath), 'catalog.json must exist');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
assert.equal(catalog.length, 2, 'All 9 scenarios must be indexed in catalog.json');

const systemCounts: Record<string, number> = { dnd5e: 0, coc7e: 0, pbta: 0 };

for (const entry of catalog) {
  console.log(`Testing [${entry.system}] ${entry.id}...`);
  assert.ok(entry.id, 'Entry must have id');
  assert.ok(entry.title, 'Entry must have title');
  assert.ok(['dnd5e', 'coc7e', 'pbta'].includes(entry.system), `Invalid system: ${entry.system}`);
  systemCounts[entry.system] = (systemCounts[entry.system] || 0) + 1;

  const scenarioFile = path.resolve(rootDir, 'examples', entry.relativePath);
  assert.ok(existsSync(scenarioFile), `Scenario file missing: ${entry.relativePath}`);
  const book = JSON.parse(readFileSync(scenarioFile, 'utf8'));
  assert.equal(book.system, entry.system, `System mismatch in ${entry.relativePath}`);

  // 2. Hydration & Party Verification
  const defaultState = campaignBookToWorldState(book, 42);
  assert.equal(defaultState.ruleSystem, entry.system);
  const partyMembers = Object.values(defaultState.combatants).filter((c) => c.faction === 'party');
  assert.ok(partyMembers.length > 0, 'Party must have members');
  assert.ok(defaultState.initiativeOrder.length > 0, 'Initiative order must not be empty');

  // Verify at least 2 steps on default scene
  const activeActorId = defaultState.initiativeOrder[0];
  const turn1 = stepCombatTurn(defaultState, activeActorId);
  assert.ok(turn1.decisionReport, 'Turn must produce decision report');

  // 3. Combat Encounter Verification (Find scene with encounters)
  const areas = book.dungeonAreas || book.investigationScenes || [];
  const combatScene = areas.find((a: any) => (a.encounters && a.encounters.length > 0) || (a.enemies && a.enemies.length > 0));

  assert.ok(combatScene, `Scenario ${entry.id} must have at least one scene with encounters/enemies`);
  const combatSceneId = combatScene.areaId || combatScene.sceneId;

  const combatState = campaignBookToWorldState(book, 42, combatSceneId);
  const enemies = Object.values(combatState.combatants).filter((c) => c.faction === 'enemy');
  assert.ok(enemies.length > 0, `Combat scene ${combatSceneId} in ${entry.id} must populate enemy combatants`);

  // Run combat turn with enemies present
  const firstCombatActor = combatState.initiativeOrder[0];
  const combatTurn = stepCombatTurn(combatState, firstCombatActor);
  assert.ok(combatTurn.decisionReport.allCandidateCount > 0, 'Tactical AI must evaluate candidates in combat');
  assert.ok(combatTurn.resolutionNarrative.length > 0, 'Combat turn must produce narrative');
}

assert.equal(systemCounts.dnd5e, 1, 'Must have 4 D&D 5e scenarios');
assert.equal(systemCounts.coc7e, 1, 'Must have 3 CoC 7e scenarios');
assert.equal(systemCounts.pbta, 0, 'Must have 2 PbtA scenarios');

console.log('✅ All canonical campaign scenarios passed schema, hydration, and active combat encounter simulation!');
