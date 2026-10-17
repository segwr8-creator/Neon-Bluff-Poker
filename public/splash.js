(() => {
  const splash = document.getElementById('cinemaSplash');
  if (!splash) return;
  const main = document.querySelector('main');
  const field = splash.querySelector('.splash-felt');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Colors describe physical chips; the splash does not represent a player balance.
  const piles = [
    {x:430,y:196,count:7,color:'#9b2532',edge:'#54111b'},
    {x:507,y:245,count:6,color:'#272c32',edge:'#111419'},
    {x:572,y:172,count:5,color:'#b59143',edge:'#68511f'}
  ];
  for (const [group, pile] of piles.entries()) {
    const shadow = document.createElement('span');
    shadow.className = 'splash-base-shadow';
    shadow.style.cssText = `--x:${pile.x-12}px;--y:${pile.y+5}px`;
    field.append(shadow);
    for (let n=0;n<pile.count;n++) {
      const chip = document.createElement('span');
      chip.className = 'splash-chip';
      chip.style.cssText = `--x:${pile.x+(n%3-1)*2}px;--y:${pile.y+(n%2)*2}px;--height:${5+n*8}px;--spin:${group*37+n*19}deg;--launch-x:${-38+group*23+n*2}px;--launch-y:${-55+n*4}px;--tilt:${42+group*13+n*3}deg;--delay:${.1+group*.24+n*.23}s;--chip:${pile.color};--edge:${pile.edge}`;
      for (const face of ['top','bottom']) {
        const disc=document.createElement('span');disc.className='chip-disc chip-'+face;
        const label=document.createElement('b');label.textContent='SD';disc.append(label);chip.append(disc);
      }
      for(let side=0;side<32;side++){
        const rim=document.createElement('span'),angle=side*Math.PI/16;
        rim.className='chip-rim';
        rim.style.cssText=`transform:translate3d(${Math.cos(angle)*28.3}px,${Math.sin(angle)*28.3}px,0) rotateZ(${side*11.25}deg) rotateY(90deg);background:${side%8<2?'#dfd2b0':pile.color};--shade:${.12+.38*(1-Math.cos(angle-1))/2}`;
        chip.append(rim);
      }
      field.append(chip);
    }
  }
  main.inert = true;
  let closed=false,started=false,timer,remaining=reduced?1600:6400,tick=0;
  const dismiss=()=>{
    if(closed)return;closed=true;clearTimeout(timer);
    const restoreFocus=splash.contains(document.activeElement);
    main.inert=false;splash.inert=true;splash.classList.add('departing');
    if(restoreFocus)document.getElementById('openPlay')?.focus({preventScroll:true});
    setTimeout(()=>{splash.remove();document.dispatchEvent(new Event('neon-splash-finished'))},reduced?0:680);
    document.removeEventListener('keydown',escapeSplash);
    document.removeEventListener('visibilitychange',visibility);
  };
  const escapeSplash=event=>{if(event.key==='Escape'){event.preventDefault();dismiss()}};
  const visibility=()=>{
    if(closed)return;
    if(document.hidden){if(started){remaining=Math.max(0,remaining-(performance.now()-tick));clearTimeout(timer);tick=0}splash.classList.add('paused');return}
    started=true;splash.classList.add('playing');splash.classList.remove('paused');
    tick=performance.now();clearTimeout(timer);timer=setTimeout(dismiss,remaining);
  };
  document.addEventListener('keydown',escapeSplash);
  document.addEventListener('visibilitychange',visibility);
  // Start after a visible paint; pause both animation and countdown in hidden tabs.
  requestAnimationFrame(()=>requestAnimationFrame(visibility));
})();
