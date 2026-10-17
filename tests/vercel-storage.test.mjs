import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@libsql/client';
import {adaptLibsql} from '../db/libsql-adapter.mjs';
import {createRoom,startHand,advance} from '../lib/table-engine.mjs';
test('Vercel storage batches roll back all earlier writes on failure',async()=>{
 const client=createClient({url:':memory:'}),db=adaptLibsql(client);
 try{
 await db.prepare('CREATE TABLE wallet(id TEXT PRIMARY KEY,balance INTEGER NOT NULL CHECK(balance>=0))').run();
 await db.prepare('INSERT INTO wallet VALUES (?,?)').bind('player',50000).run();
 await assert.rejects(db.batch([db.prepare('UPDATE wallet SET balance=balance-5000 WHERE id=?').bind('player'),db.prepare('INSERT INTO wallet VALUES (?,?)').bind('player',0)]));
 assert.equal((await db.prepare('SELECT * FROM wallet').first()).balance,50000);
 const r=await db.batch([db.prepare('UPDATE wallet SET balance=balance-5000 WHERE id=? AND balance>=5000').bind('player')]);
 assert.equal(r[0].meta.changes,1);assert.equal((await db.prepare('SELECT balance FROM wallet').first('balance')),45000);
 }finally{client.close()}
});
test('Bot deadline is 1–3 seconds and does not fire before due',()=>{
 for(let i=0;i<30;i++){
  const r=createRoom('Human','human','casual',1000,{kind:'solo',variant:'holdem',stake:'cash500',buyIn:5000,rules:'classic'});startHand(r,1000);
  // First seat acts initially; arrange next hand with a bot first to act.
  r.dealer=0;r.phase='showdown';startHand(r,1000);
  assert.equal(r.seats[r.turn].bot,true);
  assert.ok(r.turnUntil>=2000&&r.turnUntil<=4000);
  const turn=r.turn,until=r.turnUntil;advance(r,until-1);assert.equal(r.turn,turn);assert.equal(r.turnUntil,until);
  const events=r.events.length;advance(r,until);assert.ok(r.events.length>events);
 }
});
