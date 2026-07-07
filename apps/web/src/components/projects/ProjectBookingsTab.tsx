"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@st-manager/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useProjectBookings } from "@/hooks/useBookings";
import { useStudios } from "@/hooks/useStudios";
import { BOOKING_STATUS_LABELS } from "@/lib/bookings/constants";
import { getBookingSlotLabel } from "@/lib/bookings/slots";

interface ProjectBookingsTabProps {
  projectId: string;
}

export function ProjectBookingsTab({ projectId }: ProjectBookingsTabProps) {
  const router = useRouter();
  const bookings = useProjectBookings(projectId);
  const studios = useStudios();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          All bookings linked to this project appear here automatically.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/bookings">Open Calendar</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet for this project.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Studio</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Booking For</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => {
                  const studio = studios.find((entry) => entry.id === booking.studioId);

                  return (
                    <TableRow
                      key={booking.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/bookings/${booking.id}`)}
                    >
                      <TableCell>
                        <span className="flex items-center gap-2">
                          {studio ? (
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: studio.color }}
                              aria-hidden
                            />
                          ) : null}
                          {studio?.name ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(`${booking.date}T12:00:00`).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{getBookingSlotLabel(booking.slotId)}</TableCell>
                      <TableCell className="font-medium">{booking.bookingFor}</TableCell>
                      <TableCell>
                        <Badge variant={booking.status === "cancelled" ? "secondary" : "success"}>
                          {BOOKING_STATUS_LABELS[booking.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[16rem] truncate text-muted-foreground">
                        {booking.notes || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
