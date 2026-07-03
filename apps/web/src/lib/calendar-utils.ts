export function startOfWeek(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() - value.getDay());
  return value;
}

export function addDays(date: Date, days: number): Date {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function startOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

export function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

export function buildNewBookingHref(studioId: string, day: Date): string {
  const startAt = new Date(day);
  startAt.setHours(9, 0, 0, 0);
  const endAt = new Date(startAt);
  endAt.setHours(10, 0, 0, 0);

  const params = new URLSearchParams({
    studioId,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
  });

  return `/calendar/new?${params.toString()}`;
}

export function formatTimeRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${time.format(start)} – ${time.format(end)}`;
}
