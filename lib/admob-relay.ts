// Optional trusted-server relay. Never embed this secret in an APK/browser.
export class RewardRequestError extends Error {
 constructor(message:string,public status:number){super(message)}
}
export async function verifyRelay(req:Request,secret:string|undefined,reward:number,now=Date.now()) {
 if(!secret||secret.length<32||secret==='fallback_secure_dev_secret_key')throw new RewardRequestError('Reward relay is not configured.',503);
 if(!/^application\/json(?:;|$)/i.test(req.headers.get('Content-Type')||''))throw new RewardRequestError('Use application/json.',415);
 const reader=req.body?.getReader();if(!reader)throw new RewardRequestError('Missing request body.',400);
 const chunks:Uint8Array[]=[];let length=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>16384){await reader.cancel();throw new RewardRequestError('Request too large.',413)}chunks.push(value)}}finally{reader.releaseLock()}
 const data=new Uint8Array(length);let offset=0;for(const part of chunks){data.set(part,offset);offset+=part.length}
 let body:any;try{body=JSON.parse(new TextDecoder().decode(data))}catch{throw new RewardRequestError('Invalid JSON.',400)}
 if(!body||typeof body!=='object'||Array.isArray(body)||typeof body.userId!=='string'||!/^[a-f0-9]{64}$/.test(body.userId)||body.rewardAmount!==reward||!Number.isSafeInteger(body.timestamp)||typeof body.signature!=='string'||!/^[a-f0-9]{64}$/i.test(body.signature)||typeof body.callbackQuery!=='string'||body.callbackQuery.length>8192||!body.callbackQuery||/[#\r\n]/.test(body.callbackQuery))throw new RewardRequestError('Invalid reward request.',400);
 if(Math.abs(now-body.timestamp)>30000)throw new RewardRequestError('Request expired. Anti-replay safety triggered.',403);
 // Bind the original Google-signed query too, so it cannot be substituted.
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.callbackQuery));
 const queryHash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 const message=`${body.userId}:${body.rewardAmount}:${body.timestamp}:${queryHash}`;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const signature=Uint8Array.from(body.signature.match(/../g)!, (s:string)=>parseInt(s,16));
 if(!await crypto.subtle.verify('HMAC',key,signature,new TextEncoder().encode(message)))throw new RewardRequestError('Invalid security signature.',401);
 return {userId:body.userId as string,callbackQuery:body.callbackQuery as string};
}
