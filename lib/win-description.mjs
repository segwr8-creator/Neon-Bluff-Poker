import {highFive} from './poker.mjs';
const rank=n=>({1:'Ace',11:'Jack',12:'Queen',13:'King',14:'Ace'}[n]||String(n));
const plural=n=>rank(n)+'s';
const ranks=values=>values.map(rank).join('–');
export function highDescription(score){const [cat,a,b,...rest]=score;switch(cat){
case 9:return 'Five '+plural(a);
case 8:return a===14?'Royal flush':rank(a)+'-high straight flush';
case 7:return 'Four '+plural(a)+' · '+rank(b)+' kicker';
case 6:return plural(a)+' full of '+plural(b);
case 5:return rank(a)+'-high flush · '+ranks([a,b,...rest]);
case 4:return rank(a)+'-high straight';
case 3:return 'Three '+plural(a)+' · '+ranks([b,...rest])+' kickers';
case 2:return 'Two pair, '+plural(a)+' and '+plural(b)+' · '+rank(rest[0])+' kicker';
case 1:return 'Pair of '+plural(a)+' · '+ranks([b,...rest])+' kickers';
case 0:return rank(a)+' high · '+ranks([a,b,...rest]);
default:return 'Best eligible hand';}}
export function winDescription(r,i,e,half='high'){
 const mode=r.activeVariant;
 if(half==='low'||mode==='razz'){const score=half==='low'?e.low:e.high;return score[0]===0?ranks(score.slice(1).map(v=>-v))+' low':highDescription(score.map(v=>-v))+' · ace-to-five low ranking'}
 if(mode==='triple')return highDescription(e.high.map(v=>-v))+' · 2–7 low ranking';
 if(mode==='neon'){const raw=highFive([...r.players[i],...r.board]);return highDescription(raw)+(r.twist===1?' · Neon Lowball ranking':r.twist===2&&e.high[0]!==raw[0]?' · Red Rush category bonus':r.twist===3&&raw[0]===5?' · Suit Signal beats four of a kind':'')}
 return highDescription(e.high)+(mode==='deuce'&&r.players[i].some(c=>c.v===2)?' · deuces wild':'');
}
