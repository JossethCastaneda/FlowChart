import { describe, it, expect } from 'vitest';
import { findActionValue, findActionCost, calcCPA } from '../lib/ads-metrics';

describe('Ads Metrics Library', () => {
  it('findActionValue should extract correct action value based on type', () => {
    const actions = [
      { action_type: 'omni_purchase', value: '10' },
      { action_type: 'link_click', value: '150' },
    ];
    
    expect(findActionValue(actions, 'omni_purchase')).toBe(10);
    expect(findActionValue(actions, 'link_click')).toBe(150);
    expect(findActionValue(actions, 'non_existent')).toBe(0);
  });

  it('findActionCost should extract correct cost from costPerAction array', () => {
    const costPerAction = [
      { action_type: 'leadgen', value: '5.50' },
      { action_type: 'link_click', value: '0.25' }
    ];

    expect(findActionCost(costPerAction, 'leadgen')).toBe(5.50);
    expect(findActionCost(costPerAction, 'link_click')).toBe(0.25);
    expect(findActionCost(costPerAction, 'non_existent')).toBe(0);
  });

  it('calcCPA should calculate Cost Per Action using objective priority if provided', () => {
    const insight = {
      spend: 100,
      actions: [
        { action_type: 'leadgen', value: '5' },
        { action_type: 'link_click', value: '100' } // Should ignore this if objective is LEADS
      ]
    };
    
    // CPA for leads: 100 spend / 5 leads = 20
    const result = calcCPA(insight, 'OUTCOME_LEADS');
    expect(result.value).toBe(20);
    expect(result.label).toBe('CPL');
  });

  it('calcCPA should fallback to highest priority generic metric if no objective provided', () => {
    const insight = {
      spend: 50,
      actions: [
        { action_type: 'link_click', value: '50' }, // lower priority
        { action_type: 'purchase', value: '2' }     // higher priority (CPA)
      ]
    };
    
    // Generic fallback expects CPA (purchase) over CPC (link_click)
    const result = calcCPA(insight);
    expect(result.value).toBe(25);
    expect(result.label).toBe('CPA');
  });

  it('calcCPA should return 0 if there is no spend', () => {
    const insight = {
      spend: 0,
      actions: [{ action_type: 'leadgen', value: '5' }]
    };
    
    const result = calcCPA(insight, 'OUTCOME_LEADS');
    expect(result.value).toBe(0);
  });
});
