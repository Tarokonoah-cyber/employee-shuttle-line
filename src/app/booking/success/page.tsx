import { SuccessReceipt } from "@/components/booking/success-receipt";

type SearchValue = string | string[] | undefined;

function first(value: SearchValue) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchValue>>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-white px-0 py-0 sm:bg-[#f5f6f3] sm:px-4 sm:py-8">
      <SuccessReceipt
        status={first(params.status) || "confirmed"}
        bookingCode={first(params.booking_code)}
        date={first(params.date)}
        routeName={first(params.route)}
        departureTime={first(params.departure_time)}
        pickupPoint={first(params.pickup_point)}
      />
    </main>
  );
}
