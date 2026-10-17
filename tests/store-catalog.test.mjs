import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {neonBluffStore,STORE_PACKS} from '../public/store-catalog.mjs';
const expected=[['chips_500',500],['chips_2000',2500],['chips_5000',6000],['chips_10000',15000],['chips_20000',35000],['chips_30000',60000],['high_roller_pack',120000]];
test('server credits exact bonus-inclusive totals in SD cents',()=>{
 assert.deepEqual(STORE_PACKS.map(p=>[p.id,p.amount]),expected.map(([id,n])=>[id,n*100]));
 assert.equal(new Set(STORE_PACKS.map(p=>p.id)).size,7);
});
test('selection updates compiler ID, price and reward without enabling disconnected checkout',()=>{
 const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 const code=html.slice(html.indexOf('function handleStoreSelectionChange()'),html.indexOf("$('chipDropdown').addEventListener('change', handleStoreSelectionChange)"));
 const elements={};const $=id=>elements[id]??={value:'500',disabled:false,textContent:'',attributes:{},setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]}};
 const c={document:{getElementById:$},$,neonBluffStore,storeProducts:[],refillBusy:false,refillState:{billingAvailable:false},refillBridge:()=>null};vm.createContext(c);vm.runInContext(code,c);
 for(const [id,total] of expected){$('chipDropdown').value=String(total);c.handleStoreSelectionChange();assert.equal($('buyRefillBtn').attributes['data-iap-buy'],id);assert.equal($('buyRefillBtn').disabled,true);assert.equal($('plannedPrice').textContent,`Planned ${neonBluffStore[total].price} USD - checkout ready`)}
 $('chipDropdown').value='invalid';c.handleStoreSelectionChange();assert.equal($('buyRefillBtn').attributes['data-iap-buy'],undefined);assert.equal($('buyRefillBtn').disabled,true);
});
test('game alias and index have identical shop logic',()=>{
 assert.equal(fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),fs.readFileSync(new URL('../public/game.html',import.meta.url),'utf8'));
});
