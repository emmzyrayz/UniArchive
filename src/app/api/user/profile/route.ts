// PATCH /api/user/profile
// Updates the signed-in user's own profile. The body may carry any subset of
// the editable fields below; anything else (email, username, role, upid,
// uuid, isVerified, counters, tokenVersion, ...) is silently ignored.
//
// Institution fields cascade: changing the university clears the faculty and
// department, changing the faculty clears the department. The denormalised
// *Name/*Abbr copies and the legacy school/faculty/department strings are
// kept in sync with the refs.
import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { getUserModel } from "@/lib/models/userModel";
import { getUniversityModel } from "@/lib/models/university/universityModel";
import { getFacultyModel } from "@/lib/models/university/facultyModel";
import { getDepartmentModel } from "@/lib/models/university/departmentModel";
import { requireAuth } from "@/lib/auth/session";
import { handleRouteError, readJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rateLimit";
import { encryptSensitiveData, hashForSearch } from "@/lib/encryption";
import { isOwnAvatarUrl } from "@/lib/cloudinary";
import { calculateProfileCompletion } from "@/lib/profileCompletion";
import {
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_LEVELS,
  PROFILE_NAME_MAX_LENGTH,
  PROFILE_SEMESTERS,
  normalizeNigerianPhone,
  validateDob,
} from "@/lib/constants/profile";

interface ProfileUpdateBody {
  firstName: string;
  lastName: string;
  bio: string;
  dob: string;
  phone: string;
  profilePhoto: string;
  universityId: string;
  facultyId: string;
  departmentId: string;
  level: string;
  semester: string;
}

const USER_FIELDS =
  "upid uuid role fullName firstName lastName username isVerified " +
  "profilePhoto bio dob phone level semester " +
  "universityId universityName universityAbbr facultyId facultyName " +
  "departmentId departmentName";

class BadRequest extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** Reads an optional string field. undefined = not sent; throws on non-strings. */
function optionalString(
  body: Record<string, unknown>,
  key: keyof ProfileUpdateBody,
): string | undefined {
  const value = body[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new BadRequest(`${key} must be a string.`);
  return value.trim();
}

function objectIdField(
  body: Record<string, unknown>,
  key: "universityId" | "facultyId" | "departmentId",
): string | undefined {
  const value = optionalString(body, key);
  if (!value) return undefined;
  if (!isValidObjectId(value)) throw new BadRequest(`${key} is not a valid id.`);
  return value;
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    enforceRateLimit(request, `profile-update:${session.userId}`, 30);

    const body = await readJson<ProfileUpdateBody>(request);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
    }
    const raw = body as Record<string, unknown>;

    const User = await getUserModel();
    const current = await User.findById(session.userId)
      .select("fullName firstName lastName universityId facultyId")
      .lean();
    if (!current) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    const set: Record<string, unknown> = {};
    const unset: Record<string, ""> = {};

    // --- Personal -------------------------------------------------------
    const firstName = optionalString(raw, "firstName");
    const lastName = optionalString(raw, "lastName");
    for (const [key, value] of [
      ["firstName", firstName],
      ["lastName", lastName],
    ] as const) {
      if (value === undefined) continue;
      if (!value) throw new BadRequest(`${key} cannot be empty.`);
      if (value.length > PROFILE_NAME_MAX_LENGTH) {
        throw new BadRequest(`${key} must be at most ${PROFILE_NAME_MAX_LENGTH} characters.`);
      }
      set[key] = value;
    }
    if (firstName !== undefined || lastName !== undefined) {
      // Older accounts only have fullName; split it for the half not sent.
      const [storedFirst = "", ...storedRest] = (current.fullName ?? "").split(/\s+/);
      const first = firstName ?? current.firstName ?? storedFirst;
      const last = lastName ?? current.lastName ?? storedRest.join(" ");
      set.fullName = [first, last].filter(Boolean).join(" ");
    }

    const bio = optionalString(raw, "bio");
    if (bio !== undefined) {
      if (bio.length > PROFILE_BIO_MAX_LENGTH) {
        throw new BadRequest(`Bio must be at most ${PROFILE_BIO_MAX_LENGTH} characters.`);
      }
      if (bio) set.bio = bio;
      else unset.bio = "";
    }

    const dob = optionalString(raw, "dob");
    if (dob !== undefined) {
      if (dob) {
        const dobError = validateDob(dob);
        if (dobError) throw new BadRequest(dobError);
        set.dob = new Date(dob);
      } else {
        unset.dob = "";
      }
    }

    const phone = optionalString(raw, "phone");
    if (phone !== undefined) {
      if (phone) {
        const normalized = normalizeNigerianPhone(phone);
        if (!normalized) throw new BadRequest("Enter a valid Nigerian phone number.");
        set.phone = encryptSensitiveData(normalized);
        set.phoneHash = hashForSearch(normalized);
      } else {
        unset.phone = "";
        unset.phoneHash = "";
      }
    }

    const profilePhoto = optionalString(raw, "profilePhoto");
    if (profilePhoto !== undefined) {
      if (profilePhoto) {
        if (!isOwnAvatarUrl(profilePhoto, session.userId)) {
          throw new BadRequest("profilePhoto must be an avatar uploaded through UniArchive.");
        }
        set.profilePhoto = profilePhoto;
      } else {
        unset.profilePhoto = "";
      }
    }

    // --- Academic -------------------------------------------------------
    const level = optionalString(raw, "level");
    if (level !== undefined) {
      if (level && !(PROFILE_LEVELS as readonly string[]).includes(level)) {
        throw new BadRequest(`level must be one of: ${PROFILE_LEVELS.join(", ")}.`);
      }
      if (level) set.level = level;
      else unset.level = "";
    }

    const semester = optionalString(raw, "semester");
    if (semester !== undefined) {
      if (semester && !(PROFILE_SEMESTERS as readonly string[]).includes(semester)) {
        throw new BadRequest(`semester must be one of: ${PROFILE_SEMESTERS.join(", ")}.`);
      }
      if (semester) set.semester = semester;
      else unset.semester = "";
    }

    const universityId = objectIdField(raw, "universityId");
    const facultyId = objectIdField(raw, "facultyId");
    const departmentId = objectIdField(raw, "departmentId");

    if (departmentId && !facultyId) {
      throw new BadRequest("departmentId requires facultyId.");
    }

    const clearFaculty = () => {
      unset.facultyId = "";
      unset.facultyName = "";
      unset.faculty = "";
    };
    const clearDepartment = () => {
      unset.departmentId = "";
      unset.departmentName = "";
      unset.department = "";
    };

    if (universityId) {
      const University = await getUniversityModel();
      const university = await University.findOne({ _id: universityId, isActive: true })
        .select("name abbreviation")
        .lean();
      if (!university) throw new BadRequest("University not found.", 404);

      set.universityId = university._id;
      set.universityName = university.name;
      set.universityAbbr = university.abbreviation;
      set.school = university.name;

      // A different university invalidates the stored faculty/department.
      const changed = String(current.universityId ?? "") !== universityId;
      if (changed && !facultyId) {
        clearFaculty();
        clearDepartment();
      }
    }

    if (facultyId) {
      const effectiveUniversityId = universityId ?? current.universityId?.toString();
      if (!effectiveUniversityId) {
        throw new BadRequest("Select a university before choosing a faculty.");
      }
      const Faculty = await getFacultyModel();
      const faculty = await Faculty.findOne({
        _id: facultyId,
        universityId: effectiveUniversityId,
        isActive: true,
      })
        .select("name")
        .lean();
      if (!faculty) throw new BadRequest("Faculty not found.", 404);

      set.facultyId = faculty._id;
      set.facultyName = faculty.name;
      set.faculty = faculty.name;

      const changed = String(current.facultyId ?? "") !== facultyId;
      if ((changed || universityId) && !departmentId) clearDepartment();

      if (departmentId) {
        const Department = await getDepartmentModel();
        const department = await Department.findOne({
          _id: departmentId,
          facultyId,
          universityId: effectiveUniversityId,
          isActive: true,
        })
          .select("name")
          .lean();
        if (!department) throw new BadRequest("Department not found.", 404);

        set.departmentId = department._id;
        set.departmentName = department.name;
        set.department = department.name;
      }
    }

    // A field can't be both set and unset in one update.
    for (const key of Object.keys(set)) delete unset[key];

    const update: Record<string, unknown> = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;

    const user = Object.keys(update).length
      ? await User.findByIdAndUpdate(session.userId, update, {
          new: true,
          runValidators: true,
        })
          .select(USER_FIELDS)
          .lean()
      : await User.findById(session.userId).select(USER_FIELDS).lean();
    if (!user) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    const profileCompletion = calculateProfileCompletion(user);

    return NextResponse.json(
      {
        // phone is ciphertext and never returned; hasPhone says whether it's set.
        user: {
          id: String(user._id),
          upid: user.upid,
          uuid: user.uuid,
          role: user.role,
          fullName: user.fullName,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          isVerified: user.isVerified,
          profilePhoto: user.profilePhoto,
          bio: user.bio,
          dob: user.dob,
          hasPhone: !!user.phone,
          level: user.level,
          semester: user.semester,
          universityId: user.universityId?.toString(),
          universityName: user.universityName,
          universityAbbr: user.universityAbbr,
          facultyId: user.facultyId?.toString(),
          facultyName: user.facultyName,
          departmentId: user.departmentId?.toString(),
          departmentName: user.departmentName,
        },
        profileCompletion,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof BadRequest) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return handleRouteError(error, "user/profile");
  }
}
