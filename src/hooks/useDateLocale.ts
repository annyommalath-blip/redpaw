import { useTranslation } from "react-i18next";
import { Locale, enUS, th } from "date-fns/locale";

// Custom Lao locale (date-fns doesn't have built-in Lao support)
const lo: Locale = {
  ...enUS,
  code: "lo",
  formatDistance: (token: string, count: number) => {
    const formats: Record<string, string> = {
      lessThanXSeconds: `ໜ້ອຍກວ່າ ${count} ວິນາທີ`,
      xSeconds: `${count} ວິນາທີ`,
      halfAMinute: "ເຄິ່ງນາທີ",
      lessThanXMinutes: `ໜ້ອຍກວ່າ ${count} ນາທີ`,
      xMinutes: `${count} ນາທີ`,
      aboutXHours: `ປະມານ ${count} ຊົ່ວໂມງ`,
      xHours: `${count} ຊົ່ວໂມງ`,
      xDays: `${count} ມື້`,
      aboutXWeeks: `ປະມານ ${count} ອາທິດ`,
      xWeeks: `${count} ອາທິດ`,
      aboutXMonths: `ປະມານ ${count} ເດືອນ`,
      xMonths: `${count} ເດືອນ`,
      aboutXYears: `ປະມານ ${count} ປີ`,
      xYears: `${count} ປີ`,
      overXYears: `ຫຼາຍກວ່າ ${count} ປີ`,
      almostXYears: `ເກືອບ ${count} ປີ`,
    };
    return formats[token] || `${count}`;
  },
  formatRelative: () => "",
  localize: enUS.localize,
  match: enUS.match,
  options: { weekStartsOn: 0 },
};

// Custom Chinese (Simplified) locale
const zhHans: Locale = {
  ...enUS,
  code: "zh-Hans",
  formatDistance: (token: string, count: number) => {
    const formats: Record<string, string> = {
      lessThanXSeconds: `不到 ${count} 秒`,
      xSeconds: `${count} 秒`,
      halfAMinute: "半分钟",
      lessThanXMinutes: `不到 ${count} 分钟`,
      xMinutes: `${count} 分钟`,
      aboutXHours: `大约 ${count} 小时`,
      xHours: `${count} 小时`,
      xDays: `${count} 天`,
      aboutXWeeks: `大约 ${count} 周`,
      xWeeks: `${count} 周`,
      aboutXMonths: `大约 ${count} 个月`,
      xMonths: `${count} 个月`,
      aboutXYears: `大约 ${count} 年`,
      xYears: `${count} 年`,
      overXYears: `超过 ${count} 年`,
      almostXYears: `将近 ${count} 年`,
    };
    return formats[token] || `${count}`;
  },
  formatRelative: () => "",
  localize: enUS.localize,
  match: enUS.match,
  options: { weekStartsOn: 0 },
};

export function useDateLocale(): Locale {
  const { i18n } = useTranslation();
  
  const localeMap: Record<string, Locale> = {
    en: enUS,
    th: th,
    lo: lo,
    "zh-Hans": zhHans,
  };
  
  return localeMap[i18n.language] || enUS;
}
