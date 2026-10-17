import assert from 'node:assert/strict';
import {createRoom,joinRoom,startHand,actionRoom,advance,viewRoom,cap,leaveRoom,newDeck} from '../lib/table-engine.mjs';
let handCount=0,actionCount=0;
for(let game=0;game<30;game++){
 const r=createRoom('A','a');joinRoom(r,'B','b');if(game%2)joinRoom(r,'C','c');
 for(let h=0;h<12;h++){
  const startingStacks=[...r.stacks];startHand(r,1000);if(r.phase==='ended')break;handCount++;assert.deepEqual(r.handStartStacks,startingStacks);
  for(let n=0;n<60&&r.phase==='playing';n++){
   const i=r.turn;assert.equal(r.seats[i].bot,false);const v=viewRoom(r,i,2,'TESTCODE22');
   for(let j=0;j<3;j++)if(j!==i)assert.equal(v.players[j].cards,null,'opponent cards leaked');
   assert.equal(v.board.filter(Boolean).length,r.street);
   const max=cap(r)-r.bet;const action=n%5===0&&h%4===0?'fold':max>0&&r.raises<3&&n%3===0?'raise':'call';
   actionRoom(r,i,action,action==='raise'?Math.min(11,max):0,`g${game}h${h}n${n}`,1000);actionCount++;
   assert.equal(r.stacks.reduce((a,b)=>a+b,0)+r.pot,180);assert.ok(r.stacks.every(n=>n>=0));
  }
  assert.equal(r.phase,'showdown');assert.equal(r.lastPayouts.reduce((a,b)=>a+b,0),r.lastPot);assert.deepEqual(r.lastEndStacks,r.stacks);assert.deepEqual(r.handStartStacks,startingStacks);assert.ok(r.totalPayouts.every((n,i)=>n>=r.lastPayouts[i]));assert.equal(r.stacks.reduce((a,b)=>a+b,0),180);
 }
}
const r=createRoom('A','a');joinRoom(r,'B','b');startHand(r,1000);const before=r.turn;advance(r,62000);assert.ok(r.turn!==before||r.phase==='showdown');
const out=createRoom('A','a');joinRoom(out,'B','b');joinRoom(out,'C','c');startHand(out,1000);assert.throws(()=>actionRoom(out,1,'call',0,'x',1000),/not your turn/);assert.throws(()=>actionRoom(out,0,'raise',999,'x',1000),/outside/);const original=out.stacks[0];actionRoom(out,0,'raise',7,'valid',1000);actionRoom(out,0,'raise',7,'valid',1000);assert.equal(out.stacks[0],original-7);leaveRoom(out,1,1000);assert.equal(out.seats[1].bot,true);const d=newDeck();assert.equal(new Set(d.map(c=>c.s+c.v)).size,52);
console.log(JSON.stringify({handCount,actionCount,conservedChips:true,hiddenCards:true,timeout:true,duplicateAction:true,outOfTurnRejected:true}));
