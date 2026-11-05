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
test('frontend requests Net.Coffee without cookies and rejects mismatched results', async () => {
 const original=globalThis.fetch;
 globalThis.fetch=async(url, options)=>{
  assert.equal(url,'https://ip.net.coffee/api/ip/lookup/1.1.1.1');
  assert.equal(options.credentials,'omit');assert.equal(options.mode,'cors');
  return Response.json({ip:'8.8.8.8'});
 };
 try {await assert.rejects(lookupIp('1.1.1.1'));} finally {globalThis.fetch=original;}
});
test('IP lookup falls back to the same-origin API when Net.Coffee is unreachable', async () => {
 const { lookupIpWithFallback } = await import('../src/views/ip/api.ts');
 const original=globalThis.fetch;const urls=[];
 globalThis.fetch=async(url)=>{
  urls.push(String(url));
  if(String(url).startsWith('https://ip.net.coffee/')) throw new TypeError('Failed to fetch');
  return Response.json({geo:{ip:'1.1.1.1',country:'Australia',country_code:'AU',asn:13335,source:'ipwho.is'},sources:[{ip:'1.1.1.1',country:'Australia',source:'ipwho.is'},{ip:'9.9.9.9',source:'bad'}]});
 };
 try {
  const result=await lookupIpWithFallback('1.1.1.1');
  assert.equal(result.fallback,true);assert.equal(result.coffee.countryCode,'AU');assert.equal(result.coffee.asn,13335);
  assert.equal(result.sources.length,1);assert.equal(result.risk.available,false);
  assert.match(urls[1],/\/api\/ip\/lookup\/1\.1\.1\.1$/);
 } finally {globalThis.fetch=original;}
});
test('IP lookup keeps the Net.Coffee error when the fallback also fails', async () => {
 const { lookupIpWithFallback } = await import('../src/views/ip/api.ts');
 const original=globalThis.fetch;
 globalThis.fetch=async(url)=>String(url).startsWith('https://ip.net.coffee/')?Response.json({ip:'8.8.8.8'}):new Response('{}',{status:502});
 try {await assert.rejects(lookupIpWithFallback('1.1.1.1'),/不匹配|match/i);} finally {globalThis.fetch=original;}
});
test('home geo lookup falls back to the same-origin API when both providers are blocked', async () => {
 const { getGeo } = await import('../src/views/home/api.ts');
 const original=globalThis.fetch;
 globalThis.fetch=async(url)=>{
  if(!String(url).includes('/api/geoip/')) throw new TypeError('Failed to fetch');
  return Response.json({ip:'1.1.1.1',country:'Australia',source:'ipwho.is'});
 };
 try {const geo=await getGeo('1.1.1.1');assert.equal(geo.country,'Australia');} finally {globalThis.fetch=original;}
});
