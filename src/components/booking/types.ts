export type Schedule = {
  id: string;
  serviceDate: string;
  routeName: string;
  departureTime: string;
  pickupPoint: string;
  capacity: number;
  registrationOpen: boolean;
  waitlistEnabled: boolean;
  note?: string | null;
  confirmedCount: number;
  waitlistCount: number;
  remainingCount: number;
  isFull: boolean;
  isOverbooked: boolean;
  cancelledAt?: string | null;
  registrationDeadline: string;
  isRegistrationClosedByTime: boolean;
};

export type EmployeeScheduleState = "open" | "near-full" | "full" | "closed" | "overbooked";

export function getEmployeeScheduleState(schedule: Schedule): EmployeeScheduleState {
  if (!schedule.registrationOpen) return "closed";
  if (schedule.isRegistrationClosedByTime) return "closed";
  if (schedule.isOverbooked) return "overbooked";
  if (schedule.isFull) return schedule.waitlistEnabled ? "full" : "closed";

  const occupancy = schedule.capacity > 0 ? schedule.confirmedCount / schedule.capacity : 0;
  if (schedule.remainingCount <= 2 || occupancy >= 0.85) return "near-full";
  return "open";
}

export function canRegisterSchedule(schedule: Schedule) {
  return schedule.registrationOpen && !schedule.isRegistrationClosedByTime && !schedule.cancelledAt && (!schedule.isFull || schedule.waitlistEnabled);
}
