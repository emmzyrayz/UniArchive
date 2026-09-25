// POST /api/institutions/suggest
// A student submits a university/faculty/department that isn't listed.
//
// Duplicate detection (src/lib/schoolSuggestions.ts) decides the outcome:
//  - everything already exists  -> the profile is updated, no suggestion
//  - university (+ faculty) exist -> suggestion for the missing part only
//  - university probably exists -> "possible_duplicate" for an admin
//  - another student suggested it -> "linked_duplicate", bumps its priority
//  - otherwise                    -> a new "pending" suggestion
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { asTrimmedString, handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import { escapeRegex } from "@/lib/escapeRegex";
import { getUserModel } from "@/lib/models/userModel";
import {
  ACTIVE_SUGGESTION_STATUSES,
  getSchoolSuggestionModel,
} from "@/lib/models/schoolSuggestionModel";
import {
  autoWithdrawPreviousSuggestion,
  classifySuggestion,
} from "@/lib/schoolSuggestions";
import { NIGERIAN_STATES } from "@/lib/constants/nigerianStates";
import {
  UNIVERSITY_OWNERSHIPS,
  type UniversityOwnership,
} from "@/lib/models/university/universityModel";

const MAX_NAME_LENGTH = 150;
const MAX_ACTIVE_SUGGESTIONS = 3;
const MAX_SUGGESTIONS_PER_DAY = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

// Letters (any script), digits, spaces and the punctuation real names use.
// Rejects <, >, quotes-as-markup, braces and the like.
const NAME_PATTERN = /^[\p{L}\p{N}\s.,'’&()\-/]+$/u;

const MESSAGES = {
  pending:
    "Your school has been submitted for review. We'll notify you when it's approved (usually within 48 hours).",
  possible_duplicate:
    "Your school may already be on our platform. An admin will check and get back to you within 48 hours.",
  linked_duplicate:
    "Someone else from your school already submitted it. You'll be notified when it's approved.",
  faculty_department:
    "Your university is on our platform but your faculty isn't yet. We'll add it soon.",
  department_only:
    "Your university and faculty are on our platform but your department isn't yet. We'll add it soon.",
} as const;

function badRequest(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    enforceRateLimit(request, `suggest:${session.userId}`, 5);

    const body = await readJson<{
      universityName: string;
      universityAbbr: string;
      universityState: string;
      universityOwnership: string;
      facultyName: string;
      departmentName: string;
    }>(request);
    if (!body) return badRequest("Invalid request body.");

    // --- 1. Validate --------------------------------------------------
    const universityName = asTrimmedString(body.universityName, 1000);
    const facultyName = asTrimmedString(body.facultyName, 1000);
    const departmentName = asTrimmedString(body.departmentName, 1000);
    const universityAbbr = asTrimmedString(body.universityAbbr, 1000).toUpperCase();
    const universityState = asTrimmedString(body.universityState, 100);
    const universityOwnership = asTrimmedString(body.universityOwnership, 20);

    for (const [label, value, required] of [
      ["University name", universityName, true],
      ["Faculty name", facultyName, true],
      ["Department name", departmentName, true],
      ["Abbreviation", universityAbbr, false],
    ] as const) {
      if (!value) {
        if (required) return badRequest(`${label} is required.`);
        continue;
      }
      if (value.length > MAX_NAME_LENGTH) {
        return badRequest(`${label} must be at most ${MAX_NAME_LENGTH} characters.`);
      }
      if (!NAME_PATTERN.test(value)) {
        return badRequest(`${label} contains characters that aren't allowed.`);
      }
    }
    if (universityState && !(NIGERIAN_STATES as readonly string[]).includes(universityState)) {
      return badRequest("Choose a state from the list.");
    }
    if (
      universityOwnership &&
      !(UNIVERSITY_OWNERSHIPS as readonly string[]).includes(universityOwnership)
    ) {
      return badRequest(`Ownership must be one of: ${UNIVERSITY_OWNERSHIPS.join(", ")}.`);
    }

    // --- 2. Per-user limits -------------------------------------------
    const Suggestion = await getSchoolSuggestionModel();
    const [activeCount, todayCount] = await Promise.all([
      Suggestion.countDocuments({
        submittedBy: session.userId,
        status: { $in: ACTIVE_SUGGESTION_STATUSES },
      }),
      Suggestion.countDocuments({
        submittedBy: session.userId,
        submittedAt: { $gte: new Date(Date.now() - DAY_MS) },
      }),
    ]);
    if (activeCount >= MAX_ACTIVE_SUGGESTIONS) {
      return badRequest(
        `You already have ${MAX_ACTIVE_SUGGESTIONS} suggestions awaiting review. Withdraw one or wait for a decision.`,
        429,
      );
    }
    if (todayCount >= MAX_SUGGESTIONS_PER_DAY) {
      return badRequest(
        `You can submit up to ${MAX_SUGGESTIONS_PER_DAY} school suggestions a day. Try again tomorrow.`,
        429,
      );
    }

    // --- 3. Same user, same university, still pending -----------------
    const alreadySuggested = await Suggestion.exists({
      submittedBy: session.userId,
      status: { $in: ACTIVE_SUGGESTION_STATUSES },
      suggestedUniversityName: {
        $regex: `^${escapeRegex(universityName)}$`,
        $options: "i",
      },
    });
    if (alreadySuggested) {
      return badRequest("You've already suggested this school. It's awaiting review.", 409);
    }

    // --- 4. Duplicate detection ---------------------------------------
    const result = await classifySuggestion(
      { universityName, facultyName, departmentName },
      session.userId,
    );
    const User = await getUserModel();

    // The user's school is about to change either way, so the suggestion
    // their profile pointed at would otherwise be orphaned in the queue.
    await autoWithdrawPreviousSuggestion(session.userId);

    if (result.outcome === "auto_resolved") {
      const { university, faculty, department } = result;
      await User.findByIdAndUpdate(session.userId, {
        $set: {
          universityId: university.id,
          universityName: university.name,
          universityAbbr: university.abbreviation,
          facultyId: faculty.id,
          facultyName: faculty.name,
          departmentId: department.id,
          departmentName: department.name,
          school: university.name,
          faculty: faculty.name,
          department: department.name,
        },
        $unset: { pendingSuggestionId: "" },
      });
      return NextResponse.json({
        outcome: "auto_resolved",
        message: "Your school is already on the platform. Your profile has been updated.",
        university: { id: university.id, name: university.name, abbreviation: university.abbreviation },
        faculty,
        department,
      });
    }

    // --- 5. Create the suggestion -------------------------------------
    const now = new Date();
    const suggestion = await Suggestion.create({
      suggestedUniversityName: universityName,
      suggestedUniversityAbbr: universityAbbr || undefined,
      suggestedUniversityState: universityState || undefined,
      suggestedUniversityOwnership: (universityOwnership || undefined) as
        | UniversityOwnership
        | undefined,
      suggestedFacultyName: facultyName,
      suggestedDepartmentName: departmentName,
      submittedBy: session.userId,
      submittedByUpid: session.upid,
      submittedAt: now,
      canWithdrawUntil: new Date(now.getTime() + DAY_MS),
      suggestionScope: result.scope,
      existingUniversityId: result.existingUniversity?.id,
      existingFacultyId: result.existingFaculty?.id,
      status: result.status,
      linkedToSuggestionId: result.linkedToSuggestionId,
      duplicateOfUniversityId: result.duplicateOfUniversityId,
      adminPriority: 1,
    });

    if (result.linkedToSuggestionId) {
      await Suggestion.findByIdAndUpdate(result.linkedToSuggestionId, {
        $inc: { adminPriority: 1 },
      });
    }

    // --- 6. Point the profile at what's known -------------------------
    // Refs for the parts that exist are set; refs below them are cleared,
    // since an old faculty/department can't belong to the suggested school.
    const set: Record<string, unknown> = {
      school: result.existingUniversity?.name ?? universityName,
      faculty: result.existingFaculty?.name ?? facultyName,
      department: departmentName,
      pendingSuggestionId: suggestion._id,
    };
    const unset: Record<string, ""> = { departmentId: "", departmentName: "" };
    if (result.existingUniversity) {
      set.universityId = result.existingUniversity.id;
      set.universityName = result.existingUniversity.name;
      set.universityAbbr = result.existingUniversity.abbreviation;
    } else {
      Object.assign(unset, { universityId: "", universityName: "", universityAbbr: "" });
    }
    if (result.existingFaculty) {
      set.facultyId = result.existingFaculty.id;
      set.facultyName = result.existingFaculty.name;
    } else {
      Object.assign(unset, { facultyId: "", facultyName: "" });
    }
    await User.findByIdAndUpdate(session.userId, { $set: set, $unset: unset });

    // --- 7. Respond ---------------------------------------------------
    const outcome = result.status === "pending" && result.scope !== "full" ? result.scope : result.status;
    return NextResponse.json({
      outcome,
      suggestionId: suggestion._id.toString(),
      message: MESSAGES[outcome],
      canWithdrawUntil: suggestion.canWithdrawUntil,
    });
  } catch (error) {
    return handleRouteError(error, "institutions/suggest");
  }
}
