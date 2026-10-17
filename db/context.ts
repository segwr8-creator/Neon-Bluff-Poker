import { drizzle as drizzleD1, type DrizzleD1Database } from 'drizzle-orm/d1';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql/web';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client/web';
import { adaptLibsql } from './libsql-adapter.mjs';
import { apiBase } from '../public/api-config.mjs';
import * as schema from './schema';

export interface EnvBindings {
 DB?: D1Database;
 NEXT_PUBLIC_API_URL?: string;
 DATABASE_URL?: string;
 DATABASE_AUTH_TOKEN?: string;
 TURSO_DATABASE_URL?: string;
 TURSO_AUTH_TOKEN?: string;
 NODE_ENV?: string;
}
type ServerContext = {kind:'d1';binding:D1Database;db:DrizzleD1Database<typeof schema>} | {kind:'libsql';binding:D1Database;db:LibSQLDatabase<typeof schema>};
type ClientContext = {kind:'client';db:null;binding:null;apiUrl:string|null};
let cached: {url:string;token:string|undefined;binding:D1Database;db:LibSQLDatabase<typeof schema>}|undefined;
export function getDatabaseContext(env?:EnvBindings):ServerContext|ClientContext {
 // WebViews must use authenticated HTTP APIs, even if handed a DB-shaped object.
 if(typeof window!=='undefined')return {kind:'client' as const,db:null,binding:null,apiUrl:apiBase(env?.NEXT_PUBLIC_API_URL)};
 const settings:EnvBindings=env??(typeof process!=='undefined'?process.env as EnvBindings:{});
 if(settings.DB){
  if(typeof settings.DB.prepare!=='function'||typeof settings.DB.batch!=='function')throw new Error('Database binding is invalid.');
  return {kind:'d1' as const,binding:settings.DB,db:drizzleD1(settings.DB,{schema})};
 }
 const url=settings.DATABASE_URL||settings.TURSO_DATABASE_URL;
 const token=settings.DATABASE_URL?settings.DATABASE_AUTH_TOKEN:settings.TURSO_AUTH_TOKEN;
 if(!url)throw new Error('Database is not configured. Set a D1 binding or server-only DATABASE_URL and DATABASE_AUTH_TOKEN.');
 let parsed:URL;try{parsed=new URL(url)}catch{throw new Error('Database URL is invalid.')}
 const local=settings.NODE_ENV==='development'&&parsed.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(parsed.hostname);
 if(!['https:','libsql:'].includes(parsed.protocol)&&!local)throw new Error('Database URL must use HTTPS/libSQL; explicit HTTP loopback is development-only.');
 if(parsed.username||parsed.password||parsed.search||parsed.hash)throw new Error('Database URL must not contain credentials, query parameters or a fragment.');
 if(!local&&!token)throw new Error('Database authentication token is missing.');
 if(!cached||cached.url!==url||cached.token!==token){
  const client=createClient({url,authToken:token});
  cached={url,token,binding:adaptLibsql(client) as unknown as D1Database,db:drizzleLibsql(client,{schema})};
 }
 return {kind:'libsql' as const,binding:cached.binding,db:cached.db};
}
