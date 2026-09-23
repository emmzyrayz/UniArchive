// src/lib/mockMode.ts
// UI-only development mode: mock user and mock data, no backend required.
// On only when NEXT_PUBLIC_MOCK_ROLE is set (e.g. "student" or "admin").
export const IS_MOCK_MODE = !!process.env.NEXT_PUBLIC_MOCK_ROLE;
