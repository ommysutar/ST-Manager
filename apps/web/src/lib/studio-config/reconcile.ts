import { startBookingSlotDefinitionsApiSync } from "@/lib/bookings/slots/reconcile";
import { startStudioServicesApiSync } from "@/lib/services/reconcile";
import { startStudioRoomsApiSync } from "@/lib/studios/reconcile";
import { startStudioSettingsApiSync } from "@/lib/studio-settings/reconcile";

/** Starts all studio configuration entity sync loops (services, rooms, slots, settings). */
export function startStudioConfigApiSync(): () => void {
  const stops = [
    startStudioServicesApiSync(),
    startStudioRoomsApiSync(),
    startBookingSlotDefinitionsApiSync(),
    startStudioSettingsApiSync(),
  ];

  return () => {
    for (const stop of stops) {
      stop();
    }
  };
}
