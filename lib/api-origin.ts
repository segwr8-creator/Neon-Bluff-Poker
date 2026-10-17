import { runtimeConfig } from '@/db/runtime';
export function allowedApiOrigin(req:Request){
 const origin=req.headers.get('Origin');
 if(!origin||origin===new URL(req.url).origin)return true;
 // Never allow opaque file:// origins or a wildcard.
 if(origin==='null')return false;
 return (runtimeConfig().MOBILE_ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(s=>s&&s!=='*'&&s!=='null').includes(origin);
}
export function withApiAccess(handler:(req:Request)=>Promise<Response>){return async(req:Request)=>{
 if(!allowedApiOrigin(req))return Response.json({error:'This app origin is not allowed.'},{status:403});
 const response=req.method==='OPTIONS'?new Response(null,{status:204}):await handler(req);
 const origin=req.headers.get('Origin');
 if(origin&&origin!==new URL(req.url).origin){
  response.headers.set('Access-Control-Allow-Origin',origin);
  response.headers.append('Vary','Origin');
  response.headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers','Authorization, Content-Type');
  response.headers.set('Access-Control-Max-Age','600');
 }
 return response;
}}
export const apiOptions=withApiAccess(async()=>new Response(null,{status:204}));
