// src/lib/auth/loginContext.ts
// Where a sign-in came from, for the session list and login history in
// settings: device name, device type, IP and a rough location. Location comes
// from the geo headers Vercel adds to every request, so it costs nothing and
// is absent in local development.
import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/api";
import { getDeviceName } from "@/lib/auth/deviceRecognition";

export type DeviceType = "mobile" | "tablet" | "desktop";

export interface LoginContext {
  device: string; // "Chrome on Windows"
  deviceType: DeviceType;
  ipAddress: string;
  location?: string; // "Awka, Nigeria"
}

export function getDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase();
  if (ua.includes("ipad") || ua.includes("tablet") || (ua.includes("android") && !ua.includes("mobile"))) {
    return "tablet";
  }
  if (ua.includes("mobi") || ua.includes("iphone")) return "mobile";
  return "desktop";
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(code: string): string {
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

function header(request: NextRequest, name: string): string | undefined {
  const value = request.headers.get(name)?.trim();
  if (!value) return undefined;
  try {
    // Vercel URL-encodes city names ("S%C3%A3o%20Paulo")
    return decodeURIComponent(value).slice(0, 80);
  } catch {
    return value.slice(0, 80);
  }
}

/** "Awka, Nigeria", "AN, Nigeria" or "Nigeria"; undefined off Vercel. */
export function getRequestLocation(request: NextRequest): string | undefined {
  const country = header(request, "x-vercel-ip-country");
  if (!country) return undefined;
  const place = header(request, "x-vercel-ip-city") ?? header(request, "x-vercel-ip-country-region");
  return [place, countryName(country)].filter(Boolean).join(", ");
}

export function getLoginContext(request: NextRequest): LoginContext {
  const userAgent = request.headers.get("user-agent") ?? "";
  return {
    device: getDeviceName(userAgent),
    deviceType: getDeviceType(userAgent),
    ipAddress: getClientIp(request),
    location: getRequestLocation(request),
  };
}
