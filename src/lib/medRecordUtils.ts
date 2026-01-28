import { differenceInDays, differenceInMonths, differenceInYears, addDays, addMonths, addYears, format, isAfter, isBefore, startOfDay } from "date-fns";

export type RecordStatus = "active" | "expiring-soon" | "expired";

export interface MedRecordWithStatus {
  id: string;
  dog_id: string;
  owner_id: string;
  name: string;
  record_type: "vaccine" | "medication";
  date_given: string;
  duration_value: number;
  duration_unit: "days" | "months" | "years";
  expires_on: string;
  notes: string | null;
  created_at: string;
  status: RecordStatus;
  countdown: string;
  daysUntilExpiry: number;
}

export function calculateExpirationDate(
  dateGiven: Date,
  durationValue: number,
  durationUnit: "days" | "months" | "years"
): Date {
  switch (durationUnit) {
    case "days":
      return addDays(dateGiven, durationValue);
    case "months":
      return addMonths(dateGiven, durationValue);
    case "years":
      return addYears(dateGiven, durationValue);
    default:
      return dateGiven;
  }
}

export function getRecordStatus(expiresOn: Date): RecordStatus {
  const today = startOfDay(new Date());
  const expiryDate = startOfDay(expiresOn);
  const daysUntil = differenceInDays(expiryDate, today);

  if (daysUntil < 0) {
    return "expired";
  } else if (daysUntil <= 30) {
    return "expiring-soon";
  }
  return "active";
}

export function getCountdownText(expiresOn: Date): string {
  const today = startOfDay(new Date());
  const expiryDate = startOfDay(expiresOn);
  const totalDays = differenceInDays(expiryDate, today);

  if (totalDays < 0) {
    const daysAgo = Math.abs(totalDays);
    if (daysAgo === 1) return "Expired 1 day ago";
    if (daysAgo < 30) return `Expired ${daysAgo} days ago`;
    const monthsAgo = Math.floor(daysAgo / 30);
    if (monthsAgo === 1) return "Expired 1 month ago";
    return `Expired ${monthsAgo} months ago`;
  }

  if (totalDays === 0) return "Expires today";
  if (totalDays === 1) return "Expires in 1 day";

  const years = differenceInYears(expiryDate, today);
  const afterYears = addYears(today, years);
  const months = differenceInMonths(expiryDate, afterYears);
  const afterMonths = addMonths(afterYears, months);
  const days = differenceInDays(expiryDate, afterMonths);

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? "s" : ""}`);
  if (days > 0 && years === 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);

  return `Expires in ${parts.join(" ")}`;
}

export function getDaysUntilExpiry(expiresOn: Date): number {
  const today = startOfDay(new Date());
  const expiryDate = startOfDay(expiresOn);
  return differenceInDays(expiryDate, today);
}

export function enrichRecordWithStatus(record: {
  id: string;
  dog_id: string;
  owner_id: string;
  name: string;
  record_type: "vaccine" | "medication";
  date_given: string;
  duration_value: number;
  duration_unit: "days" | "months" | "years";
  expires_on: string;
  notes: string | null;
  created_at: string;
}): MedRecordWithStatus {
  const expiryDate = new Date(record.expires_on);
  return {
    ...record,
    status: getRecordStatus(expiryDate),
    countdown: getCountdownText(expiryDate),
    daysUntilExpiry: getDaysUntilExpiry(expiryDate),
  };
}
