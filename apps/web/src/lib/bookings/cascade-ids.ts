import { updateProject } from "@/lib/projects/storage";
import { getProjectsSnapshot } from "@/lib/projects/store";

/**
 * Rewrites project.bookingIds when an offline booking id is remapped to a server id.
 */
export function remapLocalBookingId(oldBookingId: string, newBookingId: string): void {
  if (typeof window === "undefined" || oldBookingId === newBookingId) {
    return;
  }

  for (const project of getProjectsSnapshot()) {
    if (!project.bookingIds.includes(oldBookingId)) {
      continue;
    }
    const bookingIds = project.bookingIds.map((id) => (id === oldBookingId ? newBookingId : id));
    const unique = [...new Set(bookingIds)];
    updateProject(project.id, { bookingIds: unique });
  }
}
