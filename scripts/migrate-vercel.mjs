import { createClient } from '@libsql/client/web';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
const url=process.env.TURSO_DATABASE_URL,authToken=process.env.TURSO_AUTH_TOKEN;
if(!url||!authToken)throw new Error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the server environment.');
const client=createClient({url,authToken});
try{await migrate(drizzle(client),{migrationsFolder:'./drizzle'});console.log('Database migrations applied.')}finally{client.close()}
