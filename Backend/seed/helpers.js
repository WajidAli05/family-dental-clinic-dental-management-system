import { nanoid } from "nanoid";

export const uid = () => nanoid(10);

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const randInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const randDateISO = (daysBack = 90) => {
  const d = new Date(Date.now() - randInt(0, daysBack) * 86400000);
  return d.toISOString().slice(0, 10);
};

export const randMonthISO = (monthsBack = 6) => {
  const d = new Date();
  d.setMonth(d.getMonth() - randInt(0, monthsBack));
  return d.toISOString().slice(0, 7);
};

export const makePublicId = (prefix, n) =>
  `${prefix}-${String(n).padStart(4, "0")}`;