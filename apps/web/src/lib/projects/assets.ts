import { generateId } from "@/lib/inquiry/services";

import { getProject, updateProject } from "./storage";
import type { CloudProvider, ProjectFile, ProjectLink, ProjectLinkProvider, StudioProject } from "./types";

export function detectLinkProvider(url: string): ProjectLinkProvider {
  const normalized = url.toLowerCase();
  if (normalized.includes("drive.google.com")) {
    return "google_drive";
  }
  if (normalized.includes("dropbox.com")) {
    return "dropbox";
  }
  if (normalized.includes("onedrive.live.com") || normalized.includes("1drv.ms")) {
    return "onedrive";
  }
  if (normalized.includes("youtube.com") || normalized.includes("youtu.be")) {
    return "youtube";
  }
  if (normalized.includes("wetransfer.com")) {
    return "wetransfer";
  }
  return "other";
}

export function detectCloudProvider(url: string): CloudProvider {
  const provider = detectLinkProvider(url);
  return provider === "youtube" || provider === "wetransfer" ? "other" : provider;
}

export function addProjectLink(
  projectId: string,
  input: { label: string; url: string; provider?: ProjectLinkProvider },
): StudioProject | null {
  const project = getProject(projectId);
  if (!project) {
    return null;
  }

  const link: ProjectLink = {
    id: generateId("lnk"),
    label: input.label.trim() || "External link",
    url: input.url.trim(),
    provider: input.provider ?? detectLinkProvider(input.url),
    createdAt: new Date().toISOString(),
  };

  return updateProject(projectId, { links: [link, ...project.links] });
}

export function removeProjectLink(projectId: string, linkId: string): StudioProject | null {
  const project = getProject(projectId);
  if (!project) {
    return null;
  }

  return updateProject(projectId, {
    links: project.links.filter((link) => link.id !== linkId),
  });
}

export interface CloudFileInput {
  name: string;
  type: string;
  size?: number;
  cloudUrl: string;
  provider?: CloudProvider;
  uploadedBy: string;
}

/**
 * Registers a pointer to a file hosted on external cloud storage (Google Drive, Dropbox, OneDrive,
 * or other). ST Manager never stores the file itself — only this metadata + link.
 */
export function addProjectCloudFile(projectId: string, input: CloudFileInput): StudioProject | null {
  const project = getProject(projectId);
  if (!project) {
    return null;
  }

  const entry: ProjectFile = {
    id: generateId("file"),
    name: input.name.trim(),
    type: input.type.trim() || "file",
    size: input.size,
    cloudUrl: input.cloudUrl.trim(),
    provider: input.provider ?? detectCloudProvider(input.cloudUrl),
    uploadedAt: new Date().toISOString(),
    uploadedBy: input.uploadedBy,
  };

  return updateProject(projectId, { files: [entry, ...project.files] });
}

export function removeProjectFile(projectId: string, fileId: string): StudioProject | null {
  const project = getProject(projectId);
  if (!project) {
    return null;
  }

  return updateProject(projectId, {
    files: project.files.filter((file) => file.id !== fileId),
  });
}
