import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CRITERIA_CONFIG, ALTERNATIVE_3X3_CONFIG } from '../riskCriteriaDefaults.js';
import {
  buildMatrixGrid,
  computeRiskLevel,
  computeRiskScore,
  evaluateWithCriteria,
} from '../riskInventoryUtils.js';
import { generateCriteriaDocumentation } from '../services/riskCriteriaService.js';

describe('risk criteria engine', () => {
  it('default 5x5 matches NR-01 thresholds', () => {
    assert.equal(computeRiskScore(5, 5), 25);
    assert.equal(computeRiskLevel(5, 5), 'critico');
    assert.equal(computeRiskLevel(2, 2), 'baixo');
    assert.equal(computeRiskLevel(3, 3), 'medio');
    assert.equal(computeRiskLevel(3, 4), 'alto');
  });

  it('evaluateWithCriteria returns acceptability', () => {
    const low = evaluateWithCriteria(2, 2);
    assert.equal(low.acceptable, true);
    const high = evaluateWithCriteria(5, 5);
    assert.equal(high.acceptable, false);
    assert.equal(high.criticality, 'critico');
  });

  it('3x3 alternative matrix uses different thresholds', () => {
    assert.equal(computeRiskLevel(3, 3, ALTERNATIVE_3X3_CONFIG), 'critico');
    assert.equal(computeRiskLevel(2, 2, ALTERNATIVE_3X3_CONFIG), 'medio');
  });

  it('buildMatrixGrid produces full matrix', () => {
    const grid = buildMatrixGrid(DEFAULT_CRITERIA_CONFIG);
    assert.equal(grid.length, 25);
    assert.ok(grid.every((c) => c.level && typeof c.acceptable === 'boolean'));
  });

  it('generateCriteriaDocumentation includes NR-01 reference', () => {
    const doc = generateCriteriaDocumentation(DEFAULT_CRITERIA_CONFIG, {
      methodologyName: 'Teste',
      versionNumber: 1,
    });
    assert.ok(doc.markdown.includes('NR-01'));
    assert.ok(doc.markdown.includes('Probabilidade'));
    assert.equal(doc.matrix.length, 25);
  });
});
