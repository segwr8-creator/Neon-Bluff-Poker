(() => {
  const key='neon-welcome-v1', byId=id=>document.getElementById(id);
  const pages=[
    {title:'Welcome to the late-night table.',intro:'NEON BLUFF is a poker lounge for playing against computers or sharing a table with friends. Here is what everything means.',items:[
      ['Your goal','Win the pot by making the winning hand for your chosen variant, or by being the last player who has not folded.'],
      ['New to the lounge?','Choose Texas Hold’em, Standard table, Low stakes and Casual Lounge to begin against computers. You can change these in the Play menu.'],
      ['The original Neon Bluff','Three private cards and two shared cards, with optional house-rule twists. It plays differently from Texas Hold’em.'],
      ['18+ · Stack Dollars only','Stack Dollars are game units, never redeemable money. There are no cash prizes or withdrawals.']
    ]},
    {title:'Your bank and your table stack.',intro:'Your bank is separate from the amount you bring to a table. SD means Stack Dollars.',items:[
      ['Stack Dollars available','Your saved bank outside the table. New profiles start with SD 500.00.'],
      ['Proposed Buy-In / Starting stack','The amount you want to bring from your bank to a ring-game table. You must meet its minimum and cannot spend more than your available bank.'],
      ['Table Stack','The Stack Dollars you still have in front of you during a game. Bets move from this stack into the pot.'],
      ['Leaving a table','Your remaining ring-game stack returns to your bank. Leaving during a hand folds your hand; money already committed stays in play. Tournament chips (T) are separate and forfeited on leaving.']
    ]},
    {title:'Choose the game you want.',intro:'The Play menu controls the next game you create. Joining someone else’s table uses that table’s rules.',items:[
      ['Stake level / blinds','Blinds are required starting bets in blind-based games. Low stakes uses SD 0.25 / SD 0.50. Higher stakes require a larger buy-in. Stud games use antes and a bring-in instead.'],
      ['Card variant','Chooses the actual poker rules: Hold’em, Omaha, draw, stud and others. Read the description under the selections. Lowest-hand games such as Razz use different rankings.'],
      ['Game format / Computer style','Standard is ordinary table play. Fast-Fold is against computers. Jackpot Sit & Go uses tournament chips and a score multiplier. Casual, Sharp and Chaos change computer behavior.'],
      ['House rules / chip colors','House rules change original Neon Bluff rankings. Chip colors & stake limits explains denominations for each tier; a color’s value can change with the stakes.']
    ]},
    {title:'Read the table at a glance.',intro:'Your private cards are at the bottom. Other players’ seats show their names, stacks and latest actions.',items:[
      ['Community cards','Shared cards in the middle, used according to the selected variant. Hold’em uses any best five of seven; Omaha requires exactly two private cards and three shared cards. Draw and stud have no shared board.'],
      ['Live pot','The total currently committed by all players. The winner receives the applicable pot; ties and all-ins can produce splits or side pots.'],
      ['Payout and history','Last payout to you shows your most recent award. After last hand shows your stack at that hand’s end. Session change tracks your table result relative to your buy-in. Winner messages explain the result.'],
      ['Hand guide / Table facts','The hand guide describes your cards and estimates showdown chances against random holdings—not a guarantee or a prediction of opponents’ choices. Table facts are learning tips; Pause and Next control them.']
    ]},
    {title:'Make your move.',intro:'The action buttons show only the choices available for your current decision.',items:[
      ['Check / Fold','Check adds nothing and is available only when you owe no additional bet. Fold gives up your claim to the pot.'],
      ['Call','Pay only the amount still owed in this betting round. If the total to match is SD 2.50 and you already contributed SD 1.00, your call is SD 1.50 more. A short all-in may call for less.'],
      ['Bet / Raise to','The slider chooses your total contribution for this betting round. “Raise to SD 2.50” means a total of SD 2.50, not an extra SD 2.50. Check the amount shown before confirming.'],
      ['Decision timer','You have 15 seconds for a betting decision; a timeout folds your hand. Opening this guide does not pause a game. The next hand normally starts three seconds after the result.']
    ]},
    {title:'Computers, friends and your settings.',intro:'Start solo, or bring people together in the same live lobby.',items:[
      ['Play computers','Starts a game with computer opponents. Resume computer game returns to a saved session.'],
      ['Play Live / Find a table','Find a table searches waiting games matching your variant and stakes. Review the buy-in to join. If no match is waiting, create a listed table or paste a friend’s invite link or code.'],
      ['Invite and start','Copy the invite from your table lobby. At least two funded human players are needed; empty seats do not become bots. The host deals the first hand. Reconnect to live table restores a saved seat.'],
      ['Settings / Friends / Refills','Settings changes your own visuals, layout and audio. Use + beside a human player to request friendship. Purchases and rewarded ads are not live yet. Keep your browser data to retain access to your guest profile.']
    ]}
  ];
  const dialog=document.createElement('dialog');
  dialog.id='welcomeGuide';dialog.setAttribute('aria-labelledby','welcomeTitle');
  dialog.innerHTML='<div class="welcomeTop"><span>THE LOUNGE GUIDE</span><button id="welcomeClose" class="small" aria-label="Close introduction">×</button></div><p id="welcomeProgress"></p><h2 id="welcomeTitle" tabindex="-1"></h2><p id="welcomeIntro"></p><dl id="welcomeTerms"></dl><p class="welcomeNote">You can reopen this guide anytime with How to play. Games keep running while it is open.</p><div class="welcomeActions"><button id="welcomeBack">Back</button><button id="welcomeNext" class="primary">Next</button></div>';
  document.body.append(dialog);
  let page=0,shown=false,returnFocus=null;
  const remember=()=>{try{localStorage.setItem(key,'seen')}catch{}};
  const seen=()=>{try{return localStorage.getItem(key)==='seen'}catch{return false}};
  function paint(focus=true){
    const data=pages[page];byId('welcomeProgress').textContent=`${page+1} / ${pages.length}`;
    byId('welcomeTitle').textContent=data.title;byId('welcomeIntro').textContent=data.intro;
    byId('welcomeTerms').replaceChildren(...data.items.flatMap(([term,meaning])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=term;dd.textContent=meaning;return [dt,dd]}));
    byId('welcomeBack').disabled=page===0;byId('welcomeNext').textContent=page===pages.length-1?'Ready to play':'Next';
    dialog.scrollTop=0;if(focus)byId('welcomeTitle').focus({preventScroll:true});
  }
  function open(){if(dialog.open)return;returnFocus=document.activeElement;page=0;shown=true;paint(false);dialog.showModal();byId('welcomeTitle').focus({preventScroll:true})}
  function close(){remember();dialog.close()}
  byId('welcomeClose').onclick=close;
  byId('welcomeBack').onclick=()=>{if(page>0){page--;paint()}};
  byId('welcomeNext').onclick=()=>{if(page===pages.length-1)close();else{page++;paint()}};
  dialog.addEventListener('cancel',remember);
  dialog.addEventListener('close',()=>{if(returnFocus?.isConnected&&!returnFocus.closest('[inert]'))returnFocus.focus({preventScroll:true})});
  byId('howToPlay').onclick=open;
  function firstVisit(){if(!shown&&!seen()&&!document.hidden&&!byId('cinemaSplash')&&!byId('intro').classList.contains('hide')&&!document.querySelector('dialog[open]'))open()}
  document.addEventListener('neon-splash-finished',firstVisit);
  document.addEventListener('visibilitychange',firstVisit);
  byId('openPlay').addEventListener('click',()=>queueMicrotask(firstVisit));
  firstVisit();
  const hints={stakeLevel:'Stakes set the blinds and allowed buy-in range.',buyIn:'Your proposed table stack, taken from your available bank when you join.',difficulty:'Changes the behavior of computer opponents.',gameVariant:'Selects the poker rules and how winning hands are formed.',gameFormat:'Selects standard, computer fast-fold or tournament play.',houseRules:'Ranking changes for the original Neon Bluff variant.',chipsBefore:'Stack Dollars saved outside your current table.',chipsNow:'Your proposed buy-in on the menu, or remaining table stack during play.',chipsPot:'The total committed to this hand by all players.',chipsPayout:'The latest pot award paid to you.',chipsAfter:'Your stack at the end of the previous hand.',chipsNet:'Your table result compared with your starting buy-in.'};
  for(const [id,text] of Object.entries(hints)){const target=byId(id);if(target)target.title=text}
})();
