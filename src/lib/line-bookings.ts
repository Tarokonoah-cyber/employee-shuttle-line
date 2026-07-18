import { BusinessError, cancelBooking } from "./booking-service";
import { toManagedView } from "./booking-management";
import { getPrisma } from "./prisma";

export async function getOwnLineBookings(profileId: string) {
  const bookings = await getPrisma().booking.findMany({
    where: { lineProfileId: profileId },
    include: { schedule: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return Promise.all(bookings.map(async (booking) => ({ id: booking.id, ...(await toManagedView(booking)) })));
}

export async function getOwnLineBooking(profileId: string, bookingId: string) {
  const booking = await getPrisma().booking.findFirst({
    where: { id: bookingId, lineProfileId: profileId },
    include: { schedule: true },
  });
  return booking ? { id: booking.id, ...(await toManagedView(booking)) } : null;
}

export async function cancelOwnLineBooking(profileId: string, bookingId: string) {
  await cancelBooking(bookingId, {
    source: "employee",
    enforceDeadline: true,
    expectedLineProfileId: profileId,
  });
  const booking = await getOwnLineBooking(profileId, bookingId);
  if (!booking) throw new BusinessError("找不到你的報名", 404);
  return booking;
}
