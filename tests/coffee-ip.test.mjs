import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adaptCoffee } from '../src/views/ip/coffee.ts';
import { lookupIp } from '../src/views/ip/api.ts';

test('Net.Coffee score and residential flag are preserved, null coordinates are skipped', () => {
 const result=adaptCoffee({ip:'124.127.77.179',trust_score:97,isResidential:true,is_mobile:false,isp:'China Telecom',geo_sources:[{src:'g1',lat:null,lon:null},{src:'g2',lat:39.911,lon:116.395}]});
 assert.equal(result.coffee.trust_score,97);assert.equal(result.coffee.isResidential,true);
 assert.equal(result.geo.latitude,39.911);assert.equal(result.geo.isp,'China Telecom');
 assert.equal(result.risk.vpn,undefined);
});
test('frontend requests the same-origin Rust API and rejects mismatched results', async () => {
 const original=globalThis.fetch;
 globalThis.fetch=async(url, options)=>{
  assert.equal(url,'/api/ip/coffee/1.1.1.1');
  assert.equal(options.cache,'no-store');
  return Response.json({ip:'8.8.8.8'});
 };
 try {await assert.rejects(lookupIp('1.1.1.1'));} finally {globalThis.fetch=original;}
});
