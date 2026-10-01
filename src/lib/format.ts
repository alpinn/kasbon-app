const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const relativeAuto = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });
const relativeAlways = new Intl.RelativeTimeFormat("id-ID", { numeric: "always" });

const relative = (value: number, unit: Intl.RelativeTimeFormatUnit) =>
  (unit === "day" && Math.abs(value) <= 1 ? relativeAuto : relativeAlways)
    .format(value, unit)
    .replace(" yang lalu", " lalu");

export function formatRupiah(amount: number) {
  return rupiah.format(amount).replace(/ /g, " ");
}

const dayNumber = (date: Date) =>
  Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );

const parseDate = (value: string) => {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
};

export function formatRelativeDate(dateString: string, now: Date = new Date()) {
  const days = dayNumber(parseDate(dateString)) - dayNumber(now);
  if (Number.isNaN(days)) return "";

  const abs = Math.abs(days);
  if (abs < 7) return relative(days, "day");
  if (abs < 30) return relative(Math.trunc(days / 7), "week");
  if (abs < 365) return relative(Math.trunc(days / 30), "month");
  return relative(Math.trunc(days / 365), "year");
}

export const formatFullDate = (value: string) =>
  parseDate(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
