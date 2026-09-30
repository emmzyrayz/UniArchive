// src/lib/site.ts
// Public site constants that client components can import too. Keep this
// free of env reads and server-only imports (src/lib/seo.ts has the URLs).

/**
 * The one public contact address: UI, legal pages, JSON-LD, email Reply-To,
 * and where contact-form messages are delivered. It is a forwarding address
 * (the domain's mail forwarder sends it on to the team's Gmail inbox).
 */
export const SUPPORT_EMAIL = "support@uniarchive.com.ng";

/** Sender of every transactional email (sent through ZeptoMail). */
export const NO_REPLY_EMAIL = "no-reply@uniarchive.com.ng";
