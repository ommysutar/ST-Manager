"use client";

import { useAuth } from "@/hooks/useAuth";
import { useClientWhatsAppNumber } from "@/hooks/useClientWhatsApp";
import { useProfile } from "@/hooks/useProfile";
import type { StudioProject } from "@/lib/projects/types";
import { buildProjectWhatsAppVariables } from "@/lib/whatsapp/context";
import type { WhatsAppMessageVariables, WhatsAppNotificationType } from "@/lib/whatsapp/types";

import { WhatsAppNotifyIcon } from "./WhatsAppNotifyIcon";

interface ProjectWhatsAppNotifyProps {
  project: StudioProject;
  type: WhatsAppNotificationType;
  extras?: Partial<WhatsAppMessageVariables>;
  size?: "sm" | "md";
  className?: string;
}

export function ProjectWhatsAppNotify({
  project,
  type,
  extras,
  size = "md",
  className,
}: ProjectWhatsAppNotifyProps) {
  const { user } = useAuth();
  const profile = useProfile(user);
  const whatsappNumber = useClientWhatsAppNumber(project.clientId);

  return (
    <WhatsAppNotifyIcon
      whatsappNumber={whatsappNumber}
      type={type}
      variables={buildProjectWhatsAppVariables(project, profile, extras)}
      size={size}
      className={className}
    />
  );
}
