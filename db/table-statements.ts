import { drizzle } from 'drizzle-orm/d1';
import { and, eq, gte, isNull, sql } from 'drizzle-orm';
import { profiles } from './schema';
// Compile schema-backed updates into the same atomic batch as the room CAS.
function prepared(db: D1Database, query: {toSQL():{sql:string;params:unknown[]}}) {
  const q=query.toSQL();return db.prepare(q.sql).bind(...q.params);
}
export function debitSeat(db:D1Database,id:string,code:string,cost:number,required:number,name:string,now:number,mutation?:string) {
  const guard=mutation?sql`exists (select 1 from rooms where code=${code} and json_extract(payload,'$.mutation')=${mutation})`:undefined;
  return prepared(db,drizzle(db).update(profiles).set({cashBalance:sql`${profiles.cashBalance}-${cost}`,activeRoom:code,escrow:cost,name,updated:now}).where(and(eq(profiles.id,id),isNull(profiles.activeRoom),gte(profiles.cashBalance,required),guard)));
}
export function creditSeat(db:D1Database,id:string,code:string,payout:number,now:number,stats?:string,mutation?:string) {
  if(!Number.isSafeInteger(payout)||payout<0)throw new Error('Invalid table settlement.');
  const guard=mutation?sql`exists (select 1 from rooms where code=${code} and json_extract(payload,'$.mutation')=${mutation})`:undefined;
  return prepared(db,drizzle(db).update(profiles).set({cashBalance:sql`${profiles.cashBalance}+${payout}`,activeRoom:null,escrow:0,updated:now,...(stats===undefined?{}:{stats})}).where(and(eq(profiles.id,id),eq(profiles.activeRoom,code),guard)));
}
