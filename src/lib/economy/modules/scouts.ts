// src/lib/economy/modules/scouts.ts
// Archive Scouts in the credits economy: what each task pays (lib/scouts
// decides when). Admins can change these at /admin/economy.
import type { EconomyModule } from "../registry";

export const scoutsModule: EconomyModule = {
  id: "scouts",
  title: "Archive Scouts",
  description: "Small tasks that keep the library accurate, paid once the result is confirmed.",
  sources: [
    {
      id: "scouts.identify",
      title: "Identified a PDF",
      rewards: { AC: 15, XP: 20 },
      capped: true,
      streakBoost: true,
      countsForBoards: true,
    },
    {
      id: "scouts.readable",
      title: "Checked a PDF is readable",
      rewards: { AC: 3, XP: 5 },
      capped: true,
      streakBoost: true,
      countsForBoards: true,
    },
    {
      id: "scouts.check_typed",
      title: "Checked a typed question",
      rewards: { AC: 5, XP: 8 },
      capped: true,
      streakBoost: true,
      countsForBoards: true,
    },
    {
      // The typist, once Scouts confirm their question matches the paper
      id: "scouts.typed_verified",
      title: "Your typed question was verified",
      rewards: { AC: 5, XP: 5 },
      countsForBoards: true,
    },
  ],
};
