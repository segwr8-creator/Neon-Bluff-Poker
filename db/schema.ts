import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const rooms = sqliteTable('rooms', {
 code: text('code').primaryKey(),
 version: integer('version').notNull().default(0),
 payload: text('payload').notNull(),
 expires: integer('expires').notNull(),
}, table => [index('rooms_expiry').on(table.expires)]);

export const profiles = sqliteTable('profiles', {
 id: text('id').primaryKey(),
 name: text('name').notNull(),
 wallet: integer('wallet').notNull().default(100000),
 cashBalance: integer('cash_balance').notNull().default(50000),
 giftLocked: integer('gift_locked').notNull().default(0),
 stats: text('stats').notNull().default('{"actions":0,"raises":0,"calls":0,"checks":0,"folds":0}'),
 activeRoom: text('active_room'),
 escrow: integer('escrow').notNull().default(0),
 created: integer('created').notNull(),
 updated: integer('updated').notNull(),
});

// One server-issued refill session per account; never accept a client chip amount.
export const refillIntents = sqliteTable('refill_intents', {
 id: text('id').primaryKey(),
 profileId: text('profile_id').notNull(),
 kind: text('kind').notNull(),
 product: text('product'),
 created: integer('created').notNull(),
 expires: integer('expires').notNull(),
}, table => [index('refill_intents_profile_created').on(table.profileId, table.created)]);
export const refillLedger = sqliteTable('refill_ledger', {
 id: text('id').primaryKey(),
 intentId: text('intent_id').notNull().unique(),
 profileId: text('profile_id').notNull(),
 provider: text('provider').notNull(),
 product: text('product').notNull(),
 amount: integer('amount').notNull(),
 mutation: text('mutation').notNull(),
 created: integer('created').notNull(),
}, table => [index('refill_ledger_profile_created').on(table.profileId, table.created)]);

export const friendships=sqliteTable('friendships',{
 pair:text('pair').primaryKey(),sender:text('sender').notNull(),recipient:text('recipient').notNull(),status:text('status').notNull(),created:integer('created').notNull(),
},t=>[index('friendships_sender').on(t.sender),index('friendships_recipient').on(t.recipient)]);
export const messages=sqliteTable('messages',{
 id:text('id').primaryKey(),pair:text('pair').notNull(),sender:text('sender').notNull(),body:text('body').notNull(),created:integer('created').notNull(),
},t=>[index('messages_pair_created').on(t.pair,t.created)]);
export const gifts=sqliteTable('gifts',{
 id:text('id').primaryKey(),sender:text('sender').notNull(),recipient:text('recipient').notNull(),amount:integer('amount').notNull(),status:text('status').notNull(),mutation:text('mutation'),created:integer('created').notNull(),
},t=>[index('gifts_recipient_created').on(t.recipient,t.created)]);

// Review evidence only: a shared table loss does not establish collusion.
export const fairPlaySignals=sqliteTable('fair_play_signals',{
 id:text('id').primaryKey(),room:text('room').notNull(),hand:integer('hand').notNull(),
 loser:text('loser').notNull(),winner:text('winner').notNull(),loss:integer('loss').notNull(),gain:integer('gain').notNull(),created:integer('created').notNull(),
},t=>[index('fair_play_pair_time').on(t.loser,t.winner,t.created)]);
export const fairPlayFlags=sqliteTable('fair_play_flags',{
 pair:text('pair').primaryKey(),loser:text('loser').notNull(),winner:text('winner').notNull(),hands:integer('hands').notNull(),loss:integer('loss').notNull(),status:text('status').notNull().default('review'),updated:integer('updated').notNull(),
});
