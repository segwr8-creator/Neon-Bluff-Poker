// Cloudflare-only entry. Native/client bundles use public/api-config.mjs instead.
// Next.js replaces this module with runtime-vercel.ts at build time.
import { env } from 'cloudflare:workers';
import { getDatabaseContext, type EnvBindings } from './context';
export function databaseBinding() {
 const context=getDatabaseContext(env as unknown as EnvBindings);
 if(!context.binding)throw new Error('Database access is server-only. Use the game API.');
 return context.binding;
}
export const runtimeConfig = () => env as unknown as Record<string,string>;
