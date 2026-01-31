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

export function getCountdownText(expiresOn: Date, t?: (key: string) => string): string {
  const today = startOfDay(new Date());
  const expiryDate = startOfDay(expiresOn);
  const totalDays = differenceInDays(expiryDate, today);

  // If no translation function provided, use English fallback
  const translate = t || ((key: string) => {
    const fallbacks: Record<string, string> = {
      "medications.expiredAgo": "Expired",
      "medications.day": "day",
      "medications.days": "days",
      "medications.month": "month",
      "medications.months": "months",
      "medications.year": "year",
      "medications.years": "years",
      "medications.ago": "ago",
      "medications.expiresToday": "Expires today",
      "medications.expiresIn": "Expires in",
    };
    return fallbacks[key] || key;
  });

  if (totalDays < 0) {
    const daysAgo = Math.abs(totalDays);
    if (daysAgo === 1) return `${translate("medications.expiredAgo")} 1 ${translate("medications.day")} ${translate("medications.ago")}`;
    if (daysAgo < 30) return `${translate("medications.expiredAgo")} ${daysAgo} ${translate("medications.days")} ${translate("medications.ago")}`;
    const monthsAgo = Math.floor(daysAgo / 30);
    if (monthsAgo === 1) return `${translate("medications.expiredAgo")} 1 ${translate("medications.month")} ${translate("medications.ago")}`;
    return `${translate("medications.expiredAgo")} ${monthsAgo} ${translate("medications.months")} ${translate("medications.ago")}`;
  }

  if (totalDays === 0) return translate("medications.expiresToday");
  if (totalDays === 1) return `${translate("medications.expiresIn")} 1 ${translate("medications.day")}`;

  const years = differenceInYears(expiryDate, today);
  const afterYears = addYears(today, years);
  const months = differenceInMonths(expiryDate, afterYears);
  const afterMonths = addMonths(afterYears, months);
  const days = differenceInDays(expiryDate, afterMonths);

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years > 1 ? translate("medications.years") : translate("medications.year")}`);
  if (months > 0) parts.push(`${months} ${months > 1 ? translate("medications.months") : translate("medications.month")}`);
  if (days > 0 && years === 0) parts.push(`${days} ${days > 1 ? translate("medications.days") : translate("medications.day")}`);

  return `${translate("medications.expiresIn")} ${parts.join(" ")}`;
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
