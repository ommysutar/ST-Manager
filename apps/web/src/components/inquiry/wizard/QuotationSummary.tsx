"use client";

import { cn, Separator } from "@st-manager/ui";

import { formatINR } from "@/lib/currency";
import type { QuotationBreakdown } from "@/lib/inquiry/types";

interface QuotationSummaryProps {
  quotation: QuotationBreakdown;
  discountPercent: number;
  className?: string;
  compact?: boolean;
}

export function QuotationSummary({
  quotation,
  discountPercent,
  className,
  compact = false,
}: QuotationSummaryProps) {
  const hasLines =
    quotation.serviceLines.length > 0 ||
    quotation.customServiceLines.length > 0 ||
    quotation.studioRentAmount > 0;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-background/60 p-5 shadow-lg backdrop-blur-md transition-all duration-300 dark:bg-background/40",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide uppercase">Rough Quotation</h3>
        {!compact ? (
          <span className="text-xs text-muted-foreground">Live preview</span>
        ) : null}
      </div>

      <div className="space-y-2 text-sm">
        {quotation.serviceLines.map((line) => (
          <div key={line.id} className="flex justify-between gap-4">
            <span className="text-muted-foreground">{line.name}</span>
            <span className="font-medium">{formatINR(line.price)}</span>
          </div>
        ))}

        {quotation.customServiceLines.map((line) => (
          <div key={line.id} className="flex justify-between gap-4">
            <span className="text-muted-foreground">{line.name} (custom)</span>
            <span className="font-medium">{formatINR(line.price)}</span>
          </div>
        ))}

        {quotation.studioRentAmount > 0 ? (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              Studio Rent ({quotation.studioRentHours}h × {formatINR(quotation.studioRentRate)})
            </span>
            <span className="font-medium">{formatINR(quotation.studioRentAmount)}</span>
          </div>
        ) : null}

        {!hasLines ? (
          <p className="text-muted-foreground">Select services to preview quotation.</p>
        ) : null}
      </div>

      <Separator className="my-4" />

      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatINR(quotation.subtotal)}</span>
        </div>
        {discountPercent > 0 ? (
          <div className="flex justify-between gap-4 text-emerald-600 dark:text-emerald-400">
            <span>Discount ({discountPercent}%)</span>
            <span>-{formatINR(quotation.discountAmount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 text-base font-semibold">
          <span>Grand Total</span>
          <span>{formatINR(quotation.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
