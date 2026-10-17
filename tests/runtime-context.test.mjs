import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
import {apiBase} from '../public/api-config.mjs';
fs.mkdirSync('work',{recursive:true});const dir=fs.mkdtempSync(resolve('work')+'/context-');
function compile(path,name,replace=s=>s){fs.writeFileSync(dir+'/'+name,ts.transpileModule(replace(fs.readFileSync(path,'utf8')),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);return pathToFileURL(dir+'/'+name).href}
compile('db/schema.ts','schema.mjs');
const {getDatabaseContext}=await import(compile('db/context.ts','context.mjs',s=>s.replace("'./schema'","'./schema.mjs'").replace("'./libsql-adapter.mjs'",JSON.stringify(pathToFileURL(resolve('db/libsql-adapter.mjs')).href)).replace("'../public/api-config.mjs'",JSON.stringify(pathToFileURL(resolve('public/api-config.mjs')).href))));
test('Runtime selection, server credentials and mobile API-only context',()=>{try{
 assert.throws(()=>getDatabaseContext({}),/not configured/);
 assert.throws(()=>getDatabaseContext({DATABASE_URL:'https://db.test'}),/token is missing/);
 assert.throws(()=>getDatabaseContext({DATABASE_URL:'http://127.0.0.1:8080',NODE_ENV:'production'}),/development-only/);
 assert.throws(()=>getDatabaseContext({DB:{}}),/binding is invalid/);
 const binding={prepare(){},batch(){}};assert.equal(getDatabaseContext({DB:binding}).kind,'d1');
 const remote=getDatabaseContext({DATABASE_URL:'https://database.test',DATABASE_AUTH_TOKEN:'test-only'});assert.equal(remote.kind,'libsql');assert.equal(typeof remote.db.select,'function');
 assert.equal(getDatabaseContext({DATABASE_URL:'http://127.0.0.1:8080',NODE_ENV:'development'}).kind,'libsql');
 globalThis.window={};globalThis.location={protocol:'capacitor:',origin:'capacitor://localhost'};
 const mobile=getDatabaseContext({DB:binding,NEXT_PUBLIC_API_URL:'https://game.test'});assert.equal(mobile.kind,'client');assert.equal(mobile.db,null);assert.equal(mobile.apiUrl,'https://game.test');
 assert.equal(getDatabaseContext({}).apiUrl,null);
 assert.equal(apiBase('',{protocol:'https:',origin:'https://game.test'}),'https://game.test');
 assert.throws(()=>apiBase('https://user:secret@game.test'),/without credentials/);
 assert.throws(()=>apiBase('https://game.test/api'),/without credentials or a path/);
 assert.throws(()=>apiBase('http://public.test'),/HTTPS/);
}finally{delete globalThis.window;delete globalThis.location;fs.rmSync(dir,{recursive:true,force:true})}});
