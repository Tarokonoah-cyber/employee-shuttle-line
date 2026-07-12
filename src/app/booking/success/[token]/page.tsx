import { BookingSuccessClient } from "@/components/booking/booking-success-client";

export default async function BookingSuccessTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="min-h-screen bg-white px-0 py-0 sm:bg-[#f5f6f3] sm:px-4 sm:py-8">
      <BookingSuccessClient token={token} />
    </main>
  );
}
