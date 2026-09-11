import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SIGNALS, scoreLanguages, scoreTimezone, riskBand } from '../vendor/claude-environment/signals.ts';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync('src/views/claude/score.ts','utf8').replace('"../../../vendor/claude-environment/signals"', JSON.stringify(new URL('../vendor/claude-environment/signals.ts', import.meta.url).href));
const { summarizeSignals, detectSignal } = await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64')}`);
test('upstream weights, region exceptions and risk boundaries stay intact', () => {
 assert.equal(SIGNALS.reduce((n,s)=>n+s.weight,0),100);
 assert.equal(scoreTimezone('Asia/Shanghai'),1);
 assert.equal(scoreTimezone('Asia/Taipei'),0);
 assert.equal(scoreLanguages(['zh-TW','zh','en']),0);
 assert.equal(scoreLanguages(['zh-CN','en']),1);
 assert.deepEqual([30,31,60,61].map(riskBand),['low','medium','medium','high']);
});
test('weighted totals preserve fractional contributions and incomplete outcomes', () => {
 const outcomes=SIGNALS.map(()=>({raw:'test',score:0}));
 outcomes[0].score=1; outcomes[1].score=0.7;
 assert.deepEqual(summarizeSignals(outcomes),{total:37,band:'medium',complete:true});
 outcomes[2]={raw:'canvas unavailable',score:0};
 assert.equal(summarizeSignals(outcomes).complete,false);
 outcomes[2]=undefined;
 assert.equal(summarizeSignals(outcomes).complete,false);
});
test('detector errors remain failures rather than zero scores',async()=>{
 await assert.rejects(detectSignal({...SIGNALS[0],detect(){throw new Error('blocked')}}),/blocked/);
});
