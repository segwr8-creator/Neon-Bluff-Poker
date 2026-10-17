export const MODES={
 neon:{name:'Neon Bluff',type:'community',hole:3,board:2,max:11,betting:'no-limit',about:'Original three-card Neon game with two community reveals and optional twists.'},
 holdem:{name:'Texas Hold’em',type:'community',hole:2,board:5,max:11,betting:'no-limit',about:'Two private cards; flop, turn and river. Best five of seven wins. No-limit betting and side pots.'},
 deuce:{name:'Double-Deuce Draw',type:'draw',hole:5,board:0,max:6,draws:1,betting:'fixed-limit',about:'Five private cards and one draw. All twos are wild. Five of a kind beats a straight flush. Table poker, not Pogo’s video-poker paytable.'},
 omaha:{name:'Omaha',type:'community',hole:4,board:5,max:11,betting:'pot-limit',about:'Exactly two private cards plus three community cards. Pot-limit betting.'},
 stud:{name:'Seven-Card Stud',type:'stud',hole:7,board:0,max:7,betting:'fixed-limit',about:'Two down, four up, one down. Ante and bring-in, five betting rounds. Best five of seven wins. Seven seats maximum.'},
 razz:{name:'Razz',type:'stud',hole:7,board:0,max:7,betting:'fixed-limit',about:'Stud for the lowest hand. Aces low; straights and flushes ignored. A-2-3-4-5 is best.'},
 draw:{name:'Five-Card Draw',type:'draw',hole:5,board:0,max:6,draws:1,betting:'fixed-limit',about:'Five private cards, one discard-and-replace round, then final betting.'},
 fast:{name:'Fast-Fold Hold’em',type:'community',hole:2,board:5,max:3,betting:'no-limit',soloOnly:true,about:'Solo fast-fold against computers: folding settles the old hand and deals again immediately. Live pool matchmaking is not available.'},
 jackpot:{name:'Jackpot Sit & Go',type:'community',hole:2,board:5,max:3,betting:'no-limit',tournamentOnly:true,about:'Exactly three players. T10,000 each, rising blinds; a 2×–1,000× score multiplier is revealed once. Score-only prize, no cash redemption.'},
 horse:{name:'HORSE',type:'mixed',hole:2,board:5,max:7,betting:'fixed-limit',about:'Every five hands: Hold’em → Omaha Hi-Lo → Razz → Stud → Stud Eight or Better. Fixed-limit; eight-or-better lows split qualifying pots.'},
 triple:{name:'2–7 Triple Draw',type:'draw',hole:5,board:0,max:6,draws:3,betting:'fixed-limit',about:'Three draws and four betting rounds. Aces high; straights and flushes count against you. 7-5-4-3-2, not all one suit, is best.'},
 chinese:{name:'Chinese Poker',type:'set',hole:13,board:0,max:4,betting:'none',about:'Arrange 3 front / 5 middle / 5 back. Back ≥ middle ≥ front. One point per row, three-point scoop bonus; no betting or royalties. Invalid layouts foul.'},
 pineapple:{name:'Pineapple',type:'community',hole:3,board:5,max:11,betting:'no-limit',discardAt:1,about:'Your requested house rule: three private cards, discard one after flop betting, then play the turn and river.'},
 crazy:{name:'Crazy Pineapple',type:'community',hole:3,board:5,max:11,betting:'no-limit',discardAt:2,about:'Your requested house rule: keep three private cards through turn betting, then discard one before the river.'},
 omaha8:{name:'Omaha Hi-Lo',type:'community',hole:4,board:5,max:7,betting:'fixed-limit',hidden:true,about:'Exactly two private and three community cards for each high/low hand. Low needs five distinct ranks, eight or lower.'},
 stud8:{name:'Stud Eight or Better',type:'stud',hole:7,board:0,max:7,betting:'fixed-limit',hidden:true,about:'Seven-card stud, high/low split. Low requires five distinct ranks, eight or lower.'}
};
export const HORSE=['holdem','omaha8','razz','stud','stud8'];
