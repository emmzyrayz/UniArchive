// src/lib/economy/currencies.ts
// Currencies and account names of the credits economy. Client-safe.
//
// Every ledger entry moves amounts between accounts:
//   user:<userId>     a person's wallet
//   system:mint       where earned credits come from (may go negative)
//   system:burn       where spent credits and fees go
//   system:treasury   budgets staff hand out (events, partners)
//   escrow:<id>       credits held for something (bounties)
// Modules may add their own prefixes (e.g. hub:<serverId> later).
export const CURRENCIES = {
  AC: { label: "Archive Credits", short: "AC", transferable: true },
  // Earned only: levels and leaderboards. Never spent or moved between people.
  XP: { label: "XP", short: "XP", transferable: false },
} as const;

export type Currency = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as Currency[];

export const SYSTEM_ACCOUNTS = {
  mint: "system:mint",
  burn: "system:burn",
  treasury: "system:treasury",
} as const;

/** What a deleted account's postings are moved to, so totals still add up. */
export const FORMER_MEMBER_ACCOUNT = "user:former";

const ACCOUNT_RE = /^[a-z]+:[A-Za-z0-9_-]{1,64}$/;

export const userAccount = (userId: string | { toString(): string }) => `user:${String(userId)}`;
export const isUserAccount = (account: string) => account.startsWith("user:") && account !== FORMER_MEMBER_ACCOUNT;
export const userIdOf = (account: string) => (isUserAccount(account) ? account.slice(5) : null);
export const isValidAccount = (account: string) => ACCOUNT_RE.test(account);

/** Only the mint may go below zero: it's where credits are created. */
export const mayGoNegative = (account: string) => account === SYSTEM_ACCOUNTS.mint;
