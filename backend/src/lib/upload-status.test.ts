import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition } from './upload-status.js';

describe('canTransition (SCRUM-22)', () => {
  test('the happy path is legal end to end', () => {
    assert.equal(canTransition('PROCESSING', 'NEEDS_REVIEW'), true);
    assert.equal(canTransition('NEEDS_REVIEW', 'READY'), true);
    assert.equal(canTransition('READY', 'PUBLISHED'), true);
  });

  test('an unrecognised file can go back to processing once mapped', () => {
    assert.equal(canTransition('PROCESSING', 'NEEDS_MAPPING_UPDATE'), true);
    assert.equal(canTransition('NEEDS_MAPPING_UPDATE', 'PROCESSING'), true);
  });

  test('a quarantined batch, or a published one being corrected (SCRUM-96), can be superseded; it is terminal', () => {
    assert.equal(canTransition('NEEDS_MAPPING_UPDATE', 'SUPERSEDED'), true);
    assert.equal(canTransition('PUBLISHED', 'SUPERSEDED'), true);
    assert.equal(canTransition('READY', 'SUPERSEDED'), false);
    assert.equal(canTransition('SUPERSEDED', 'PROCESSING'), false);
  });

  test('FAILED and PUBLISHED are terminal', () => {
    assert.equal(canTransition('FAILED', 'PUBLISHED'), false);
    assert.equal(canTransition('FAILED', 'PROCESSING'), false);
    assert.equal(canTransition('PUBLISHED', 'NEEDS_REVIEW'), false);
  });

  test('review cannot be skipped', () => {
    assert.equal(canTransition('PROCESSING', 'READY'), false);
    assert.equal(canTransition('NEEDS_REVIEW', 'PUBLISHED'), false);
  });
});
