import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tlsFingerprint } from '../public/worker/tls-fingerprint.js';
test('reads trusted incoming metadata and tolerates missing individual fingerprints', () => {
 const data=tlsFingerprint({cf:{botManagement:{ja3Hash:'abc',ja4:''},tlsVersion:'TLSv1.3',tlsCipher:'AES128-GCM-SHA256'}});
 assert.equal(data.ja3,'abc'); assert.equal(data.ja4,null); assert.equal(data.tlsVersion,'TLSv1.3');
});
test('does not accept spoofed headers or invent local fingerprints', () => {
 const data=tlsFingerprint(new Request('https://example.com',{headers:{'ja3':'spoof','ja4':'spoof'}}));
 assert.equal(data.ja3,null); assert.equal(data.ja4,null); assert.equal(data.tlsVersion,null);
});
