import { differenceInMonths, differenceInYears } from "date-fns";

/**
 * Calculate and format age from a date of birth
 * @param dateOfBirth - The date of birth as a Date object or ISO string
 * @returns Formatted age string (e.g., "2 years 3 months" or "8 months")
 */
export function calculateAge(dateOfBirth: Date | string | null | undefined): string {
  if (!dateOfBirth) return "";

  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  const now = new Date();

  if (isNaN(dob.getTime())) return "";

  const totalMonths = differenceInMonths(now, dob);
  const years = differenceInYears(now, dob);
  const months = totalMonths % 12;

  if (totalMonths < 1) {
    return "Less than 1 month";
  }

  if (years < 1) {
    return `${totalMonths} month${totalMonths !== 1 ? "s" : ""}`;
  }

  if (months === 0) {
    return `${years} year${years !== 1 ? "s" : ""}`;
  }

  return `${years} year${years !== 1 ? "s" : ""} ${months} month${months !== 1 ? "s" : ""}`;
}
