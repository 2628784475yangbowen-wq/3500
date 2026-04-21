export interface DayOption {
  value: number;
  label: string;
}

export const DAYS: DayOption[];

export function dayLabel(dayOfWeek: number | string): string;

export function parseSkills(skillsText: string): string[];

export function friendlyError(error: unknown, fallback: string): string;
