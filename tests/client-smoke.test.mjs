import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
class El{
 constructor(id=''){this.id=id;this.children=[];this.style={};this.dataset={};this.checked=false;this.value='';this.textContent='';this.open=false;this.disabled=false;this.classList={add(){},remove(){},toggle(){},contains(){return false}}}
 set innerHTML(s){this.html=s;this.children=Array.from({length:(s.match(/class="card /g)||[]).length},()=>new El())}get innerHTML(){return this.html||''}
 append(...x){this.children.push(...x)} prepend(x){x.parent=this;this.children.unshift(x)}get lastChild(){return this.children.at(-1)}remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)} replaceChildren(...x){this.children=x}insertAdjacentHTML(_,s){this.children.push(new El())}setAttribute(){}getBoundingClientRect(){return{left:0,top:0,width:100,height:100}}querySelector(){return new El()}querySelectorAll(){return this.children}closest(){return new El()}set outerHTML(s){}contains(){return false}showModal(){this.open=true}close(){this.open=false}getAnimations(){return[]}focus(){}select(){}
}
const els=new Map();const document={getElementById:id=>{if(!els.has(id))els.set(id,new El(id));return els.get(id)},querySelector:()=>new El(),querySelectorAll:()=>[],createElement:()=>new El(),body:new El(),hidden:false,addEventListener(){}};
document.getElementById('speed').value='1';document.getElementById('difficulty').value='casual';document.getElementById('musicVolume').value='35';
class FakeAudio{constructor(){this.src='';this.paused=true;this.currentTime=0;this.playCount=0}play(){this.paused=false;this.playCount++;return Promise.resolve()}pause(){this.paused=true}}
const saved=new Map([['neon-jazz','off']]);const c=vm.createContext({Audio:FakeAudio,document,console,crypto,URLSearchParams,AbortController,location:{protocol:'https:',origin:'https://example.test',search:''},window:{parent:{location:{search:''}}},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},matchMedia:()=>({matches:true}),requestAnimationFrame(){},setInterval(){return 1},clearInterval(){},setTimeout:fn=>setImmediate(fn),clearTimeout:clearImmediate,Math,Map,Set});
const html=fs.readFileSync('public/game.html','utf8');vm.runInContext(html.split('<script>')[1].split('</script>')[0],c);const read=s=>vm.runInContext(s,c);
assert.ok(document.getElementById('factText').textContent.includes('52'));
read('start()');for(let i=0;i<300&&!read('state?.acting');i++)await new Promise(r=>setImmediate(r));assert.equal(read('state.acting'),true);assert.equal(read('state.players[0].length'),3);assert.ok(read('Number.isInteger(state.raiseAmount)'));
read('generation++;online={code:"ABCDEFGHJK",token:"x",version:-1};');
c.fixture={code:'ABCDEFGHJK',version:1,seat:1,host:0,phase:'playing',mode:'casual',hand:1,players:[{name:'Host',bot:false,stack:58,folded:false,cards:null},{name:'Guest',bot:false,stack:58,folded:false,cards:[{v:14,s:'♠'},{v:13,s:'♠'},{v:12,s:'♠'}]},{name:'Dex',bot:true,stack:58,folded:false,cards:null}],board:[null,null],street:0,twist:0,pot:6,bet:0,contributions:[0,0,0],raises:0,turn:1,turnUntil:Date.now()+60000,winners:[],result:'',history:['Hand begins']};
read('drawNetwork(fixture)');assert.equal(read('NAMES[1]'),'Dex');assert.equal(read('NAMES[2]'),'Host');assert.equal(read('state.players[0][0].v'),14);assert.equal(read('state.acting'),true);assert.equal(read('online.version'),1);assert.ok(document.getElementById('handGuide').innerHTML.includes('High card'));
console.log('Passed: client startup, fact display, solo dealing, pot controls, and multiplayer rendering from a non-host seat.');
// Background playlist survives menu -> game and toggles without rewinding.
assert.equal(read('FACTS.length'),60);assert.equal(JSON.parse(saved.get('neon-facts-v2')).length,60);
assert.equal(document.getElementById('chipsBefore').textContent,'60 ◆');assert.equal(document.getElementById('chipsNow').textContent,'58 ◆');assert.equal(document.getElementById('chipsPot').textContent,'6 ◆');
read('setJazz(true)');await new Promise(r=>setImmediate(r));assert.equal(read('jazzAudio.paused'),false);assert.equal(read('jazzAudio.src'),'/audio/backed-vibes.mp3');
read('jazzAudio.currentTime=72;beginMusic()');assert.equal(read('jazzAudio.currentTime'),72);assert.equal(read('jazzAudio.playCount'),1);
read('setJazz(false)');assert.equal(read('jazzAudio.paused'),true);read('setJazz(true)');await new Promise(r=>setImmediate(r));assert.equal(read('jazzAudio.currentTime'),72);
read('jazzAudio.onended()');await new Promise(r=>setImmediate(r));assert.equal(read('jazzAudio.src'),'/audio/intractable.mp3');assert.equal(read('jazzAudio.paused'),false);
c.fixture={...c.fixture,version:2,phase:'showdown',pot:0,lastPot:24,handStartStacks:[60,60,60],lastEndStacks:[52,76,52],lastPayouts:[0,24,0],totalPayouts:[0,24,0],players:c.fixture.players.map((p,i)=>({...p,stack:[52,76,52][i]})),street:0,winners:[1]};
// Ended by folds: only the winning private cards are visible.
c.fixture.players[0].folded=true;c.fixture.players[2].folded=true;
read('drawNetwork(fixture)');assert.equal(document.getElementById('chipsPayout').textContent,'24 ◆');assert.equal(document.getElementById('chipsAfter').textContent,'76 ◆');assert.equal(document.getElementById('chipsNet').textContent,'+16 ◆');assert.equal(document.getElementById('chipsPot').textContent,'24 ◆');assert.equal(document.getElementById('potLabel').textContent,'Pot awarded');
read('setJazz(false)');assert.ok(!html.includes('youtube.com/iframe_api'));assert.ok(!html.includes('id="sound"'));assert.ok(!html.includes('id="musicVolume"'));
console.log('Passed: 60 cached facts, continuous background playlist, music on/off, and non-host payout/balance snapshots.');
