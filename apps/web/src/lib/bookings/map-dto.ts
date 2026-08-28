import type {
  CreateProjectBookingDto,
  ProjectBookingResponseDto,
  UpdateProjectBookingDto,
} from "@st-manager/contracts";

import type { ProjectBooking } from "./types";

function nullToUndefined(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  return value;
}

export function dtoToProjectBooking(dto: ProjectBookingResponseDto): ProjectBooking {
  return {
    id: dto.id,
    projectId: dto.projectId,
    studioId: dto.roomStudioId,
    bookingFor: dto.bookingFor,
    notes: dto.notes ?? "",
    date: dto.date,
    slotId: dto.slotId,
    status: dto.status,
    clientName: dto.clientName,
    projectName: dto.projectName,
    projectNumber: dto.projectNumber,
    engineerId: dto.engineerId ?? null,
    sessionId: dto.sessionId ?? null,
    attendanceRecorded: dto.attendanceRecorded ?? false,
    equipmentIds: dto.equipmentIds ?? [],
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function projectBookingToCreateDto(
  booking: ProjectBooking,
  studioId: string,
): CreateProjectBookingDto {
  return {
    projectId: booking.projectId,
    roomStudioId: booking.studioId,
    clientId: null,
    bookingFor: booking.bookingFor,
    notes: booking.notes,
    date: booking.date,
    slotId: booking.slotId,
    status: booking.status,
    clientName: booking.clientName,
    projectName: booking.projectName,
    projectNumber: booking.projectNumber,
    engineerId: booking.engineerId ?? null,
    sessionId: booking.sessionId ?? null,
    attendanceRecorded: booking.attendanceRecorded ?? false,
    equipmentIds: booking.equipmentIds ?? [],
    ...(studioId ? {} : {}),
  };
}

export function projectBookingToResponseDto(
  booking: ProjectBooking,
  studioId: string,
): ProjectBookingResponseDto {
  return {
    id: booking.id,
    studioId,
    projectId: booking.projectId,
    roomStudioId: booking.studioId,
    clientId: null,
    bookingFor: booking.bookingFor,
    notes: booking.notes,
    date: booking.date,
    slotId: booking.slotId,
    status: booking.status,
    clientName: booking.clientName,
    projectName: booking.projectName,
    projectNumber: booking.projectNumber,
    engineerId: booking.engineerId ?? null,
    sessionId: booking.sessionId ?? null,
    attendanceRecorded: booking.attendanceRecorded ?? false,
    equipmentIds: booking.equipmentIds ?? [],
    deletedAt: null,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

export function projectBookingToUpdateDto(
  patch: Partial<Omit<ProjectBooking, "id" | "createdAt">>,
): UpdateProjectBookingDto {
  const dto: UpdateProjectBookingDto = {};

  if (patch.projectId !== undefined) dto.projectId = patch.projectId;
  if (patch.studioId !== undefined) dto.roomStudioId = patch.studioId;
  if (patch.bookingFor !== undefined) dto.bookingFor = patch.bookingFor;
  if (patch.notes !== undefined) dto.notes = patch.notes;
  if (patch.date !== undefined) dto.date = patch.date;
  if (patch.slotId !== undefined) dto.slotId = patch.slotId;
  if (patch.status !== undefined) dto.status = patch.status;
  if (patch.clientName !== undefined) dto.clientName = patch.clientName;
  if (patch.projectName !== undefined) dto.projectName = patch.projectName;
  if (patch.projectNumber !== undefined) dto.projectNumber = patch.projectNumber;
  if (patch.engineerId !== undefined) dto.engineerId = patch.engineerId ?? null;
  if (patch.sessionId !== undefined) dto.sessionId = patch.sessionId ?? null;
  if (patch.attendanceRecorded !== undefined) dto.attendanceRecorded = patch.attendanceRecorded;
  if (patch.equipmentIds !== undefined) dto.equipmentIds = patch.equipmentIds;

  return dto;
}

export { nullToUndefined };
