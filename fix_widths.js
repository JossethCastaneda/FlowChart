const fs = require('fs');
let code = fs.readFileSync('components/ads-manager/AdsManagerTable.tsx', 'utf8');

const defaultWidthsStr = 
const defaultWidths: Record<string, number> = {
    name: NAME_W_DEFAULT,
    reach: 110, impressions: 120, cpm: 110, frequency: 110,
    clicks: 100, ctr: 90, cpc: 90, results: 110,
    conversations: 140, cost_per_message: 150, cost_per_conversation: 170,
    cpa: 150, spend: 140, quality_ranking: 130,
    roas: 110, objective: 140, landing_page_views: 130, hook_rate: 120,
    learning_phase: 160, advantage_plus: 110,
    purchases: 110, cost_per_purchase: 140, leads: 100, cost_per_lead: 130,
    outbound_clicks: 130, outbound_ctr: 110, unique_ctr: 110,
    thruplay: 120, thruplay_rate: 120, cost_per_thruplay: 150,
    video_p25: 110, video_p50: 110, video_p75: 110, video_p100: 110,
    video_plays: 130, video_plays_100: 140,
    add_to_cart: 120, cost_per_atc: 140, initiate_checkout: 140, cost_per_ic: 140,
    bid_strategy: 150, optimization_goal: 160, last_edited: 130,
    engagement_ranking: 140, conversion_ranking: 140,
};;

// Remove original definition
code = code.replace(/const defaultWidths: Record<string, number> = \{[\s\S]*?\n\s+\};\n/, '');

// Add before export function AdsManagerTable
code = code.replace('export function AdsManagerTable', defaultWidthsStr + '\n\nexport function AdsManagerTable');

fs.writeFileSync('components/ads-manager/AdsManagerTable.tsx', code);
