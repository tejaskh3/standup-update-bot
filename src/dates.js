import { DateTime } from "luxon";

/**
 * Get today's date in YYYY-MM-DD in the given timezone.
 */
export function todayInTz(timezone) {
  return DateTime.now().setZone(timezone).toFormat("yyyy-MM-dd");
}

/**
 * Get the last weekday before today.
 * Monday -> Friday, Tuesday -> Monday, etc.
 */
export function lastWeekday(timezone) {
  const dt = DateTime.now().setZone(timezone);
  let d = dt;
  let day = d.weekday; // 1=Mon, 7=Sun
  if (day === 1) {
    d = d.minus({ days: 3 }); // Monday -> Friday
  } else if (day === 7) {
    d = d.minus({ days: 2 }); // Sunday -> Friday
  } else {
    d = d.minus({ days: 1 }); // Tue-Fri -> previous day
  }
  return d.toFormat("yyyy-MM-dd");
}

/**
 * Is today Saturday or Sunday?
 */
export function isWeekend(timezone) {
  const dt = DateTime.now().setZone(timezone);
  return dt.weekday === 6 || dt.weekday === 7;
}

/**
 * Is today Mon-Fri?
 */
export function isWeekday(timezone) {
  return !isWeekend(timezone);
}

/**
 * Parse a time string "HH:mm" and return today's DateTime at that time in the zone.
 */
export function parseTimeToday(timeStr, timezone) {
  const [h, m] = timeStr.split(":").map(Number);
  return DateTime.now().setZone(timezone).set({ hour: h, minute: m, second: 0, millisecond: 0 });
}

/**
 * Parse time and return cutoff DateTime for "on-time" (before 10:50) vs "late" (10:50-11) vs "after" (11+).
 * Returns { onTimeCutoff, postCutoff }.
 */
export function getCutoffs(config) {
  const tz = config.timezone;
  const today = DateTime.now().setZone(tz);
  const [onH, onM] = config.onTimeCutoff.split(":").map(Number);
  const [postH, postM] = config.postTime.split(":").map(Number);
  const onTimeCutoff = today.set({ hour: onH, minute: onM, second: 0, millisecond: 0 });
  const postCutoff = today.set({ hour: postH, minute: postM, second: 0, millisecond: 0 });
  return { onTimeCutoff, postCutoff };
}
