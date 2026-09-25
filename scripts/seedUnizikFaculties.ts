// scripts/seedUnizikFaculties.ts
// Seeds faculties and departments for Nnamdi Azikiwe University (UNIZIK).
//
// Idempotent and insert-only: a faculty that already exists for UNIZIK (same
// name) or a department that already exists in that faculty is skipped,
// never updated, so admin edits are never overwritten. The denormalised
// counts are recomputed from the database afterwards, so they stay correct
// even when some records were added by hand.
//
// Run with: npx tsx scripts/seedUnizikFaculties.ts
import { config } from "dotenv";
import mongoose from "mongoose";
import { getUniversityModel } from "@/lib/models/university/universityModel";
import { getFacultyModel } from "@/lib/models/university/facultyModel";
import { getDepartmentModel } from "@/lib/models/university/departmentModel";

config({ path: ".env.local", quiet: true });

const UNIVERSITY_ABBR = "UNIZIK";

interface FacultySeed {
  name: string;
  abbreviation: string;
  departments: string[];
}

const UNIZIK_FACULTIES: FacultySeed[] = [
  {
    name: "Faculty of Engineering",
    abbreviation: "FENG",
    departments: [
      "Chemical Engineering",
      "Civil Engineering",
      "Computer Engineering",
      "Electrical Engineering",
      "Electronic and Computer Engineering",
      "Mechanical Engineering",
      "Metallurgical and Materials Engineering",
      "Polymer and Textile Engineering",
    ],
  },
  {
    name: "Faculty of Physical Sciences",
    abbreviation: "FPS",
    departments: [
      "Chemistry",
      "Computer Science",
      "Geology",
      "Industrial Chemistry",
      "Industrial Mathematics",
      "Industrial Physics",
      "Mathematics",
      "Physics and Industrial Physics",
      "Statistics",
    ],
  },
  {
    name: "Faculty of Life Sciences",
    abbreviation: "FLS",
    departments: ["Botany", "Microbiology", "Zoology"],
  },
  {
    name: "Faculty of Agriculture",
    abbreviation: "FAGRIC",
    departments: [
      "Agricultural Economics and Extension",
      "Animal Science and Technology",
      "Crop Science and Technology",
      "Food Science and Technology",
      "Soil Science and Land Resources Management",
    ],
  },
  {
    name: "Faculty of Medicine",
    abbreviation: "FMED",
    departments: [
      "Anaesthesia",
      "Chemical Pathology",
      "Community Medicine",
      "Haematology and Transfusion Medicine",
      "Human Anatomy",
      "Human Physiology",
      "Medical Laboratory Science",
      "Medicine and Surgery",
      "Nursing",
      "Pharmacology",
    ],
  },
  {
    name: "Faculty of Pharmaceutical Sciences",
    abbreviation: "FPS2",
    departments: [
      "Clinical Pharmacy and Pharmacy Management",
      "Pharmaceutical Chemistry",
      "Pharmaceutical Microbiology",
      "Pharmacognosy and Traditional Medicine",
      "Pharmaceutics",
      "Pharmacology and Toxicology",
    ],
  },
  {
    name: "Faculty of Health Sciences and Technology",
    abbreviation: "FHST",
    departments: [
      "Dental Technology",
      "Environmental Health Science",
      "Human Kinetics and Health Education",
      "Medical Rehabilitation",
      "Optometry",
      "Radiography",
    ],
  },
  {
    name: "Faculty of Law",
    abbreviation: "FLAW",
    departments: [
      "Business Law",
      "International Law and Jurisprudence",
      "Private Law",
      "Public Law",
    ],
  },
  {
    name: "Faculty of Arts",
    abbreviation: "FARTS",
    departments: [
      "English Language and Literature",
      "Fine and Applied Arts",
      "French",
      "History and International Studies",
      "Igbo Language and Linguistics",
      "Music",
      "Philosophy",
      "Religion and Human Relations",
      "Theatre and Film Studies",
    ],
  },
  {
    name: "Faculty of Social Sciences",
    abbreviation: "FSOCSCI",
    departments: [
      "Criminology and Security Studies",
      "Economics",
      "Mass Communication",
      "Political Science",
      "Psychology",
      "Public Administration and Local Government",
      "Sociology and Anthropology",
    ],
  },
  {
    name: "Faculty of Management Sciences",
    abbreviation: "FMS",
    departments: [
      "Accountancy",
      "Banking and Finance",
      "Business Administration",
      "Co-operative Economics and Management",
      "Entrepreneurship Studies",
      "Marketing",
      "Public Administration",
    ],
  },
  {
    name: "Faculty of Education",
    abbreviation: "FEDU",
    departments: [
      "Adult Education",
      "Early Childhood and Primary Education",
      "Educational Foundations",
      "Educational Management",
      "Guidance and Counselling",
      "Library and Information Science",
      "Science Education",
      "Social Science Education",
      "Vocational Education",
    ],
  },
  {
    name: "Faculty of Environmental Sciences",
    abbreviation: "FENVS",
    departments: [
      "Architecture",
      "Building",
      "Estate Management",
      "Fine and Applied Arts",
      "Quantity Surveying",
      "Urban and Regional Planning",
    ],
  },
];

async function main() {
  const University = await getUniversityModel();
  const Faculty = await getFacultyModel();
  const Department = await getDepartmentModel();

  const university = await University.findOne({ abbreviation: UNIVERSITY_ABBR })
    .select("name abbreviation")
    .lean();
  if (!university) {
    throw new Error(
      `University "${UNIVERSITY_ABBR}" not found. Run scripts/seedUniversities.ts first.`,
    );
  }
  console.log(`Seeding ${university.name} (${university._id})\n`);

  const universityRef = {
    universityId: university._id,
    universityName: university.name,
    universityAbbr: university.abbreviation,
  };

  const totals = { facultiesInserted: 0, facultiesSkipped: 0, deptsInserted: 0, deptsSkipped: 0 };

  for (const seed of UNIZIK_FACULTIES) {
    // $setOnInsert: creates the faculty if missing, never modifies an existing one
    const facultyResult = await Faculty.updateOne(
      { universityId: university._id, name: seed.name },
      {
        $setOnInsert: {
          ...universityRef,
          name: seed.name,
          abbreviation: seed.abbreviation,
          isActive: true,
          totalDepartments: 0,
        },
      },
      { upsert: true },
    );
    if (facultyResult.upsertedCount > 0) {
      totals.facultiesInserted++;
      console.log(`✓ inserted ${seed.name}`);
    } else {
      totals.facultiesSkipped++;
      console.log(`→ skipped ${seed.name} (exists)`);
    }

    const faculty = await Faculty.findOne({ universityId: university._id, name: seed.name })
      .select("_id name")
      .lean();
    if (!faculty) throw new Error(`Faculty "${seed.name}" missing after upsert`);

    for (const name of seed.departments) {
      const deptResult = await Department.updateOne(
        { universityId: university._id, facultyId: faculty._id, name },
        {
          $setOnInsert: {
            ...universityRef,
            facultyId: faculty._id,
            facultyName: faculty.name,
            name,
            isActive: true,
            totalCourses: 0,
          },
        },
        { upsert: true },
      );
      if (deptResult.upsertedCount > 0) {
        totals.deptsInserted++;
        console.log(`  ✓ ${name}`);
      } else {
        totals.deptsSkipped++;
        console.log(`  → ${name} (exists)`);
      }
    }

    // Recount from the database so hand-added departments are included
    const totalDepartments = await Department.countDocuments({
      facultyId: faculty._id,
      isActive: true,
    });
    await Faculty.updateOne({ _id: faculty._id }, { $set: { totalDepartments } });
    console.log(`  = ${totalDepartments} active departments\n`);
  }

  const [totalFaculties, totalDepartments] = await Promise.all([
    Faculty.countDocuments({ universityId: university._id, isActive: true }),
    Department.countDocuments({ universityId: university._id, isActive: true }),
  ]);
  await University.updateOne(
    { _id: university._id },
    { $set: { totalFaculties, totalDepartments } },
  );

  console.log("Summary");
  console.log(
    `  Faculties:   ${totals.facultiesInserted} inserted, ${totals.facultiesSkipped} skipped`,
  );
  console.log(
    `  Departments: ${totals.deptsInserted} inserted, ${totals.deptsSkipped} skipped`,
  );
  console.log(
    `  ${UNIVERSITY_ABBR} now has ${totalFaculties} faculties and ${totalDepartments} departments`,
  );
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  });
