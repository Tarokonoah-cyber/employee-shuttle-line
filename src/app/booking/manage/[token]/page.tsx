import { BookingManagementPanel } from "@/components/booking/booking-management-panel";

export default async function ManageBookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="min-h-screen bg-[#f5f6f3] px-4 py-6 sm:py-8">
      <BookingManagementPanel token={token} />
    </main>
  );
}
