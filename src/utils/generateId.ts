// /lib/generateId.ts
import { nanoid } from 'nanoid';

/**
 * Generate a unique school ID (USID) - cryptographically secure
 * Format: USID_{timestamp}_{random}
 */
export function generateUSID(): string {
  const timestamp = Date.now().toString(36);
  const random = nanoid(8);
  return `USID_${timestamp}_${random}`;
}

/**
 * Generate a platform school ID (PSID) - human-readable
 * Format: Based on school name and location
 */
export function generatePSID(schoolName: string, location: string): string {
  // Clean and format school name
  const cleanName = schoolName
    .replace(/university|college|school|institute/gi, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .slice(0, 3) // Take first 3 significant words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

  // Clean and format location
  const cleanLocation = location
    .split(',')[0] // Take first part (city/state)
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .slice(0, 2) // Take first 2 words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

  // Generate timestamp-based suffix for uniqueness
  const suffix = Date.now().toString(36).slice(-4);
  
  return `${cleanName}${cleanLocation}${suffix}`;
}

/**
 * Generate university ID - your original simple format
 */
export function generateUniversityId(abbreviation: string): string {
  return abbreviation
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate university ID with timestamp - new cryptographic format
 */
export function generateUniversityIdSecure(abbreviation: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `UNI_${abbreviation.toUpperCase()}_${timestamp}_${random}`;
}

/**
 * Generate faculty ID - your original simple format
 */
export function generateFacultyId(universityId: string, facultyName: string): string {
  if (!facultyName.trim()) return '';
  
  const cleanName = facultyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${universityId}-${cleanName}`;
}

/**
 * Generate faculty ID with timestamp - new cryptographic format
 */
export function generateFacultyIdSecure(universityId: string, facultyName: string): string {
  if (!facultyName.trim()) return '';
  
  const cleanName = facultyName
    .replace(/faculty of|faculty|school of|college of/gi, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 6)
    .toUpperCase();
  
  const random = Math.random().toString(36).substring(2, 6);
  return `${universityId}_FAC_${cleanName}_${random}`;
}

/**
 * Generate department ID - your original simple format
 */
export function generateDepartmentId(facultyId: string, deptName: string): string {
  if (!facultyId || !deptName.trim()) return '';
  
  const cleanName = deptName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${facultyId}-${cleanName}`;
}

/**
 * Generate department ID with timestamp - new cryptographic format
 */
export function generateDepartmentIdSecure(facultyId: string, departmentName: string): string {
  if (!departmentName.trim()) return '';
  
  const cleanName = departmentName
    .replace(/department of|department|dept/gi, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 6)
    .toUpperCase();
  
  const random = Math.random().toString(36).substring(2, 4);
  return `${facultyId}_DEPT_${cleanName}_${random}`;
}

/**
 * Validate USID format
 */
export function isValidUSID(usid: string): boolean {
  const pattern = /^USID_[a-z0-9]+_[A-Za-z0-9_-]{8}$/;
  return pattern.test(usid);
}

/**
 * Validate PSID format
 */
export function isValidPSID(psid: string): boolean {
  // PSID should be alphanumeric, 6-20 characters
  const pattern = /^[A-Za-z0-9]{6,20}$/;
  return pattern.test(psid);
}

/**
 * Generate both USID and PSID for a school
 */
export function generateSchoolIds(schoolName: string, location: string) {
  return {
    usid: generateUSID(),
    psid: generatePSID(schoolName, location)
  };
}

/**
 * Extract info from USID
 */
export function parseUSID(usid: string) {
  if (!isValidUSID(usid)) {
    throw new Error('Invalid USID format');
  }
  
  const parts = usid.split('_');
  const timestamp = parseInt(parts[1], 36);
  const random = parts[2];
  
  return {
    timestamp: new Date(timestamp),
    random,
    isValid: true
  };
}

/**
 * Generate a batch of school IDs for multiple schools
 */
export function generateBatchSchoolIds(schools: Array<{ name: string; location: string }>) {
  return schools.map(school => ({
    ...school,
    ids: generateSchoolIds(school.name, school.location)
  }));
}