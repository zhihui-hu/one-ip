import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectLatencyNodes, latencyCountries } from '../src/views/ip/latency-presets.ts';
test('IP latency uses eight requested countries and never substitutes Hong Kong for China', () => {
 assert.equal(latencyCountries.length,8);assert.ok(latencyCountries.includes('cn'));assert.ok(!latencyCountries.includes('au'));
 const nodes=[{id:'hk',cc:'hk',city:'Hong Kong',name:'HK',preferredAsn:1,preferredProbes:10},{id:'us1',cc:'us',city:'A',name:'A',preferredAsn:1,preferredProbes:1},{id:'us2',cc:'us',city:'B',name:'B',preferredAsn:2,preferredProbes:3}];
 const selected=selectLatencyNodes(nodes);assert.equal(selected.find(x=>x.cc==='cn').node,undefined);assert.equal(selected.find(x=>x.cc==='us').node.id,'us2');
});
