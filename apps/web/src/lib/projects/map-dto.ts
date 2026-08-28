import type { CreateProjectDto, ProjectResponseDto, UpdateProjectDto } from "@st-manager/contracts";

import type { ProjectStatus, ProjectTask, StudioProject } from "./types";

function nullToUndefined(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  return value;
}

export function dtoToStudioProject(dto: ProjectResponseDto): StudioProject {
  return {
    id: dto.id,
    projectNumber: dto.projectNumber,
    source: dto.source,
    inquiryId: nullToUndefined(dto.inquiryId),
    clientId: nullToUndefined(dto.clientId),
    projectName: dto.projectName,
    clientName: dto.clientName,
    clientMobile: nullToUndefined(dto.clientMobile),
    clientEmail: nullToUndefined(dto.clientEmail),
    projectCategory: nullToUndefined(dto.projectCategory),
    status: dto.status as ProjectStatus,
    assignedEngineer: dto.assignedEngineer,
    selectedServiceIds: dto.selectedServiceIds ?? [],
    planId: nullToUndefined(dto.planId),
    quotation: dto.quotation as StudioProject["quotation"],
    advanceReceived: dto.advanceReceived,
    remainingBalance: dto.remainingBalance,
    grandTotal: dto.grandTotal,
    tasks: (dto.tasks ?? []) as ProjectTask[],
    files: (dto.files ?? []) as StudioProject["files"],
    links: (dto.links ?? []) as StudioProject["links"],
    expenses: (dto.expenses ?? []) as StudioProject["expenses"],
    sessionIds: dto.sessionIds ?? [],
    bookingIds: dto.bookingIds ?? [],
    invoiceIds: dto.invoiceIds ?? [],
    notes: dto.notes ?? "",
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** Omit server-assigned id, projectNumber, and timestamps. */
export function studioProjectToCreateDto(project: StudioProject): CreateProjectDto {
  return {
    source: project.source,
    inquiryId: project.inquiryId ?? null,
    clientId: project.clientId ?? null,
    projectName: project.projectName,
    clientName: project.clientName,
    clientMobile: project.clientMobile ?? null,
    clientEmail: project.clientEmail ?? null,
    projectCategory: project.projectCategory ?? null,
    status: project.status,
    assignedEngineer: project.assignedEngineer,
    planId: project.planId ?? null,
    advanceReceived: project.advanceReceived,
    remainingBalance: project.remainingBalance,
    grandTotal: project.grandTotal,
    notes: project.notes || null,
    selectedServiceIds: project.selectedServiceIds,
    quotation: project.quotation,
    tasks: project.tasks,
    files: project.files,
    links: project.links,
    expenses: project.expenses,
    sessionIds: project.sessionIds,
    bookingIds: project.bookingIds,
    invoiceIds: project.invoiceIds,
  };
}

export function studioProjectToResponseDto(
  project: StudioProject,
  studioId: string,
): ProjectResponseDto {
  return {
    id: project.id,
    studioId,
    projectNumber: project.projectNumber,
    source: project.source,
    inquiryId: project.inquiryId ?? null,
    clientId: project.clientId ?? null,
    projectName: project.projectName,
    clientName: project.clientName,
    clientMobile: project.clientMobile ?? null,
    clientEmail: project.clientEmail ?? null,
    projectCategory: project.projectCategory ?? null,
    status: project.status,
    assignedEngineer: project.assignedEngineer,
    planId: project.planId ?? null,
    advanceReceived: project.advanceReceived,
    remainingBalance: project.remainingBalance,
    grandTotal: project.grandTotal,
    notes: project.notes || null,
    selectedServiceIds: project.selectedServiceIds,
    quotation: project.quotation,
    tasks: project.tasks,
    files: project.files,
    links: project.links,
    expenses: project.expenses,
    sessionIds: project.sessionIds,
    bookingIds: project.bookingIds,
    invoiceIds: project.invoiceIds,
    deletedAt: null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export function studioProjectToUpdateDto(
  patch: Partial<Omit<StudioProject, "id" | "createdAt">>,
): UpdateProjectDto {
  const dto: UpdateProjectDto = {};

  if (patch.source !== undefined) dto.source = patch.source;
  if (patch.inquiryId !== undefined) dto.inquiryId = patch.inquiryId ?? null;
  if (patch.clientId !== undefined) dto.clientId = patch.clientId ?? null;
  if (patch.projectName !== undefined) dto.projectName = patch.projectName;
  if (patch.clientName !== undefined) dto.clientName = patch.clientName;
  if (patch.clientMobile !== undefined) dto.clientMobile = patch.clientMobile ?? null;
  if (patch.clientEmail !== undefined) dto.clientEmail = patch.clientEmail ?? null;
  if (patch.projectCategory !== undefined) dto.projectCategory = patch.projectCategory ?? null;
  if (patch.status !== undefined) dto.status = patch.status;
  if (patch.assignedEngineer !== undefined) dto.assignedEngineer = patch.assignedEngineer;
  if (patch.planId !== undefined) dto.planId = patch.planId ?? null;
  if (patch.advanceReceived !== undefined) dto.advanceReceived = patch.advanceReceived;
  if (patch.remainingBalance !== undefined) dto.remainingBalance = patch.remainingBalance;
  if (patch.grandTotal !== undefined) dto.grandTotal = patch.grandTotal;
  if (patch.notes !== undefined) dto.notes = patch.notes || null;
  if (patch.selectedServiceIds !== undefined) dto.selectedServiceIds = patch.selectedServiceIds;
  if (patch.quotation !== undefined) dto.quotation = patch.quotation;
  if (patch.tasks !== undefined) dto.tasks = patch.tasks;
  if (patch.files !== undefined) dto.files = patch.files;
  if (patch.links !== undefined) dto.links = patch.links;
  if (patch.expenses !== undefined) dto.expenses = patch.expenses;
  if (patch.sessionIds !== undefined) dto.sessionIds = patch.sessionIds;
  if (patch.bookingIds !== undefined) dto.bookingIds = patch.bookingIds;
  if (patch.invoiceIds !== undefined) dto.invoiceIds = patch.invoiceIds;

  return dto;
}
