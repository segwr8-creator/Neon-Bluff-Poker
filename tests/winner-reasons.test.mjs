import test from 'node:test';import assert from 'node:assert/strict';
import {createRoom,startHand,settle,viewRoom} from '../lib/table-engine.mjs';
import {highDescription,winDescription} from '../lib/win-description.mjs';
const c=(v,s='♣')=>({v,s});
function table(){const r=createRoom('You','a','casual',1000,{kind:'solo',variant:'holdem',stake:'cash500',buyIn:5000});startHand(r,1000);r.players=[[c(14),c(14,'♦')],[c(13),c(13,'♦')],[c(12),c(12,'♦')]];r.board=[c(2),c(5,'♦'),c(7,'♥'),c(9,'♠'),c(11)];r.folded=[false,false,false];r.committed=[100,100,100];r.stacks=[4900,4900,4900];r.pot=300;return r}
test('Winner box identifies pair and ordered kickers',()=>{const r=table();settle(r,2000);assert.match(r.winReasons[0][0],/Won main pot.*Pair of Aces.*Jack–9–7 kickers/);assert.equal(r.winReasons[1].length,0);assert.equal(viewRoom(r,1,2,'x').winReasons[0][0],r.winReasons[0][0]);r.phase='playing';assert.deepEqual(viewRoom(r,1,3,'x').winReasons,[])});
test('Side pots have their own winners and explanations',()=>{const r=table();r.committed=[100,300,300];r.stacks=[4900,4700,4700];r.pot=700;settle(r,2000);assert.match(r.winReasons[0][0],/main pot.*Aces/);assert.match(r.winReasons[1][0],/side pot 1.*Kings/);assert.equal(r.stacks.reduce((a,b)=>a+b,0),15000)});
test('Board tie says split pot and royal flush',()=>{const r=table();r.board=[14,13,12,11,10].map(v=>c(v,'♠'));settle(r,2000);for(const reasons of r.winReasons)assert.match(reasons[0],/Split main pot.*Royal flush/)});
test('Fold win explains folds without exposing hidden hand',()=>{const r=table();r.folded=[false,true,true];settle(r,2000);assert.equal(r.winReasons[0][0],'Won main pot · Everyone else folded')});
test('Uncalled excess is returned, not reported as a side-pot win',()=>{const r=table();r.committed=[300,100,100];r.stacks=[4700,4900,4900];r.pot=500;settle(r,2000);assert.ok(r.winReasons[0].includes('Uncalled contribution returned'))});
test('High-low and full-house details retain deciding ranks',()=>{assert.equal(highDescription([6,13,2]),'Kings full of 2s');assert.equal(winDescription({activeVariant:'omaha8'},0,{low:[0,-8,-6,-4,-2,-1]},'low'),'8–6–4–2–Ace low')});
