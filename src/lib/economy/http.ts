// src/lib/economy/http.ts
// Turns economy refusals into responses for the routes.
import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api";
import { EconomyError } from "./ledger";

export function economyRouteError(error: unknown, context: string): Response {
  if (error instanceof EconomyError) {
    return NextResponse.json({ message: error.message, code: error.code }, { status: error.status });
  }
  return handleRouteError(error, context);
}
