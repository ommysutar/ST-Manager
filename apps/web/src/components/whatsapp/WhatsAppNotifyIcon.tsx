"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@st-manager/ui";
import { cn } from "@st-manager/ui";
import { useState } from "react";

import { prepareWhatsAppNotification, sendWhatsAppNotification } from "@/lib/whatsapp/notify";
import type { WhatsAppMessageVariables, WhatsAppNotificationType } from "@/lib/whatsapp/types";

import { WhatsAppIcon } from "./WhatsAppIcon";

interface WhatsAppNotifyIconProps {
  whatsappNumber: string | null | undefined;
  type: WhatsAppNotificationType;
  variables: WhatsAppMessageVariables;
  size?: "sm" | "md";
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
}

export function WhatsAppNotifyIcon({
  whatsappNumber,
  type,
  variables,
  size = "md",
  className,
  onClick,
}: WhatsAppNotifyIconProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("");
  const [previewPhone, setPreviewPhone] = useState("");

  const hasNumber = Boolean(whatsappNumber?.trim());
  const iconSize = size === "sm" ? "size-3.5" : "size-4";
  const buttonSize = size === "sm" ? "h-6 w-6" : "h-7 w-7";

  function handleClick(event: React.MouseEvent) {
    event.stopPropagation();
    onClick?.(event);

    if (!hasNumber) {
      return;
    }

    const prepared = prepareWhatsAppNotification({
      type,
      whatsappNumber,
      variables,
    });

    if (!prepared.ok) {
      return;
    }

    setPreviewMessage(prepared.message);
    setPreviewPhone(prepared.phoneNumber);
    setPreviewOpen(true);
  }

  function handleSend() {
    sendWhatsAppNotification({
      type,
      whatsappNumber: previewPhone,
      variables,
    });
    setPreviewOpen(false);
  }

  return (
    <>
      <button
        type="button"
        title={hasNumber ? "Send WhatsApp message" : "No WhatsApp Number Added"}
        aria-label={hasNumber ? "Send WhatsApp message" : "No WhatsApp Number Added"}
        disabled={!hasNumber}
        onClick={handleClick}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-md transition-colors",
          buttonSize,
          hasNumber
            ? "text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
            : "cursor-not-allowed text-muted-foreground/40",
          className,
        )}
      >
        <WhatsAppIcon className={iconSize} />
      </button>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Message Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">To: {previewPhone}</p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 font-sans text-sm leading-relaxed">
              {previewMessage}
            </pre>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSend}>
              Open WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
