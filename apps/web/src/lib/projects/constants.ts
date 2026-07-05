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

export const FINAL_DELIVERY_TASK_NAME = "Final Delivery";

export const DEFAULT_ESTIMATED_MINUTES = 120;

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};
