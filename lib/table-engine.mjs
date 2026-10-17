import {winDescription} from './win-description.mjs';
import { evaluate, cmp, highFive, frontScore, chineseScore, combinations } from './poker.mjs';
import { MODES, HORSE } from '../public/game-modes.mjs';
import { STAKES, aggression, formatAmount } from '../public/table-config.mjs';
export const SUITS=['♠','♥','♦','♣'];
export function randomInt(n){const limit=4294967296-(4294967296%n);let a;do{a=crypto.getRandomValues(new Uint32Array(1))[0]}while(a>=limit);return a%n}
function shuffle(d){for(let i=d.length-1;i>0;i--){const j=randomInt(i+1);[d[i],d[j]]=[d[j],d[i]]}return d}
export function newDeck(){return shuffle(SUITS.flatMap(s=>Array.from({length:13},(_,i)=>({s,v:i+2}))))}
export const emptyStats=()=>({actions:0,raises:0,calls:0,checks:0,folds:0});
const firstNames=['Mara','Dex','Ivy','Theo','Sloane','Jules','Nico','Vera','Luca','Arden','Remy','Sasha','Ellis','Rory','Tess','Milo','Cleo','Ari','Jade','Finn'];
const aliases=['Velvet','Sterling','Noir','Monroe','Vale','Fox','Reed','Blake','Lux','Quinn'];
const botName=()=>firstNames[randomInt(firstNames.length)]+' '+aliases[randomInt(aliases.length)];
export function validateBuyIn(stake,buyIn){const t=STAKES[stake];if(!t||!Number.isInteger(buyIn)||buyIn<t.min||buyIn>t.max||buyIn%t.unit)throw new Error('Choose an affordable buy-in within this table’s limits.');return t}
export function createRoom(name,hash,mode='casual',now=Date.now(),options={}){
 const variant=MODES[options.variant]&&!MODES[options.variant].hidden?options.variant:'neon',g=MODES[variant],stake=options.stake||'cash500',buyIn=options.buyIn??5000,t=validateBuyIn(stake,buyIn),solo=options.kind==='solo';
 if(g.soloOnly&&!solo)throw new Error('Fast-fold is currently available against computers only.');
 if((g.tournamentOnly||variant==='chinese')&&stake!=='tournament')throw new Error('Choose Tournament for this score-only mode.');
 const count=variant==='jackpot'?3:solo?Math.min(3,g.max):Math.min(g.max,Math.max(2,Number(options.capacity)||6));
 const r={engineVersion:3,variant,activeVariant:variant==='horse'?'holdem':variant,phase:'lobby',kind:solo?'solo':'live',name:options.tableName||name+'’s table',listed:!solo&&options.listed===true,capacity:count,moneyVersion:2,stake,funds:t.funds,unit:t.unit,ante:0,smallBlind:t.smallBlind,bigBlind:t.bigBlind,dealer:-1,rules:options.rules==='classic'?'classic':'remix',mode:['casual','sharp','chaos'].includes(mode)?mode:'casual',host:0,hand:0,seats:Array(count).fill(null),stacks:Array(count).fill(0),buyIns:Array(count).fill(0),totalPayouts:Array(count).fill(0),pot:0,history:[],lastActions:Array(count).fill(null),events:[],eventSeq:0,created:now,updated:now,turnUntil:0,points:Array(count).fill(0)};
 r.seats[0]={name,hash,bot:false,stats:options.stats||emptyStats()};r.stacks[0]=r.buyIns[0]=buyIn;
 if(solo){const names=new Set([name]);for(let i=1;i<count;i++){let n;do{n=botName()}while(names.has(n));names.add(n);r.seats[i]={name:n,hash:null,bot:true,stats:emptyStats()};r.stacks[i]=r.buyIns[i]=buyIn}}
 return r;
}
function log(r,text){r.history.unshift(text);r.history=r.history.slice(0,45)}
export const alive=r=>r.seats.map((s,i)=>s&&!r.folded[i]?i:-1).filter(i=>i>=0);
const spec=r=>MODES[r.activeVariant];
function nextSeat(r,from){for(let k=1;k<=r.capacity;k++){const i=(from+k+r.capacity)%r.capacity;if(r.seats[i]&&!r.folded[i])return i}return -1}
function chooseTurn(r,now){for(let k=0;k<r.capacity;k++){const i=(r.turn+k+r.capacity)%r.capacity;if(r.pending.includes(i)){r.turn=i;r.decisionSeconds=15;r.turnUntil=now+(r.seats[i]?.bot?1000+randomInt(2001):15000);return}}r.turnUntil=0}
function pay(r,i,n,street=true){n=Math.min(r.stacks[i],Math.max(0,n));r.stacks[i]-=n;r.committed[i]+=n;r.pot+=n;if(street)r.contributions[i]+=n;return n}
function bettingType(r){return r.variant==='horse'?'fixed-limit':spec(r).betting}
function limitSize(r){const late=spec(r).type==='draw'&&spec(r).draws===1?r.street>=1:r.street>=2;return r.bigBlind*(late?2:1)}
export function legal(r,i){const due=Math.max(0,r.bet-r.contributions[i]),available=Math.max(0,r.stacks[i]-due),type=bettingType(r);let max=available,min=r.lastRaise||r.bigBlind;
 if(type==='pot-limit')max=Math.min(max,r.pot+due);
 if(type==='fixed-limit'){const size=limitSize(r);min=r.bet<size?size-r.bet:size;max=Math.min(max,min);if(r.raises>=4)max=0}
 if(r.actedAt[i]!==null&&r.bet-r.actedAt[i]<r.lastRaise)max=0;
 if(alive(r).filter(j=>j!==i&&r.stacks[j]>0).length===0)max=0;
 return {due,call:Math.min(due,r.stacks[i]),min:Math.min(min,max),max,type,allIn:due>=r.stacks[i]};
}
export const cap=r=>r.bet+legal(r,r.turn).max;
function studFirst(r){const up=i=>r.players[i].slice(2,Math.min(6,r.players[i].length));const low=r.activeVariant==='razz';return alive(r).sort((a,b)=>{
 const score=i=>{const cards=up(i),vs=cards.map(c=>low&&c.v===14?1:c.v),groups=[...new Set(vs)].map(v=>[v,vs.filter(x=>x===v).length]).sort((a,b)=>b[1]-a[1]||b[0]-a[0]),cat=groups[0][1]===4?7:groups[0][1]===3?3:groups.filter(x=>x[1]===2).length===2?2:groups[0][1]===2?1:0;const result=[cat,...groups.map(x=>x[0])];return low?result.map(v=>-v):result};const d=cmp(score(b),score(a));return d||a-b;
 })[0]}
function startStreet(r,now){r.bet=0;r.raises=0;r.contributions=r.seats.map(()=>0);r.actedAt=r.seats.map(()=>null);r.lastRaise=bettingType(r)==='fixed-limit'?limitSize(r):r.bigBlind;r.pending=alive(r).filter(i=>r.stacks[i]>0);if(r.pending.length<2)r.pending=[];r.turn=spec(r).type==='stud'?studFirst(r):nextSeat(r,r.dealer);r.stage='bet';chooseTurn(r,now)}
export function joinRoom(r,name,hash,buyIn,stats){const exists=r.seats.findIndex(s=>s?.hash===hash);if(exists>=0)return exists;if(r.funds==='tournament'&&r.hand>0)throw new Error('This tournament has started.');if(r.kind==='solo')throw new Error('This is a solo table.');if(r.phase==='playing')throw new Error('Wait until this hand finishes.');validateBuyIn(r.stake,buyIn);const i=r.seats.findIndex(s=>!s);if(i<0)throw new Error('This table is full.');r.seats[i]={name,hash,bot:false,stats:stats||emptyStats()};r.stacks[i]=r.buyIns[i]=buyIn;r.totalPayouts[i]=0;r.lastActions[i]=null;if(r.players)r.players[i]=[];if(r.folded)r.folded[i]=true;if(r.handStartStacks)r.handStartStacks[i]=buyIn;if(r.lastEndStacks)r.lastEndStacks[i]=buyIn;if(r.lastPayouts)r.lastPayouts[i]=null;if(r.host<0)r.host=i;log(r,name+' joined.');return i}
export function startHand(r,now=Date.now()){
 if(r.phase==='playing')throw new Error('Finish this hand first.');if(r.phase==='ended')throw new Error('This tournament has finished.');
 r.folded=r.seats.map((s,i)=>!s||r.stacks[i]<r.unit);if(alive(r).length<2)throw new Error('At least two players with chips are required.');if(r.variant==='jackpot'&&r.hand===0&&alive(r).length!==3)throw new Error('Jackpot Sit & Go needs exactly three players.');
 r.activeVariant=r.variant==='horse'?HORSE[Math.floor(r.hand/5)%5]:r.variant;r.hand++;const g=spec(r);
 if(r.funds==='tournament'&&r.variant!=='chinese'){const level=Math.min(8,Math.floor((r.hand-1)/10));r.smallBlind=25*2**level;r.bigBlind=50*2**level}
 if(r.variant==='jackpot'&&!r.multiplier){const n=randomInt(1000);r.multiplier=n<700?2:n<900?3:n<980?5:n<999?10:1000;r.jackpotScore=10000*r.multiplier;log(r,'Jackpot revealed: '+r.multiplier+'× · '+r.jackpotScore.toLocaleString()+' score points (no cash value).')}
 r.handStartStacks=[...r.stacks];r.deck=newDeck();r.discards=[];r.players=r.seats.map((s,i)=>r.folded[i]?[]:Array.from({length:g.type==='stud'?3:g.hole},()=>r.deck.pop()));r.board=[];r.street=0;r.pot=0;r.phase='playing';r.stage=g.type==='set'?'arrange':'bet';r.winners=[];r.winReasons=r.seats.map(()=>[]);r.result='';r.reveal=false;r.nextHandAt=0;r.rows=r.seats.map(()=>null);r.twist=r.activeVariant==='neon'&&r.rules!=='classic'?(r.mode==='chaos'?1+randomInt(3):randomInt(4)):0;
 if(!(r.variant==='horse'&&g.type==='stud'))r.dealer=nextSeat(r,r.dealer??-1);r.smallSeat=r.bigSeat=-1;r.contributions=r.seats.map(()=>0);r.committed=r.seats.map(()=>0);r.actedAt=r.seats.map(()=>null);r.raises=0;r.lastRaise=r.bigBlind;r.ante=0;r.bet=0;
 if(g.type==='set'){r.pending=alive(r);r.turn=nextSeat(r,r.dealer);chooseTurn(r,now);log(r,'Hand '+r.hand+': arrange front, middle and back.');return}
 if(g.type==='stud'){
  r.ante=Math.max(r.unit,Math.floor(r.bigBlind/5/r.unit)*r.unit);for(const i of alive(r))pay(r,i,r.ante,false);
  const low=r.activeVariant==='razz';const doors=alive(r).sort((a,b)=>{const c=r.players[a][2],d=r.players[b][2],x=low?(c.v===14?1:c.v):c.v,y=low?(d.v===14?1:d.v):d.v;return (low?y-x:x-y)||(low?SUITS.indexOf(c.s)-SUITS.indexOf(d.s):SUITS.indexOf(d.s)-SUITS.indexOf(c.s))});r.bringSeat=doors[0];r.bringIn=Math.max(r.unit,Math.floor(r.bigBlind/2/r.unit)*r.unit);pay(r,r.bringSeat,r.bringIn);r.bet=r.bringIn;r.turn=nextSeat(r,r.bringSeat);r.lastRaise=r.bigBlind-r.bet;
 }else{r.smallSeat=alive(r).length===2?r.dealer:nextSeat(r,r.dealer);r.bigSeat=nextSeat(r,r.smallSeat);pay(r,r.smallSeat,r.smallBlind);pay(r,r.bigSeat,r.bigBlind);r.bet=r.bigBlind;r.turn=nextSeat(r,r.bigSeat)}
 r.pending=alive(r).filter(i=>r.stacks[i]>0);if(r.pending.length===1&&r.contributions[r.pending[0]]>=r.bet)r.pending=[];chooseTurn(r,now);log(r,'Hand '+r.hand+' · '+g.name+' · '+bettingType(r));advance(r,now);
}
function winnersFor(indices,scores,key){let best=null,out=[];for(const i of indices){const s=scores[i][key];if(!s)continue;if(!best||cmp(s,best)>0){best=s;out=[i]}else if(cmp(s,best)===0)out.push(i)}return out}
function distribute(r,amount,winners){if(!winners.length)return;const ordered=[...winners].sort((a,b)=>((a-r.dealer-1+r.capacity)%r.capacity)-((b-r.dealer-1+r.capacity)%r.capacity));const units=amount/r.unit,share=Math.floor(units/ordered.length)*r.unit;ordered.forEach((i,j)=>{const n=share+(j<units%ordered.length?r.unit:0);r.stacks[i]+=n;r.lastPayouts[i]+=n;r.totalPayouts[i]+=n})}
export function settle(r,now=Date.now()){
 const live=alive(r);r.lastPot=r.pot;r.lastPayouts=r.seats.map(()=>0);r.reveal=live.length>1;r.sidePots=[];r.winReasons=r.seats.map(()=>[]);
 if(spec(r).type==='set'){
  const scores=Object.fromEntries(live.map(i=>[i,chineseScore(r.players[i],r.rows[i])]));const delta=r.seats.map(()=>0),comparisons=r.seats.map(()=>[]);
  for(let a=0;a<live.length;a++)for(let b=a+1;b<live.length;b++){const i=live[a],j=live[b],x=scores[i],y=scores[j];let n=0;if(x.foul!==y.foul)n=x.foul?-6:6;else if(!x.foul){const parts=x.scores.map((s,k)=>Math.sign(cmp(s,y.scores[k])));n=parts.reduce((a,b)=>a+b,0);if(parts.every(v=>v===1))n+=3;if(parts.every(v=>v===-1))n-=3}comparisons[i].push('vs '+r.seats[j].name+': '+(x.foul?'fouled layout':y.foul?'opponent fouled':x.scores.map((score,k)=>['front','middle','back'][k]+' '+(cmp(score,y.scores[k])>0?'won':cmp(score,y.scores[k])<0?'lost':'tied')).join(', '))+' · '+(n>=0?'+':'')+n+' points');comparisons[j].push('vs '+r.seats[i].name+': '+(y.foul?'fouled layout':x.foul?'opponent fouled':y.scores.map((score,k)=>['front','middle','back'][k]+' '+(cmp(score,x.scores[k])>0?'won':cmp(score,x.scores[k])<0?'lost':'tied')).join(', '))+' · '+(-n>=0?'+':'')+(-n)+' points');delta[i]+=n;delta[j]-=n}
  live.forEach(i=>r.points[i]+=delta[i]);r.winners=live.filter(i=>delta[i]===Math.max(...live.map(j=>delta[j])));for(const i of r.winners)r.winReasons[i]=comparisons[i];r.result=live.map(i=>r.seats[i].name+': '+(scores[i].foul?'foul · ':'')+(delta[i]>=0?'+':'')+delta[i]+' points').join(' · ');
 }else{
  const scores=Object.fromEntries(live.map(i=>[i,evaluate(r.players[i],r.board,r.activeVariant,r.twist)]));const levels=[...new Set(r.committed.filter(n=>n>0))].sort((a,b)=>a-b);let prev=0;
  const award=(amount,winners,label,half='high')=>{const before=[...r.lastPayouts];distribute(r,amount,winners);for(const i of winners){if(r.lastPayouts[i]===before[i])continue;const reason=live.length===1?'Everyone else folded':winDescription(r,i,scores[i],half);r.winReasons[i].push((winners.length>1?'Split ':'Won ')+label+' · '+reason)}};
  for(const level of levels){const contributors=r.committed.map((n,i)=>n>=level?i:-1).filter(i=>i>=0),amount=(level-prev)*contributors.length;prev=level;const eligible=contributors.filter(i=>live.includes(i));if(!eligible.length){for(const i of contributors){r.stacks[i]+=amount/contributors.length;r.lastPayouts[i]+=amount/contributors.length;r.winReasons[i].push('Uncalled contribution returned')}continue}const high=winnersFor(eligible,scores,'high'),low=winnersFor(eligible,scores,'low');const potName=r.sidePots.length?'side pot '+r.sidePots.length:'main pot';r.sidePots.push({amount,eligible});if(contributors.length===1){distribute(r,amount,high);for(const i of high)r.winReasons[i].push('Uncalled contribution returned');continue}if(low.length){const lower=Math.floor(amount/r.unit/2)*r.unit;award(amount-lower,high,potName+' (high)');award(lower,low,potName+' (low)','low')}else award(amount,high,potName)}
  r.winners=live.filter(i=>r.lastPayouts[i]>0);r.result=r.winners.map(i=>r.seats[i].name+' +'+formatAmount(r.lastPayouts[i],r.funds)).join(' · ')+(live.length>1?' · '+live.map(i=>r.seats[i].name+': '+scores[i].label+(scores[i].low?' + qualifying low':'')).join(' · '):' · Everyone else folded.');
 }
 if(r.kind==='live'&&r.funds==='cash'){
  const net=r.stacks.map((n,i)=>n-(r.handStartStacks[i]||0));
  const winners=net.map((n,i)=>n>0&&r.seats[i]&&!r.seats[i].bot?i:-1).filter(i=>i>=0);
  const losses=net.map((n,i)=>n<0&&r.seats[i]&&!r.seats[i].bot?i:-1).filter(i=>i>=0);
  r.auditHands=r.auditHands||[];
  for(const loser of losses)for(const winner of winners){const loss=-net[loser];if(loss>=r.bigBlind*20&&loss>=r.handStartStacks[loser]*.4)r.auditHands.push({hand:r.hand,loser:r.seats[loser].hash,winner:r.seats[winner].hash,loss,gain:net[winner],time:now})}
  r.auditHands=r.auditHands.slice(-200);
 }
 r.lastEndStacks=[...r.stacks];r.pot=0;r.phase='showdown';r.turnUntil=0;r.nextHandAt=now+3000;
 if(r.funds==='tournament'&&r.variant!=='chinese'&&r.seats.filter((s,i)=>s&&r.stacks[i]>0).length===1){r.phase='ended';r.nextHandAt=0;r.result+=' Tournament winner!'+(r.variant==='jackpot'?' Score prize: '+r.jackpotScore.toLocaleString()+' points.':'')}
 log(r,r.result);
}
function record(r,i,kind,amount,now){const s=r.seats[i],stats=s.stats||(s.stats=emptyStats());if(['raise','bet','call','check','fold'].includes(kind)){stats.actions++;stats[kind==='raise'||kind==='bet'?'raises':kind==='call'?'calls':kind==='check'?'checks':'folds']++}const text=s.name+' — '+({raise:'raises to ',bet:'bets ',call:'calls ',check:'checks',fold:'folds',draw:'draws ',discard:'discards ',arrange:'sets three rows',leave:'left'}[kind]||kind)+(amount?(['draw','discard'].includes(kind)?amount+' card'+(amount===1?'':'s'):formatAmount(amount,r.funds)):'')+(kind==='call'?' · matched '+formatAmount(r.contributions[i],r.funds)+(r.stacks[i]===0?' · all-in':''):'');r.events.push({id:++r.eventSeq,seat:i,name:s.name,kind,amount,total:r.contributions?.[i]??0,time:now,text});r.events=r.events.slice(-30);log(r,text)}
function validIndices(values,length,count){if(!Array.isArray(values)||values.length>length||(count!==undefined&&values.length!==count)||values.some(x=>!Number.isInteger(x)||x<0||x>=length)||new Set(values).size!==values.length)throw new Error('Choose valid cards.');return values}
function apply(r,i,action,amount,now){
 if(r.stage==='arrange'){
  if(action!=='arrange'||!amount)throw new Error('Arrange your three hands.');const rows={front:validIndices(amount.front,13,3),middle:validIndices(amount.middle,13,5),back:validIndices(amount.back,13,5)};if(new Set([...rows.front,...rows.middle,...rows.back]).size!==13)throw new Error('Use each card exactly once.');r.rows[i]=rows;r.pending=r.pending.filter(n=>n!==i);record(r,i,'arrange',0,now);
 }else if(['draw','discard'].includes(r.stage)){
  if(action!==r.stage)throw new Error('Choose your cards first.');const indices=validIndices(amount,r.players[i].length,r.stage==='discard'?1:undefined),removed=indices.map(k=>r.players[i][k]);if(r.stage==='discard')r.players[i]=r.players[i].filter((c,k)=>!indices.includes(k));else{for(const k of indices){if(!r.deck.length){r.deck=shuffle(r.discards);r.discards=[]}if(!r.deck.length)throw new Error('No replacement cards available.');r.players[i][k]=r.deck.pop()}}r.discards.push(...removed);r.pending=r.pending.filter(n=>n!==i);record(r,i,action,indices.length,now);
 }else if(action==='fold'){r.folded[i]=true;r.pending=r.pending.filter(n=>n!==i);record(r,i,'fold',0,now)}
 else{
  const limits=legal(r,i),old=r.bet;let kind;
  if(action==='check'&&limits.due>0)throw new Error('You must call the outstanding amount or fold.');
  if(action==='raise'){
   if(!Number.isInteger(amount)||amount<limits.min||amount>limits.max||amount<=0||amount%r.unit)throw new Error('Raise is outside the legal range.');
   r.bet+=amount;const full=amount>=r.lastRaise||(bettingType(r)==='fixed-limit'&&r.bet===limitSize(r));if(full){r.lastRaise=bettingType(r)==='fixed-limit'?limitSize(r):amount;r.raises++}r.pending=alive(r).filter(n=>n!==i&&r.stacks[n]>0&&r.contributions[n]<r.bet);kind=old?'raise':'bet';
  }else if(['call','check'].includes(action)){r.pending=r.pending.filter(n=>n!==i);kind=limits.due?'call':'check'}else throw new Error('Unknown action.');
  const paid=pay(r,i,r.bet-r.contributions[i]);r.actedAt[i]=r.bet;record(r,i,kind,action==='raise'?r.bet:paid,now);
 }
 r.turn=(i+1)%r.capacity;chooseTurn(r,now);
}
function openChoice(r,stage,now){r.stage=stage;r.pending=alive(r);r.turn=nextSeat(r,r.dealer);chooseTurn(r,now)}
function dealNext(r,now){const g=spec(r);r.street++;
 if(g.type==='community'){r.discards.push(r.deck.pop());const count=r.activeVariant==='neon'?1:r.street===1?3:1;for(let k=0;k<count;k++)r.board.push(r.deck.pop())}
 if(g.type==='stud')for(const i of alive(r))r.players[i].push(r.deck.pop());startStreet(r,now);
}
function automaticRows(cards){let left=cards.map((_,i)=>i);const bestFive=()=>{let best=null,chosen=[];for(const pick of combinations(left,5)){const score=highFive(pick.map(i=>cards[i]));if(!best||cmp(score,best)>0){best=score;chosen=pick}}left=left.filter(i=>!chosen.includes(i));return chosen};const back=bestFive(),middle=bestFive();return {front:left,middle,back}}
function discardChoice(r,i){const cards=r.players[i],mode=r.activeVariant;if(r.stage==='discard'){let best=null,index=0;cards.forEach((c,k)=>{const s=evaluate(cards.filter((_,j)=>j!==k),r.board,'holdem').high;if(!best||cmp(s,best)>0){best=s;index=k}});return [index]}const low=mode==='triple';if(low&&new Set(cards.map(c=>c.v)).size===5&&evaluate(cards,[],mode).high[0]<0)return [cards.findIndex(c=>c.v===Math.max(...cards.map(x=>x.v)))];const counts=new Map();cards.forEach(c=>counts.set(c.v,(counts.get(c.v)||0)+1));if(!low&&evaluate(cards,[],mode).high[0]>=4)return [];const seen=new Set();return cards.flatMap((c,k)=>{let keep=low?c.v<=8&&!seen.has(c.v):mode==='deuce'&&c.v===2||counts.get(c.v)>1;seen.add(c.v);return keep?[]:[k]})}
function botDecision(r,i){const cards=r.players[i],g=spec(r),limits=legal(r,i);let quality;
 if(g.type==='community'&&r.board.length<3&&r.activeVariant!=='neon'){const ranks=cards.map(c=>c.v),pair=new Set(ranks).size<ranks.length;quality=pair?.57+Math.max(...ranks)/50:.18+Math.max(...ranks)/40+(cards[0].s===cards[1].s?.08:0)}
 else if(cards.length+r.board.length<5){const pair=new Set(cards.map(c=>c.v)).size<cards.length;quality=pair?.55:.22+Math.max(...cards.map(c=>c.v))/65}else{const e=evaluate(cards,r.board,r.activeVariant,r.twist),cat=e.high[0];quality=['razz','triple'].includes(r.activeVariant)?cat===0?Math.max(.25,1-(-e.high[1]-5)/12):.12:cat<0?.25:Math.min(.95,.22+cat*.13);if(g.type==='stud'&&cards.length<5)quality=.25+(new Set(cards.map(c=>c.v)).size<cards.length?.25:0)}
 const opponents=alive(r).length-1,equity=Math.max(.03,quality/(1+(opponents-1)*.38)),odds=limits.due/(r.pot+limits.due||1),roll=randomInt(100)/100,bluff=r.mode==='casual'?.04:r.mode==='sharp'?.10:.18;
 if(limits.due>0&&equity+bluff<odds&&roll>.15)return ['fold',0];
 if(limits.due>r.bigBlind*5&&quality<.35&&roll>.2)return ['fold',0];
 if(limits.max>0&&(equity>.56||roll<bluff)&&randomInt(100)<65){const amount=Math.min(limits.max,Math.max(limits.min,Math.floor((r.pot+limits.due)*(.4+quality*.4)/r.unit)*r.unit));return ['raise',amount]}
 return ['call',0];
}
export function advance(r,now=Date.now()){
 if(r.decisionSeconds!==15){if(r.phase==='playing'&&!r.seats[r.turn]?.bot)r.turnUntil=Math.min(r.turnUntil,now+15000);r.decisionSeconds=15}

 if(r.phase==='showdown'&&r.nextHandAt&&now>=r.nextHandAt&&r.seats.filter((s,i)=>s&&r.stacks[i]>=r.unit).length>=2){if(r.kind==='solo'&&r.stacks[0]<r.unit){r.nextHandAt=0;return}startHand(r,now);return}
 for(let safety=0;safety<16&&r.phase==='playing';safety++){
  if(alive(r).length<=1&&r.stage!=='arrange'){settle(r,now);return}
  if(r.stage==='bet'&&r.pending.length===1&&r.contributions[r.pending[0]]>=r.bet&&alive(r).filter(i=>r.stacks[i]>0).length<2)r.pending=[];
  if(!r.pending.length){const g=spec(r);
   if(r.stage==='arrange'){settle(r,now);return}
   if(r.stage==='draw'){r.street++;startStreet(r,now);continue}
   if(r.stage==='discard'){dealNext(r,now);continue}
   const end=g.type==='stud'?4:g.type==='draw'?g.draws:r.activeVariant==='neon'?2:3;
   if(r.street>=end){settle(r,now);return}
   if(g.type==='draw'){openChoice(r,'draw',now);continue}
   if(g.discardAt===r.street){openChoice(r,'discard',now);continue}
   dealNext(r,now);continue;
  }
  const i=r.turn;if(now<r.turnUntil)return;
  if(r.stage==='arrange')apply(r,i,'arrange',automaticRows(r.players[i]),now);
  else if(['draw','discard'].includes(r.stage))apply(r,i,r.stage,r.seats[i].bot?discardChoice(r,i):r.stage==='discard'?[r.players[i].length-1]:[],now);
  else if(!r.seats[i]?.bot){log(r,r.seats[i].name+' ran out of time.');apply(r,i,'fold',0,now)}
  else{const [action,amount]=botDecision(r,i);apply(r,i,action,amount,now)}
 }
}
// Only decision-relevant state; heartbeat/profile updates must not invalidate a click.
export function actionStamp(r,seat){return JSON.stringify([r.hand,r.phase,r.street,r.stage,r.turn,r.turnUntil,r.bet,r.contributions?.[seat],r.stacks?.[seat],r.lastRaise,r.raises,r.actedAt?.[seat],r.pending,r.folded])}
export function acceptsAction(r,seat,input,version){return typeof input.actionStamp==='string'?input.actionStamp===actionStamp(r,seat):input.version===version}
export function actionRoom(r,seat,action,amount,requestId,now=Date.now()){
 if(r.lastActions[seat]===requestId)return;if(r.phase!=='playing'||r.turn!==seat||r.folded[seat])throw new Error('It is not your turn.');apply(r,seat,action,amount,now);r.lastActions[seat]=requestId;advance(r,now);
 if(r.variant==='fast'&&r.kind==='solo'&&seat===0&&action==='fold'){
  // Finish the old pot with bots; do not refund a folded contribution or recycle its cards.
  for(let k=0;k<80&&r.phase==='playing';k++)advance(r,Math.max(now,r.turnUntil));
  if(r.phase==='showdown'&&r.stacks[0]>=r.unit){r.nextHandAt=now;advance(r,now)}
 }
}
export function leaveRoom(r,seat,now=Date.now()){const player=r.seats[seat];if(r.phase==='playing'&&!r.folded[seat]){r.folded[seat]=true;r.pending=r.pending.filter(i=>i!==seat);record(r,seat,'fold',0,now);if(r.turn===seat){r.turn=(seat+1)%r.capacity;chooseTurn(r,now)}advance(r,now)}const others=Math.max(0,...(r.committed||[]).filter((_,i)=>i!==seat)),excess=Math.max(0,(r.committed?.[seat]||0)-others);if(r.phase==='playing'&&excess){r.committed[seat]-=excess;r.pot-=excess;r.stacks[seat]+=excess;r.contributions[seat]=Math.max(0,r.contributions[seat]-excess)}const payout=r.stacks[seat];record(r,seat,'leave',0,now);r.seats[seat]=null;r.stacks[seat]=0;if(r.host===seat)r.host=r.seats.findIndex(s=>s&&!s.bot);if(r.host<0){r.listed=false;r.phase='ended'}return {payout:r.funds==='tournament'?0:payout,stats:player.stats}}
export function viewRoom(r,seat,version,code){const revealed=['showdown','ended'].includes(r.phase)&&r.reveal,g=spec(r);return {code,version,seat,actionStamp:actionStamp(r,seat),kind:r.kind,name:r.name,capacity:r.capacity,variant:r.variant,activeVariant:r.activeVariant,modeName:g.name,stage:r.stage,nextHandAt:r.nextHandAt||0,legal:r.phase==='playing'?legal(r,seat):null,multiplier:r.multiplier,jackpotScore:r.jackpotScore,points:r.points,rows:revealed?r.rows:null,about:g.about,betting:bettingType(r),funds:r.funds,moneyVersion:r.moneyVersion,smallBlind:r.smallBlind,bigBlind:r.bigBlind,dealer:r.dealer,smallSeat:r.smallSeat,bigSeat:r.bigSeat,stake:r.stake,unit:r.unit,ante:r.ante,bringIn:r.bringIn||0,bringSeat:r.bringSeat,rules:r.rules,phase:r.phase,host:r.host,mode:r.mode,hand:r.hand,players:r.seats.map((s,i)=>s?{id:s.hash,name:s.name,bot:s.bot,stack:r.stacks[i],buyIn:r.buyIns[i],folded:r.folded?.[i]||false,aggression:aggression(s.stats),cards:r.players?r.players[i].map((c,k)=>i===seat||(revealed&&!r.folded[i])||g.type==='stud'&&k>=2&&k<6?c:null):[]}:null),board:r.board||[],street:r.street||0,twist:r.twist||0,pot:r.pot,handStartStacks:r.handStartStacks||r.stacks,lastPot:r.lastPot,lastPayouts:r.lastPayouts,lastEndStacks:r.lastEndStacks,totalPayouts:r.totalPayouts,bet:r.bet||0,contributions:r.contributions||r.seats.map(()=>0),raises:r.raises||0,turn:r.phase==='playing'?r.turn:null,turnUntil:r.turnUntil,serverTime:Date.now(),winReasons:['showdown','ended'].includes(r.phase)?r.winReasons||[]:[],winners:r.winners||[],result:r.result||'',history:r.history,events:r.events||[]}}
