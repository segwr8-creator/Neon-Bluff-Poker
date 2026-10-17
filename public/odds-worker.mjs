import {evaluate,cmp} from './poker-rules.mjs';
import {MODES} from './game-modes.mjs';
// Only public cards reach this worker. Its samples never influence the actual deal.
onmessage=({data})=>{const {key,hand,board,opponents,twist,variant='neon',visible=[]}=data,g=MODES[variant];if(!g||opponents<1||!hand.length)return;
 const known=hand.concat(board,...visible),blocked=new Set(known.map(c=>c.s+c.v)),pool=['♠','♥','♦','♣'].flatMap(s=>Array.from({length:13},(_,i)=>({s,v:i+2}))).filter(c=>!blocked.has(c.s+c.v));let wins=0,ties=0;const trials=variant==='deuce'?160:450;
 for(let n=0;n<trials;n++){const d=pool.slice();let at=0;const draw=()=>{const j=at+Math.floor(Math.random()*(d.length-at));[d[j],d[at]]=[d[at],d[j]];return d[at++]};const shared=[...board];while(shared.length<g.board)shared.push(draw());const ownCards=[...hand];while(ownCards.length<g.hole)ownCards.push(draw());const own=evaluate(ownCards,shared,variant,twist);let better=false,equal=0;
 for(let i=0;i<opponents;i++){const otherCards=[...(visible[i]||[])];while(otherCards.length<g.hole)otherCards.push(draw());const other=evaluate(otherCards,shared,variant,twist),c=cmp(other.high,own.high);if(c>0)better=true;else if(c===0)equal++}
 if(!better){if(equal)ties++;else wins++}}
 postMessage({key,win:wins/trials*100,tie:ties/trials*100,trials,highOnly:['omaha8','stud8'].includes(variant)});
};
