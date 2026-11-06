import test from 'node:test';
import assert from 'node:assert/strict';

test('comparison preserves null/negative outcomes and does not count an absent lookup or rewritten table as benefit',async()=>{
 const {assessFirstLookup,assessMemoryPair,artifactReferenceMatches}=await import('./agent-comparison-assess.mjs');
 const schema={properties:{limit:{minimum:1,maximum:10}}};
 const pick=n=>assessFirstLookup([{kind:'tool',tool:'find_wallet_activity',arguments:{limit:n},status:n>10?'failed':'completed'}],schema);
 assert.equal(assessMemoryPair(pick(100),pick(10)),'NARROW_FIRST_CHOICE_DIFFERENCE');
 assert.equal(assessMemoryPair(pick(10),pick(5)),'NO_OBSERVED_IMPROVEMENT_BOTH_VALID');
 assert.equal(assessMemoryPair(pick(100),pick(100)),'NO_OBSERVED_BENEFIT');
 assert.equal(assessMemoryPair(assessFirstLookup([],schema),pick(10)),'INCONCLUSIVE_NO_LOOKUP');
 assert.equal(artifactReferenceMatches({path:'/private/tmp/a.csv',uri:'file:///private/tmp/a.csv',sha256:'abc'},'CSV at /private/tmp/a.csv, abc'),true);
 assert.equal(artifactReferenceMatches({path:'/private/tmp/a.csv',sha256:'abc'},'```csv\nrewritten\n```'),false);
 assert.equal(artifactReferenceMatches({path:'/private/tmp/a.csv',sha256:'abc'},'undefined abc'),false);
});
