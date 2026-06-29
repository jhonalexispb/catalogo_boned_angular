export type DayPeriod = 'morning' | 'afternoon' | 'night';

export interface GreetingInfo {
  period: DayPeriod;
  salutation: string;
}

/**
 * Saludo según la hora local. Los periodos coinciden con los de
 * `resolveBackgroundUrl` (mañana <12h, tarde 12-18h, noche >=18h).
 */
export function getGreeting(date: Date = new Date()): GreetingInfo {
  const hour = date.getHours();

  if (hour < 12) return { period: 'morning', salutation: 'Buenos días' };
  if (hour < 18) return { period: 'afternoon', salutation: 'Buenas tardes' };
  return { period: 'night', salutation: 'Buenas noches' };
}
