/** Default task chains generated from selected studio services during inquiry/project creation. */
export const SERVICE_TASK_TEMPLATES: Record<string, string[]> = {
  recording: ["Recording Setup", "Recording Session"],
  mixing: ["Mixing"],
  mastering: ["Mastering"],
  editing: ["Editing"],
  programming: ["Programming"],
  "vocal-tuning": ["Vocal Tuning"],
  "live-recording": ["Live Recording Setup", "Live Recording"],
  "video-shoot": ["Video Shoot"],
  "video-editing": ["Video Editing"],
};

/** @deprecated Legacy task name migrated into the "project_delivery" mandatory task. Kept for migration lookups only. */
export const FINAL_DELIVERY_TASK_NAME = "Final Delivery";

export const DEFAULT_ESTIMATED_MINUTES = 120;

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  on_hold: "On Hold",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Every project must always end with these three tasks, in this order. They cannot be deleted, only reordered. */
export const MANDATORY_TASK_DEFINITIONS: { key: "payment" | "files_shared" | "project_delivery"; name: string }[] = [
  { key: "payment", name: "Payment" },
  { key: "files_shared", name: "Files Shared" },
  { key: "project_delivery", name: "Project Delivery" },
];

export const CLOUD_PROVIDER_LABELS: Record<string, string> = {
  google_drive: "Google Drive",
  dropbox: "Dropbox",
  onedrive: "OneDrive",
  other: "Other",
};

export const PROJECT_EXPENSE_CATEGORIES = [
  "Assistant Engineer",
  "Instrument Player",
  "Singer",
  "Video Shoot",
  "Travel",
  "Food",
  "Studio Maintenance",
  "Other",
];
