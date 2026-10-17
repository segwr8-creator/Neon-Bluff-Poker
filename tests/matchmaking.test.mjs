import test from 'node:test';
import assert from 'node:assert/strict';
import {findOpenTable} from '../public/matchmaking.mjs';
const query={variant:'holdem',stake:'micro',rules:'classic',wallet:5000};
const table={code:'ABCDE23456',variant:'holdem',stake:'micro',rules:'classic',funds:'cash',phase:'lobby',players:1,capacity:6,bankRequired:0,min:500};
test('matches compatible waiting tables, preferring more human players',()=>{
 const populated={...table,code:'BCDEF23456',players:3};
 assert.equal(findOpenTable([table,populated],query),populated);
});
test('never matches full, active, ended, unaffordable or different tables',()=>{
 for(const change of [{players:6},{players:0},{phase:'playing'},{phase:'showdown'},{phase:'ended'},{min:6000},{bankRequired:6000},{stake:'high'},{variant:'omaha'}])
  assert.equal(findOpenTable([{...table,...change}],query),null);
});
test('Neon house rules must match; no players means no invented match',()=>{
 assert.equal(findOpenTable([{...table,variant:'neon',rules:'remix'}],{...query,variant:'neon'}),null);
 assert.equal(findOpenTable([],query),null);
});
