"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@st-manager/ui";
import Link from "next/link";

import { useProjectBookings } from "@/hooks/useBookings";
import { useStudios } from "@/hooks/useStudios";
import { BOOKING_STATUS_LABELS } from "@/lib/bookings/constants";
import { getBookingSlotLabel } from "@/lib/bookings/slots";

interface ProjectBookingsTabProps {
  projectId: string;
}

export function ProjectBookingsTab({ projectId }: ProjectBookingsTabProps) {
  const bookings = useProjectBookings(projectId);
  const studios = useStudios();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          All bookings linked to this project appear here automatically.
        </p>
        <Button asChild size="sm">
          <Link href={`/bookings/new?projectId=${projectId}`}>Add Booking</Link>
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
                  <TableHead>Booking Date</TableHead>
                  <TableHead>Studio</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Booking Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      {new Date(`${booking.date}T12:00:00`).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {studios.find((studio) => studio.id === booking.studioId)?.name ?? "—"}
                    </TableCell>
                    <TableCell>{getBookingSlotLabel(booking.slotId)}</TableCell>
                    <TableCell>{booking.bookingFor}</TableCell>
                    <TableCell>
                      <Badge variant={booking.status === "confirmed" ? "success" : "secondary"}>
                        {BOOKING_STATUS_LABELS[booking.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/bookings/${booking.id}`}>Open Booking</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
