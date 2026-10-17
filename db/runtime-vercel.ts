import { getDatabaseContext } from './context';
export function databaseBinding() {
 const context=getDatabaseContext();
 if(!context.binding)throw new Error('Database access is server-only. Use the game API.');
 return context.binding;
}
export const runtimeConfig = () => typeof process!=='undefined'?process.env as Record<string,string>:{};
