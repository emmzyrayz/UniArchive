// PATCH /api/admin/institutions/[id]
// Edit a university. Permission: "manage_institution".
// Allowed: name, abbreviation, state, city, website, logoUrl, foundingYear,
// ownership, type, affiliationType, isActive, verificationStatus. "" clears
// the optional ones (city, website, logoUrl, affiliationType, foundingYear).
// A new name or abbreviation is copied to its faculties, departments, users
// and materials.
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { requirePermission } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import { fail, isDuplicateKey, optionalString } from "@/lib/adminApi";
import { getUniversityModel, generateSlug, type IUniversity } from "@/lib/models/university/universityModel";
import {
  cascadeUniversityRename,
  checkName,
  checkUniversityAbbr,
  isHttpUrl,
  isNigerianState,
  isOwnership,
  isUniversityType,
  normaliseAbbr,
  toAdminUniversityDto,
} from "@/lib/institutionAdmin";

type Context = { params: Promise<{ id: string }> };

const VERIFICATION_STATUSES = ["unverified", "verified", "flagged"];

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const session = await requirePermission(request, "manage_institution");
    enforceRateLimit(request, `admin-institutions:${session.userId}`, 60);
    const { id } = await context.params;
    if (!isValidObjectId(id)) return fail(404, "University not found.");

    const body = await readJson(request);
    if (!body) return fail(400, "Invalid request body.");

    const University = await getUniversityModel();
    const current = await University.findById(id).lean<IUniversity>();
    if (!current) return fail(404, "University not found.");

    const set: Record<string, unknown> = {};
    const unset: Record<string, ""> = {};

    if (body.name !== undefined) {
      const name = optionalString(body.name, 200) ?? "";
      const invalid = checkName("University name", name);
      if (invalid) return fail(400, invalid);
      if (name !== current.name) {
        set.name = name;
        set.slug = generateSlug(name);
      }
    }
    if (body.abbreviation !== undefined) {
      const abbr = normaliseAbbr(optionalString(body.abbreviation, 30) ?? "");
      const invalid = checkUniversityAbbr(abbr);
      if (invalid) return fail(400, invalid);
      if (abbr !== current.abbreviation) set.abbreviation = abbr;
    }
    if (body.state !== undefined) {
      if (!isNigerianState(body.state)) return fail(400, "Choose a valid state.");
      set.state = body.state;
    }
    if (body.ownership !== undefined) {
      if (!isOwnership(body.ownership)) return fail(400, "Ownership must be Federal, State or Private.");
      set.ownership = body.ownership;
    }
    if (body.type !== undefined) {
      if (!isUniversityType(body.type)) return fail(400, "Unknown institution type.");
      set.type = body.type;
    }
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") return fail(400, "isActive must be true or false.");
      set.isActive = body.isActive;
    }
    if (body.verificationStatus !== undefined) {
      if (!VERIFICATION_STATUSES.includes(body.verificationStatus as string)) {
        return fail(400, "verificationStatus must be unverified, verified or flagged.");
      }
      set.verificationStatus = body.verificationStatus;
      // Only a change to verified records who verified it and when
      if (body.verificationStatus === "verified" && current.verificationStatus !== "verified") {
        set.verifiedBy = session.userId;
        set.verifiedAt = new Date();
      }
    }

    // Optional text: "" clears
    const optionalText: [key: string, max: number, valid: (v: string) => boolean, message: string][] = [
      ["city", 100, () => true, "City is too long."],
      ["website", 300, isHttpUrl, "Website must be an http(s) URL."],
      ["logoUrl", 500, (v) => v.startsWith("https://"), "Logo URL must start with https://."],
      ["affiliationType", 20, (v) => /^[A-Za-z]{2,20}$/.test(v), "Affiliation must be letters, e.g. NUC."],
    ];
    for (const [key, max, valid, message] of optionalText) {
      const value = optionalString(body[key], max);
      if (value === undefined) continue;
      if (value === null || (value && !valid(value))) return fail(400, message);
      if (value) set[key] = value;
      else unset[key] = "";
    }
    if (body.foundingYear !== undefined) {
      if (body.foundingYear === "" || body.foundingYear === null) {
        unset.foundingYear = "";
      } else {
        const year = Number(body.foundingYear);
        if (!Number.isInteger(year) || year < 1800 || year > new Date().getFullYear()) {
          return fail(400, "Founding year must be a year between 1800 and now.");
        }
        set.foundingYear = year;
      }
    }

    if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
      return NextResponse.json({ university: toAdminUniversityDto(current) });
    }

    let updated: IUniversity | null;
    try {
      updated = await University.findByIdAndUpdate(
        id,
        {
          ...(Object.keys(set).length ? { $set: set } : {}),
          ...(Object.keys(unset).length ? { $unset: unset } : {}),
        },
        { returnDocument: "after", runValidators: true },
      ).lean<IUniversity>();
    } catch (error) {
      if (isDuplicateKey(error)) return fail(409, "Another university already uses that name or abbreviation.");
      throw error;
    }
    if (!updated) return fail(404, "University not found.");

    if (set.name || set.abbreviation) {
      await cascadeUniversityRename(updated._id, updated.name, updated.abbreviation);
    }
    console.info(`admin: @${session.upid} edited university ${updated.abbreviation}: ${Object.keys({ ...set, ...unset }).join(", ")}`);
    return NextResponse.json({ university: toAdminUniversityDto(updated) });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/admin/institutions/[id]");
  }
}
