import { getPrisma } from "./prisma";

export async function queueLineNotification(input: {
  bookingId?: string;
  target?: string;
  message: string;
}) {
  const prisma = getPrisma();

  return prisma.notificationLog.create({
    data: {
      bookingId: input.bookingId,
      channel: "LINE",
      target: input.target,
      message: input.message,
      status: "skipped",
      errorMessage: "LINE Messaging API is not connected in this phase.",
    },
  });
}
