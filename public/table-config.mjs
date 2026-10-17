// Cash amounts are integer cents. Tournament amounts are separate Tournament chips (T).
export const STAKES={
 micro:{label:'Micro · SD 0.05 / SD 0.10',funds:'cash',unit:5,smallBlind:5,bigBlind:10,min:500,max:5000,suggested:1000,bankRequired:0},
 cash500:{label:'Low · SD 0.25 / SD 0.50',funds:'cash',unit:25,smallBlind:25,bigBlind:50,min:2000,max:50000,suggested:5000,bankRequired:0},
 cash1000:{label:'Low Mid · SD 0.50 / 1',funds:'cash',unit:50,smallBlind:50,bigBlind:100,min:5000,max:100000,suggested:10000,bankRequired:0},
 casino:{label:'Medium · SD 1 / SD 2',funds:'cash',unit:100,smallBlind:100,bigBlind:200,min:10000,max:200000,suggested:20000,bankRequired:0},
 mid:{label:'Mid High · SD 2 / SD 5',funds:'cash',unit:100,smallBlind:200,bigBlind:500,min:20000,max:500000,suggested:50000,bankRequired:0},
 high:{label:'High · SD 5 / SD 10',funds:'cash',unit:500,smallBlind:500,bigBlind:1000,min:50000,max:1000000,suggested:100000,bankRequired:0},
 tournament:{label:'Tournament · T10,000',funds:'tournament',unit:25,smallBlind:25,bigBlind:50,min:10000,max:10000,suggested:10000,bankRequired:0}
};
export const STACK_EXAMPLES={micro:'20 White + 12 Red + 6 Blue = SD 10',cash1000:'10 half-unit markers + 20 White + 10 Red + 1 Green = SD 100',cash500:'20 White + 20 Red + 5 Blue = SD 50',casino:'20 White + 26 Red + 2 Green = SD 200',mid:'20 White + 36 Red + 12 Green = SD 500',high:'20 Red + 16 Green + 5 Black = SD 1,000'};
export const TOURNAMENT_CHIPS=[{value:25,count:8,name:'White',color:'#e0e3e7'},{value:100,count:8,name:'Red',color:'#b82f42'},{value:500,count:4,name:'Green',color:'#20865b'},{value:1000,count:7,name:'Black',color:'#202833'}];
const colors={White:'#e0e3e7',Red:'#b82f42',Blue:'#316aa9',Green:'#20865b',Black:'#202833',Purple:'#754db4',Yellow:'#ead159',Pink:'#d67f9a','Light blue':'#88d4ef',Orange:'#e88a32'};
export const HIGH_DENOMINATIONS=[['Purple',50000],['Yellow',100000],['Brown / Pink',500000],['Light blue',2500000],['Orange',10000000]].map(([name,value])=>({name,value,color:colors[name]||'#d67f9a'}));
export function chipColors(stake){if(stake==='tournament')return TOURNAMENT_CHIPS;const list=stake==='micro'?[['White',5],['Red',25],['Blue',100]]:stake==='cash500'?[['White',25],['Red',100],['Blue',500]]:stake==='high'?[['Red',500],['Green',2500],['Black',10000]]:[['White',100],['Red',500],['Green',2500]];const values=list.map(([name,value])=>({name,value,color:colors[name]||'#d67f9a'}));if(stake==='cash1000')values.unshift({name:'50¢ blind marker',value:50,color:'#96a3b1'});return values}
export const CHIP_COLORS=chipColors('cash500');
export function formatAmount(amount,funds='cash'){if(amount==null||!Number.isFinite(amount))return '—';return funds==='tournament'?'T'+amount.toLocaleString('en-US'):'SD '+(amount/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
export function entryCost(stake,amount){return STAKES[stake]?.funds==='tournament'?0:amount}
export function aggression(stats){const actions=stats?.actions||0;if(actions<10)return {rank:'NA',rate:null,actions};const rate=Math.round((stats.raises||0)/actions*100);return {rank:rate<15?'I · Patient':rate<35?'II · Balanced':rate<55?'III · Aggressive':'IV · Very aggressive',rate,actions}}
