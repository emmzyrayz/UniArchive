// scripts/seedUniversities.ts
// Seeds the `universities` collection with Nigerian universities cleaned
// from the DIUSCADI schoolData.ts audit.
//
// Idempotent and insert-only: a university whose abbreviation already exists
// is skipped, never updated, so admin edits are never overwritten.
//
// Run with: npx tsx scripts/seedUniversities.ts
//
// Fixes applied to the source data (from the DIUSCADI audit):
//  1. OSUSTECH collision: "Ogun State University, Ago Iwoye" is the old name
//     of Olabisi Onabanjo University (OOU) — dropped, OOU entry kept
//  2. FUNAI duplicate: "Federal University, Ndufu-Alike" is the same school
//     as "Alex Ekwueme Federal University, Ndufu-Alike" — kept Alex Ekwueme
//  3. "Univeristy" -> "University" (AUST)
//  4. "Micheal" -> "Michael" (Ibru University)
//  5. "Uzaire" -> "Uzairue"
//  6. Removed: Dorben Polytechnic, Imperial College Kaduna, OGITECH
//  7. Nuhu Bamalli Polytechnic kept (type: Polytechnic)
//  8. "Rivers State University of Science and Technology" -> "Rivers State
//     University" (renamed)
//  9. The old `type` field held ownership, not institution kind — ignored.
//     Ownership is given explicitly below; name inference is a fallback only.
// 10. University of Benin ownership corrected to Federal.
import { config } from "dotenv";
import mongoose from "mongoose";
import {
  generateSlug,
  generateUsid,
  getUniversityModel,
  type UniversityOwnership,
  type UniversityType,
} from "@/lib/models/university/universityModel";

config({ path: ".env.local", quiet: true });

const SEED_SOURCE = "diuscadi-schoolData-cleaned";

interface SeedEntry {
  name: string;
  abbreviation: string;
  state: string;
  city?: string;
  ownership?: UniversityOwnership;
}

const UNIVERSITIES: SeedEntry[] = [
  { name: "Abia State University, Uturu", abbreviation: "ABSU", state: "Abia", city: "Uturu", ownership: "State" },
  { name: "Achievers University, Owo", abbreviation: "AUO", state: "Ondo", city: "Owo", ownership: "Private" },
  { name: "Adamawa State University, Mubi", abbreviation: "ADSU", state: "Adamawa", city: "Mubi", ownership: "State" },
  { name: "Adekunle Ajasin University, Akungba", abbreviation: "AAUA", state: "Ondo", city: "Akungba", ownership: "State" },
  { name: "Adeleke University, Ede", abbreviation: "AUE", state: "Osun", city: "Ede", ownership: "Private" },
  { name: "Admiralty University of Nigeria", abbreviation: "ADUN", state: "Delta", ownership: "Federal" },
  { name: "Afe Babalola University", abbreviation: "ABUAD", state: "Ekiti", ownership: "Private" },
  { name: "African University of Science and Technology", abbreviation: "AUST", state: "Federal Capital Territory", ownership: "Private" },
  { name: "Ahmadu Bello University, Zaria", abbreviation: "ABU", state: "Kaduna", city: "Zaria", ownership: "Federal" },
  { name: "Ajayi Crowther University, Oyo", abbreviation: "ACU", state: "Oyo", city: "Oyo", ownership: "Private" },
  { name: "Akwa Ibom State University, Uyo", abbreviation: "AKSU", state: "Akwa Ibom", city: "Uyo", ownership: "State" },
  { name: "Al-Hikmah University, Ilorin", abbreviation: "AHU", state: "Kwara", city: "Ilorin", ownership: "Private" },
  { name: "Al-Qalam University, Katsina", abbreviation: "AUK", state: "Katsina", ownership: "Private" },
  { name: "Alex Ekwueme Federal University, Ndufu-Alike", abbreviation: "FUNAI", state: "Ebonyi", ownership: "Federal" },
  { name: "Ambrose Alli University, Ekpoma", abbreviation: "AAU", state: "Edo", city: "Ekpoma", ownership: "State" },
  { name: "American University of Nigeria, Yola", abbreviation: "AUN", state: "Adamawa", city: "Yola", ownership: "Private" },
  { name: "Anambra State University, Uli", abbreviation: "ANSU", state: "Anambra", city: "Uli", ownership: "State" },
  { name: "Arthur Jarvis University, Calabar", abbreviation: "AJU", state: "Cross River", city: "Calabar", ownership: "Private" },
  { name: "Babcock University, Ilishan-Remo", abbreviation: "BABCOCK", state: "Ogun", city: "Ilishan-Remo", ownership: "Private" },
  { name: "Bauchi State University, Gadau", abbreviation: "BASUG", state: "Bauchi", city: "Gadau", ownership: "State" },
  { name: "Bayero University, Kano", abbreviation: "BUK", state: "Kano", city: "Kano", ownership: "Federal" },
  { name: "Baze University, Abuja", abbreviation: "BAZE", state: "Federal Capital Territory", city: "Abuja", ownership: "Private" },
  { name: "Bells University of Technology, Ota", abbreviation: "BELLS", state: "Ogun", city: "Ota", ownership: "Private" },
  { name: "Benson Idahosa University, Benin City", abbreviation: "BIU", state: "Edo", city: "Benin City", ownership: "Private" },
  { name: "Benue State University, Makurdi", abbreviation: "BSUM", state: "Benue", city: "Makurdi", ownership: "State" },
  { name: "Bingham University, Karu", abbreviation: "BINGHAM", state: "Nasarawa", city: "Karu", ownership: "Private" },
  { name: "Bowen University, Iwo", abbreviation: "BOWEN", state: "Osun", city: "Iwo", ownership: "Private" },
  { name: "Bukar Abba Ibrahim University, Damaturu", abbreviation: "BAIU", state: "Yobe", city: "Damaturu", ownership: "State" },
  { name: "Caleb University, Lagos", abbreviation: "CALEB", state: "Lagos", city: "Lagos", ownership: "Private" },
  { name: "Caritas University, Enugu", abbreviation: "CARITAS", state: "Enugu", city: "Enugu", ownership: "Private" },
  { name: "Chrisland University, Abeokuta", abbreviation: "CHRISLAND", state: "Ogun", city: "Abeokuta", ownership: "Private" },
  { name: "Chukwuemeka Odumegwu Ojukwu University, Uli", abbreviation: "COOU", state: "Anambra", city: "Uli", ownership: "State" },
  { name: "Covenant University, Ota", abbreviation: "CU", state: "Ogun", city: "Ota", ownership: "Private" },
  { name: "Crawford University, Igbesa", abbreviation: "CRAWFORD", state: "Ogun", city: "Igbesa", ownership: "Private" },
  { name: "Cross River University of Technology, Calabar", abbreviation: "CRUTECH", state: "Cross River", city: "Calabar", ownership: "State" },
  { name: "Delta State University, Abraka", abbreviation: "DELSU", state: "Delta", city: "Abraka", ownership: "State" },
  { name: "Dominican University, Ibadan", abbreviation: "DU", state: "Oyo", city: "Ibadan", ownership: "Private" },
  { name: "Ebonyi State University, Abakaliki", abbreviation: "EBSU", state: "Ebonyi", city: "Abakaliki", ownership: "State" },
  { name: "Edo University Iyamho, Uzairue", abbreviation: "EDSU", state: "Edo", city: "Uzairue", ownership: "State" },
  { name: "Ekiti State University, Ado Ekiti", abbreviation: "EKSU", state: "Ekiti", city: "Ado Ekiti", ownership: "State" },
  { name: "Elizade University, Ilara-Mokin", abbreviation: "ELIZADE", state: "Ondo", city: "Ilara-Mokin", ownership: "Private" },
  { name: "Enugu State University of Science and Technology", abbreviation: "ESUT", state: "Enugu", city: "Enugu", ownership: "State" },
  { name: "Federal University of Agriculture, Abeokuta", abbreviation: "FUNAAB", state: "Ogun", city: "Abeokuta", ownership: "Federal" },
  { name: "Federal University of Petroleum Resources, Effurun", abbreviation: "FUPRE", state: "Delta", city: "Effurun", ownership: "Federal" },
  { name: "Federal University of Technology, Akure", abbreviation: "FUTA", state: "Ondo", city: "Akure", ownership: "Federal" },
  { name: "Federal University of Technology, Minna", abbreviation: "FUTMINNA", state: "Niger", city: "Minna", ownership: "Federal" },
  { name: "Federal University of Technology, Owerri", abbreviation: "FUTO", state: "Imo", city: "Owerri", ownership: "Federal" },
  { name: "Federal University, Birnin Kebbi", abbreviation: "FUBK", state: "Kebbi", city: "Birnin Kebbi", ownership: "Federal" },
  { name: "Federal University, Dutse", abbreviation: "FUD", state: "Jigawa", city: "Dutse", ownership: "Federal" },
  { name: "Federal University, Dutsin-Ma", abbreviation: "FUDMA", state: "Katsina", city: "Dutsin-Ma", ownership: "Federal" },
  { name: "Federal University, Gashua", abbreviation: "FUGASHUA", state: "Yobe", city: "Gashua", ownership: "Federal" },
  { name: "Federal University, Gusau", abbreviation: "FUGUS", state: "Zamfara", city: "Gusau", ownership: "Federal" },
  { name: "Federal University, Kashere", abbreviation: "FUKASHERE", state: "Gombe", city: "Kashere", ownership: "Federal" },
  { name: "Federal University, Lafia", abbreviation: "FULAFIA", state: "Nasarawa", city: "Lafia", ownership: "Federal" },
  { name: "Federal University, Lokoja", abbreviation: "FULOKOJA", state: "Kogi", city: "Lokoja", ownership: "Federal" },
  { name: "Federal University, Otuoke", abbreviation: "FUOTUOKE", state: "Bayelsa", city: "Otuoke", ownership: "Federal" },
  { name: "Federal University, Oye-Ekiti", abbreviation: "FUOYE", state: "Ekiti", city: "Oye-Ekiti", ownership: "Federal" },
  { name: "Federal University, Wukari", abbreviation: "FUWUKARI", state: "Taraba", city: "Wukari", ownership: "Federal" },
  { name: "Federal University, Yobe", abbreviation: "FUYO", state: "Yobe", ownership: "Federal" },
  { name: "Federal University, Zaria", abbreviation: "FUZ", state: "Kaduna", city: "Zaria", ownership: "Federal" },
  { name: "Gombe State University, Gombe", abbreviation: "GSU", state: "Gombe", city: "Gombe", ownership: "State" },
  { name: "Gregory University, Uturu", abbreviation: "GREGORY", state: "Abia", city: "Uturu", ownership: "Private" },
  { name: "Hallmark University, Ijebu-Itele", abbreviation: "HALLMARK", state: "Ogun", city: "Ijebu-Itele", ownership: "Private" },
  { name: "Hezekiah University, Umudi", abbreviation: "HEZEKIAH", state: "Imo", city: "Umudi", ownership: "Private" },
  { name: "Ibrahim Badamasi Babangida University, Lapai", abbreviation: "IBBU", state: "Niger", city: "Lapai", ownership: "State" },
  { name: "Igbinedion University, Okada", abbreviation: "IUO", state: "Edo", city: "Okada", ownership: "Private" },
  { name: "Ignatius Ajuru University of Education, Rumuolumeni", abbreviation: "IAUE", state: "Rivers", city: "Rumuolumeni", ownership: "State" },
  { name: "Imo State University, Owerri", abbreviation: "IMSU", state: "Imo", city: "Owerri", ownership: "State" },
  { name: "Joseph Ayo Babalola University, Ikeji-Arakeji", abbreviation: "JABU", state: "Osun", city: "Ikeji-Arakeji", ownership: "Private" },
  { name: "Kaduna State University, Kaduna", abbreviation: "KASU", state: "Kaduna", city: "Kaduna", ownership: "State" },
  { name: "Kano University of Science and Technology, Wudil", abbreviation: "KUST", state: "Kano", city: "Wudil", ownership: "State" },
  { name: "Kebbi State University of Science and Technology, Aliero", abbreviation: "KSUSTA", state: "Kebbi", city: "Aliero", ownership: "State" },
  { name: "Kings University, Ode Omu", abbreviation: "KINGSUNI", state: "Osun", city: "Ode Omu", ownership: "Private" },
  { name: "Kogi State University, Anyigba", abbreviation: "KSU", state: "Kogi", city: "Anyigba", ownership: "State" },
  { name: "Kwara State University, Ilorin", abbreviation: "KWASU", state: "Kwara", city: "Ilorin", ownership: "State" },
  { name: "Kwararafa University, Wukari", abbreviation: "KWARARAFA", state: "Taraba", city: "Wukari", ownership: "Private" },
  { name: "Lagos State University, Ojo", abbreviation: "LASU", state: "Lagos", city: "Ojo", ownership: "State" },
  { name: "Landmark University, Omu-Aran", abbreviation: "LANDMARK", state: "Kwara", city: "Omu-Aran", ownership: "Private" },
  { name: "Lead City University, Ibadan", abbreviation: "LCU", state: "Oyo", city: "Ibadan", ownership: "Private" },
  { name: "Legacy University, Okija", abbreviation: "LEGACY", state: "Anambra", city: "Okija", ownership: "Private" },
  { name: "Madonna University, Okija", abbreviation: "MADONNA", state: "Anambra", city: "Okija", ownership: "Private" },
  { name: "Mcpherson University, Seriki Sotayo", abbreviation: "MCU", state: "Ogun", city: "Seriki Sotayo", ownership: "Private" },
  { name: "Michael and Cecilia Ibru University, Agbarha-Otor", abbreviation: "MCIBRU", state: "Delta", city: "Agbarha-Otor", ownership: "Private" },
  { name: "Michael Okpara University of Agriculture, Umudike", abbreviation: "MOUAU", state: "Abia", city: "Umudike", ownership: "Federal" },
  { name: "Modibbo Adama University of Technology, Yola", abbreviation: "MAUTECH", state: "Adamawa", city: "Yola", ownership: "Federal" },
  { name: "Mountain Top University, Makogi Oba", abbreviation: "MTU", state: "Ogun", city: "Makogi Oba", ownership: "Private" },
  { name: "Nasarawa State University, Keffi", abbreviation: "NSUK", state: "Nasarawa", city: "Keffi", ownership: "State" },
  { name: "National Open University of Nigeria, Lagos", abbreviation: "NOUN", state: "Lagos", city: "Lagos", ownership: "Federal" },
  { name: "Niger Delta University, Wilberforce Island", abbreviation: "NDU", state: "Bayelsa", city: "Wilberforce Island", ownership: "State" },
  { name: "Nigerian Defence Academy, Kaduna", abbreviation: "NDA", state: "Kaduna", city: "Kaduna", ownership: "Federal" },
  { name: "Nnamdi Azikiwe University, Awka", abbreviation: "UNIZIK", state: "Anambra", city: "Awka", ownership: "Federal" },
  { name: "Northwest University, Kano", abbreviation: "NWU", state: "Kano", city: "Kano", ownership: "Private" },
  { name: "Novena University, Ogume", abbreviation: "NOVENA", state: "Delta", city: "Ogume", ownership: "Private" },
  { name: "Nuhu Bamalli Polytechnic, Zaria", abbreviation: "NUBAPOLY", state: "Kaduna", city: "Zaria", ownership: "Federal" },
  { name: "Obafemi Awolowo University, Ile-Ife", abbreviation: "OAU", state: "Osun", city: "Ile-Ife", ownership: "Federal" },
  { name: "Obong University, Obong Ntak", abbreviation: "OBONG", state: "Akwa Ibom", city: "Obong Ntak", ownership: "Private" },
  { name: "Oduduwa University, Ile-Ife", abbreviation: "ODUDUWA", state: "Osun", city: "Ile-Ife", ownership: "Private" },
  { name: "Olabisi Onabanjo University, Ago Iwoye", abbreviation: "OOU", state: "Ogun", city: "Ago Iwoye", ownership: "State" },
  { name: "Ondo State University of Science and Technology, Okitipupa", abbreviation: "OSUSTECH", state: "Ondo", city: "Okitipupa", ownership: "State" },
  { name: "Osun State University, Osogbo", abbreviation: "UNIOSUN", state: "Osun", city: "Osogbo", ownership: "State" },
  { name: "Oyo State Technical University, Ibadan", abbreviation: "OYOTECH", state: "Oyo", city: "Ibadan", ownership: "State" },
  { name: "Pan-Atlantic University, Lagos", abbreviation: "PAU", state: "Lagos", city: "Lagos", ownership: "Private" },
  { name: "Paul University, Awka", abbreviation: "PAUL", state: "Anambra", city: "Awka", ownership: "Private" },
  { name: "Plateau State University, Bokkos", abbreviation: "PLASU", state: "Plateau", city: "Bokkos", ownership: "State" },
  { name: "Redeemer's University, Ede", abbreviation: "RUN", state: "Osun", city: "Ede", ownership: "Private" },
  { name: "Renaissance University, Enugu", abbreviation: "RENAISSANCE", state: "Enugu", city: "Enugu", ownership: "Private" },
  { name: "Rhema University, Aba", abbreviation: "RHEMA", state: "Abia", city: "Aba", ownership: "Private" },
  { name: "Ritman University, Ikot Ekpene", abbreviation: "RITMAN", state: "Akwa Ibom", city: "Ikot Ekpene", ownership: "Private" },
  { name: "Rivers State University, Port Harcourt", abbreviation: "RSU", state: "Rivers", city: "Port Harcourt", ownership: "State" },
  { name: "Salem University, Lokoja", abbreviation: "SALEM", state: "Kogi", city: "Lokoja", ownership: "Private" },
  { name: "Samuel Adegboyega University, Ogwa", abbreviation: "SAU", state: "Edo", city: "Ogwa", ownership: "Private" },
  { name: "Sokoto State University, Sokoto", abbreviation: "SSU", state: "Sokoto", city: "Sokoto", ownership: "State" },
  { name: "Southwestern University, Okun Owa", abbreviation: "SWU", state: "Ogun", city: "Okun Owa", ownership: "Private" },
  { name: "Sule Lamido University, Kafin Hausa", abbreviation: "SLU", state: "Jigawa", city: "Kafin Hausa", ownership: "State" },
  { name: "Summit University, Offa", abbreviation: "SUMMITUNI", state: "Kwara", city: "Offa", ownership: "Private" },
  { name: "Tai Solarin University of Education, Ijebu-Ode", abbreviation: "TASUED", state: "Ogun", city: "Ijebu-Ode", ownership: "State" },
  { name: "Taraba State University, Jalingo", abbreviation: "TSUJ", state: "Taraba", city: "Jalingo", ownership: "State" },
  { name: "The Technical University, Ibadan", abbreviation: "TECH-U", state: "Oyo", city: "Ibadan", ownership: "State" },
  { name: "Umaru Musa Yar'adua University, Katsina", abbreviation: "UMYU", state: "Katsina", city: "Katsina", ownership: "State" },
  { name: "University of Abuja, Abuja", abbreviation: "UNIABUJA", state: "Federal Capital Territory", city: "Abuja", ownership: "Federal" },
  { name: "University of Agriculture, Makurdi", abbreviation: "UAM", state: "Benue", city: "Makurdi", ownership: "Federal" },
  { name: "University of Benin, Benin City", abbreviation: "UNIBEN", state: "Edo", city: "Benin City", ownership: "Federal" },
  { name: "University of Calabar, Calabar", abbreviation: "UNICAL", state: "Cross River", city: "Calabar", ownership: "Federal" },
  { name: "University of Ibadan, Ibadan", abbreviation: "UI", state: "Oyo", city: "Ibadan", ownership: "Federal" },
  { name: "University of Ilorin, Ilorin", abbreviation: "UNILORIN", state: "Kwara", city: "Ilorin", ownership: "Federal" },
  { name: "University of Jos, Jos", abbreviation: "UNIJOS", state: "Plateau", city: "Jos", ownership: "Federal" },
  { name: "University of Lagos, Lagos", abbreviation: "UNILAG", state: "Lagos", city: "Lagos", ownership: "Federal" },
  { name: "University of Maiduguri, Maiduguri", abbreviation: "UNIMAID", state: "Borno", city: "Maiduguri", ownership: "Federal" },
  { name: "University of Medical Sciences, Ondo", abbreviation: "UNIMED", state: "Ondo", city: "Ondo", ownership: "State" },
  { name: "University of Mkar, Gboko", abbreviation: "UNIMKAR", state: "Benue", city: "Gboko", ownership: "Private" },
  { name: "University of Nigeria, Nsukka", abbreviation: "UNN", state: "Enugu", city: "Nsukka", ownership: "Federal" },
  { name: "University of Port Harcourt, Port Harcourt", abbreviation: "UNIPORT", state: "Rivers", city: "Port Harcourt", ownership: "Federal" },
  { name: "University of Uyo, Uyo", abbreviation: "UNIUYO", state: "Akwa Ibom", city: "Uyo", ownership: "Federal" },
  { name: "Usmanu Danfodiyo University, Sokoto", abbreviation: "UDUSOK", state: "Sokoto", city: "Sokoto", ownership: "Federal" },
  { name: "Veritas University, Abuja", abbreviation: "VERITAS", state: "Federal Capital Territory", city: "Abuja", ownership: "Private" },
  { name: "Wellspring University, Benin City", abbreviation: "WELLSPRING", state: "Edo", city: "Benin City", ownership: "Private" },
  { name: "Wesley University of Science and Technology, Ondo", abbreviation: "WUSTO", state: "Ondo", city: "Ondo", ownership: "Private" },
  { name: "Western Delta University, Oghara", abbreviation: "WDU", state: "Delta", city: "Oghara", ownership: "Private" },
  { name: "Yobe State University, Damaturu", abbreviation: "YSU", state: "Yobe", city: "Damaturu", ownership: "State" },
  { name: "Yusuf Maitama Sule University, Kano", abbreviation: "YUMSUK", state: "Kano", city: "Kano", ownership: "State" },
];

function inferType(name: string): UniversityType {
  if (name.includes("University of Technology")) return "University of Technology";
  if (name.includes("University of Agriculture")) return "University of Agriculture";
  if (name.includes("University of Education")) return "University of Education";
  if (name.includes("Polytechnic")) return "Polytechnic";
  if (name.includes("College of Education")) return "College of Education";
  return "University";
}

// Fallback only — used when an entry has no explicit ownership. Name-based
// inference misclassifies federal schools like "University of Lagos".
function inferOwnership(name: string, state: string): UniversityOwnership {
  if (name.startsWith("Federal ")) return "Federal";
  if (name.includes(" State ") || name.startsWith(state)) return "State";
  return "Private";
}

/** Fails fast on duplicate abbreviations or names inside the seed list. */
function assertNoDuplicates(entries: SeedEntry[]) {
  const seen = new Map<string, string>();
  for (const e of entries) {
    for (const key of [`abbr:${e.abbreviation.toUpperCase()}`, `name:${e.name}`]) {
      if (seen.has(key)) {
        throw new Error(`Duplicate seed entry ${key} (${seen.get(key)} / ${e.name})`);
      }
      seen.set(key, e.name);
    }
  }
}

async function main() {
  assertNoDuplicates(UNIVERSITIES);

  const University = await getUniversityModel();
  // Build the unique indexes before inserting so they guard this run too.
  await University.createIndexes();

  const now = new Date();
  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of UNIVERSITIES) {
    const abbreviation = entry.abbreviation.toUpperCase();
    const exists = await University.exists({ abbreviation });
    if (exists) {
      console.log(`→ skipped ${abbreviation} (exists)`);
      skipped++;
      continue;
    }

    try {
      await University.create({
        name: entry.name,
        abbreviation,
        usid: generateUsid(abbreviation),
        slug: generateSlug(entry.name),
        type: inferType(entry.name),
        ownership: entry.ownership ?? inferOwnership(entry.name, entry.state),
        state: entry.state,
        city: entry.city,
        country: "Nigeria",
        isActive: true,
        verificationStatus: "unverified",
        seededAt: now,
        seedSource: SEED_SOURCE,
      });
      console.log(`✓ inserted ${abbreviation}`);
      inserted++;
    } catch (error) {
      console.error(`✗ failed ${abbreviation}:`, (error as Error).message);
      failed++;
    }
  }

  console.log(
    `\nInserted: ${inserted}, Skipped: ${skipped}, Failed: ${failed}, Total: ${UNIVERSITIES.length}`,
  );
  return failed;
}

main()
  .then(async (failed) => {
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  });
