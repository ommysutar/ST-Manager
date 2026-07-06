"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@st-manager/ui";
import { CloudIcon, CopyIcon, DownloadIcon, ExternalLinkIcon, LinkIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useProject } from "@/hooks/useProjects";
import {
  addProjectCloudFile,
  addProjectLink,
  detectCloudProvider,
  detectLinkProvider,
  removeProjectFile,
  removeProjectLink,
} from "@/lib/projects/assets";
import { CLOUD_PROVIDER_LABELS } from "@/lib/projects/constants";
import type { CloudProvider, ProjectLinkProvider } from "@/lib/projects/types";

const CLOUD_PROVIDERS: { value: CloudProvider; label: string }[] = [
  { value: "google_drive", label: "Google Drive" },
  { value: "dropbox", label: "Dropbox" },
  { value: "onedrive", label: "OneDrive" },
  { value: "other", label: "Other" },
];

const LINK_PROVIDERS: { value: ProjectLinkProvider; label: string }[] = [
  { value: "google_drive", label: "Google Drive" },
  { value: "dropbox", label: "Dropbox" },
  { value: "onedrive", label: "OneDrive" },
  { value: "youtube", label: "YouTube" },
  { value: "wetransfer", label: "WeTransfer" },
  { value: "other", label: "Other" },
];

function formatFileSize(bytes?: number): string {
  if (!bytes) {
    return "—";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Link copied");
  } catch {
    toast.error("Could not copy link");
  }
}

const emptyFileForm = {
  name: "",
  type: "",
  size: "",
  cloudUrl: "",
  provider: "google_drive" as CloudProvider,
};

interface ProjectFilesLinksProps {
  projectId: string;
}

export function ProjectFilesLinks({ projectId }: ProjectFilesLinksProps) {
  const { user } = useAuth();
  const project = useProject(projectId);
  const [fileForm, setFileForm] = useState(emptyFileForm);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkProvider, setLinkProvider] = useState<ProjectLinkProvider>("other");

  if (!project) {
    return null;
  }

  function handleAddFile() {
    if (!fileForm.name.trim()) {
      toast.error("Enter a file name");
      return;
    }
    if (!fileForm.cloudUrl.trim()) {
      toast.error("Paste the cloud storage link");
      return;
    }

    addProjectCloudFile(projectId, {
      name: fileForm.name,
      type: fileForm.type || "file",
      size: fileForm.size ? Number(fileForm.size) * 1024 * 1024 : undefined,
      cloudUrl: fileForm.cloudUrl,
      provider: fileForm.provider,
      uploadedBy: user?.email ?? "",
    });
    setFileForm(emptyFileForm);
    toast.success("File linked");
  }

  function handleAddLink() {
    if (!linkUrl.trim()) {
      toast.error("Enter a link URL");
      return;
    }

    addProjectLink(projectId, {
      label: linkLabel,
      url: linkUrl,
      provider: linkProvider === "other" ? detectLinkProvider(linkUrl) : linkProvider,
    });
    setLinkLabel("");
    setLinkUrl("");
    setLinkProvider("other");
    toast.success("Link saved");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CloudIcon className="size-4" />
            Cloud Files
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Files are never stored inside ST Manager. Upload the file to Google Drive, Dropbox, or
            OneDrive first, then paste the shareable link here.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="file-name">File Name</Label>
              <Input
                id="file-name"
                placeholder="Final Mix v3.wav"
                value={fileForm.name}
                onChange={(event) => setFileForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="file-cloud-url">Cloud URL</Label>
              <Input
                id="file-cloud-url"
                placeholder="https://drive.google.com/..."
                value={fileForm.cloudUrl}
                onChange={(event) => {
                  const cloudUrl = event.target.value;
                  setFileForm((prev) => ({
                    ...prev,
                    cloudUrl,
                    provider: cloudUrl ? detectCloudProvider(cloudUrl) : prev.provider,
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-provider">Provider</Label>
              <select
                id="file-provider"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={fileForm.provider}
                onChange={(event) =>
                  setFileForm((prev) => ({ ...prev, provider: event.target.value as CloudProvider }))
                }
              >
                {CLOUD_PROVIDERS.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-type">Type</Label>
              <Input
                id="file-type"
                placeholder="Audio, Video, Image, Document..."
                value={fileForm.type}
                onChange={(event) => setFileForm((prev) => ({ ...prev, type: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-size">Size (MB, optional)</Label>
              <Input
                id="file-size"
                type="number"
                min={0}
                value={fileForm.size}
                onChange={(event) => setFileForm((prev) => ({ ...prev, size: event.target.value }))}
              />
            </div>
          </div>
          <Button type="button" onClick={handleAddFile}>
            <CloudIcon className="size-4" />
            Add Cloud File
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">External Links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="link-label">Label</Label>
            <Input
              id="link-label"
              placeholder="Reference mix, final delivery..."
              value={linkLabel}
              onChange={(event) => setLinkLabel(event.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="link-url">URL</Label>
            <Input
              id="link-url"
              placeholder="https://..."
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="link-provider">Provider</Label>
            <select
              id="link-provider"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={linkProvider}
              onChange={(event) => setLinkProvider(event.target.value as ProjectLinkProvider)}
            >
              {LINK_PROVIDERS.map((provider) => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={handleAddLink}>
              <LinkIcon className="size-4" />
              Save link
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Files &amp; Links ({project.files.length + project.links.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {project.files.length === 0 && project.links.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files or links yet.</p>
          ) : (
            <ul className="space-y-3">
              {project.files.map((file) => (
                <li
                  key={file.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{file.name}</p>
                      <Badge variant="outline">{file.type}</Badge>
                      <Badge variant="secondary">{CLOUD_PROVIDER_LABELS[file.provider] ?? file.provider}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} · {new Date(file.uploadedAt).toLocaleDateString()}
                      {file.uploadedBy ? ` · ${file.uploadedBy}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <a href={file.cloudUrl} target="_blank" rel="noreferrer">
                        <ExternalLinkIcon className="size-4" />
                        Open
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a href={file.cloudUrl} target="_blank" rel="noreferrer" download>
                        <DownloadIcon className="size-4" />
                        Download
                      </a>
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => copyToClipboard(file.cloudUrl)}>
                      <CopyIcon className="size-4" />
                      Copy Link
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        removeProjectFile(project.id, file.id);
                        toast.success("File removed");
                      }}
                    >
                      <Trash2Icon className="size-4" />
                      Remove
                    </Button>
                  </div>
                </li>
              ))}

              {project.links.map((link) => (
                <li
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{link.label}</p>
                      <Badge variant="outline">Link</Badge>
                      <Badge variant="secondary">{link.provider.replace("_", " ")}</Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <a href={link.url} target="_blank" rel="noreferrer">
                        <ExternalLinkIcon className="size-4" />
                        Open
                      </a>
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => copyToClipboard(link.url)}>
                      <CopyIcon className="size-4" />
                      Copy Link
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        removeProjectLink(project.id, link.id);
                        toast.success("Link removed");
                      }}
                    >
                      <Trash2Icon className="size-4" />
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
