export function handScore(cards){
 const values=cards.map(c=>c.v).sort((a,b)=>b-a),counts=new Map();values.forEach(v=>counts.set(v,(counts.get(v)||0)+1));
 const groups=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0]),uniq=[...new Set(values)],flush=cards.every(c=>c.s===cards[0].s);
 const straight=uniq.length===5&&(uniq[0]-uniq[4]===4?uniq[0]:(uniq.join(',')==='14,5,4,3,2'?5:0));
 const pattern=groups.map(x=>x[1]).join(',');
 if(flush&&straight)return [8,straight];
 if(pattern==='4,1')return [7,groups[0][0],groups[1][0]];
 if(pattern==='3,2')return [6,groups[0][0],groups[1][0]];
 if(flush)return [5,...values];
 if(straight)return [4,straight];
 if(pattern==='3,1,1')return [3,groups[0][0],groups[1][0],groups[2][0]];
 if(pattern==='2,2,1')return [2,Math.max(groups[0][0],groups[1][0]),Math.min(groups[0][0],groups[1][0]),groups[2][0]];
 if(pattern==='2,1,1,1')return [1,groups[0][0],...groups.slice(1).map(x=>x[0])];
 return [0,...values];
}
export const LABELS=['High card','Pair','Two pair','Three of a kind','Straight','Flush','Full house','Four of a kind','Straight flush'];
export function strength(cards,twist){
 const raw=handScore(cards),a=[...raw];
 if(twist===1)return [-a[0],...a.slice(1).map(v=>-v)];
 if(twist===2&&cards.filter(c=>'♥♦'.includes(c.s)).length>=3)a[0]=Math.min(8,a[0]+1);
 if(twist===3&&raw[0]===5)a[0]=7.5;
 return a;
}
export function cmp(a,b){for(let i=0;i<Math.max(a.length,b.length);i++){let d=(a[i]||0)-(b[i]||0);if(d)return d}return 0}
export function combinations(a,k){const out=[];function take(at,part){if(part.length===k){out.push(part);return}for(let i=at;i<=a.length-(k-part.length);i++)take(i+1,[...part,a[i]])}take(0,[]);return out}
export function highFive(cards){const s=handScore(cards);if(cards.length===5&&cards.every(c=>c.v===cards[0].v))return [9,cards[0].v];return s}
export function lowFive(cards,qualifier=false){const vals=cards.map(c=>c.v===14?1:c.v),counts=new Map();vals.forEach(v=>counts.set(v,(counts.get(v)||0)+1));const groups=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0]);if(qualifier&&(counts.size!==5||Math.max(...vals)>8))return null;const pattern=groups.map(g=>g[1]).join(','),cat=({'4,1':7,'3,2':6,'3,1,1':3,'2,2,1':2,'2,1,1,1':1})[pattern]||0;return [-cat,...groups.map(g=>-g[0])]}
function deuceScore(cards){const fixed=cards.filter(c=>c.v!==2),wild=5-fixed.length;if(!wild)return highFive(cards);let best=null;const suits=fixed.length&&fixed.every(c=>c.s===fixed[0].s)?[fixed[0].s]:['♠'];function fill(left,min,added){if(!left){const h=[...fixed,...added.map((v,i)=>({v,s:suits[0]}))],s=highFive(h);if(!best||cmp(s,best)>0)best=s;return}for(let v=min;v<=14;v++)fill(left-1,v,[...added,v])}fill(wild,2,[]);return best}
export function evaluate(hand,board=[],variant='holdem',twist=0){let choices;if(variant==='neon'){const all=[...hand,...board];if(all.length<5)return {high:[-99],label:'Building your hand'};return {high:strength(all,twist),label:LABELS[handScore(all)[0]]||'High card'}}if(['omaha','omaha8'].includes(variant))choices=combinations(hand,2).flatMap(h=>combinations(board,3).map(b=>h.concat(b)));else choices=combinations([...hand,...board],5);if(!choices.length)return {high:[-99],low:null,label:'Building your hand'};let best=null,low=null;for(const five of choices){let score=variant==='razz'?lowFive(five):variant==='deuce'?deuceScore(five):highFive(five);if(variant==='triple'){if(score[0]===4&&score[1]===5)score=[0,...five.map(c=>c.v).sort((a,b)=>b-a)];else if(score[0]===8&&score[1]===5)score=[5,...five.map(c=>c.v).sort((a,b)=>b-a)];score=score.map(v=>-v)}if(!best||cmp(score,best)>0)best=score;if(['omaha8','stud8'].includes(variant)){const l=lowFive(five,true);if(l&&(!low||cmp(l,low)>0))low=l}}const lowOnly=['razz','triple'].includes(variant);return {high:best,low,label:lowOnly?(best[0]===0?best.slice(1).map(v=>-v===1?'A':String(-v)).join('-')+' low':'Paired / penalized low hand'):best[0]===9?'Five of a kind':LABELS[best[0]]||'High card'}}
export function frontScore(cards){const vals=cards.map(c=>c.v).sort((a,b)=>b-a),groups=[...new Set(vals)].map(v=>[v,vals.filter(x=>x===v).length]).sort((a,b)=>b[1]-a[1]||b[0]-a[0]);return [groups[0][1]===3?3:groups[0][1]===2?1:0,...groups.map(g=>g[0])]}
export function chineseScore(cards,rows){const f=rows.front.map(i=>cards[i]),m=rows.middle.map(i=>cards[i]),b=rows.back.map(i=>cards[i]);const scores=[frontScore(f),highFive(m),highFive(b)];return {scores,foul:cmp(scores[2],scores[1])<0||cmp(scores[1],scores[0])<0}}
