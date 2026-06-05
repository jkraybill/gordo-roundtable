import { readFileSync } from 'node:fs';
import YAML from 'yaml';
import { formatDecisionBrief } from '../src/consensus/brief.js';

const file = process.argv[2];
if (!file) {
  console.error('Usage: npx tsx scripts/format-brief.ts <consensus-result.yaml>');
  process.exit(1);
}

const result = YAML.parse(readFileSync(file, 'utf-8'));
console.log(formatDecisionBrief(result.decision_brief));
