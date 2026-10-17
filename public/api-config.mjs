// Public service location only. Never put database URLs or tokens here.
export function apiBase(configured, page = globalThis.location) {
  if (configured) {
    let url;try{url=new URL(configured)}catch{throw new Error('The configured game API URL is invalid.')}
    const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
    if(url.protocol!=='https:'&&!(url.protocol==='http:'&&local))throw new Error('The game API must use HTTPS.');
    if(url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('Set the game API URL to its origin only, without credentials or a path.');
    return url.origin;
  }
  if(page&&['https:','http:'].includes(page.protocol))return page.origin;
  return null;
}
