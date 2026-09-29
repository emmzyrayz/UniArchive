// Auth.js endpoints for Google sign-in: /api/auth/signin/google,
// /api/auth/callback/google, /api/auth/csrf, /api/auth/providers, ...
// The static /api/auth/* routes (login, logout, me, ...) take precedence.
import { handlers } from "@/lib/auth/socialAuth";

export const { GET, POST } = handlers;
