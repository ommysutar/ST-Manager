"use client";

import { Button, cn, Input, Label, Textarea } from "@st-manager/ui";
import { useState } from "react";

import { formatINR } from "@/lib/currency";
import type { PaymentMethod } from "@/lib/payments/types";

export interface ReceivePaymentInput {
  method: PaymentMethod;
  amount: number;
  notes: string;
}

interface ReceivePaymentProps {
  amountDue: number;
  qrDataUrl?: string;
  upiId?: string;
  defaultAmount?: number;
  isSubmitting?: boolean;
  onReceive: (input: ReceivePaymentInput) => void;
}

/** Single shared payment-capture component — used by Payment Overview and the Inquiry Wizard advance step. */
export function ReceivePayment({
  amountDue,
  qrDataUrl,
  upiId,
  defaultAmount,
  isSubmitting = false,
  onReceive,
}: ReceivePaymentProps) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState<string>(String(defaultAmount ?? amountDue ?? 0));
  const [notes, setNotes] = useState("");

  function handleSubmit() {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return;
    }

    onReceive({ method, amount: Math.round(numericAmount), notes });
    setNotes("");
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-background/40 p-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMethod("cash")}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-all",
            method === "cash"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background hover:border-primary/30",
          )}
        >
          Cash
        </button>
        <button
          type="button"
          onClick={() => setMethod("upi")}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-all",
            method === "upi"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background hover:border-primary/30",
          )}
        >
          UPI
        </button>
      </div>

      {method === "upi" ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/70 p-4 text-center">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="UPI QR Code" className="size-40 rounded-lg border object-contain p-1" />
          ) : (
            <p className="text-sm text-muted-foreground">
              No UPI QR uploaded yet. Add one in Settings → Invoice &amp; Quotation Template.
            </p>
          )}
          {upiId ? <p className="text-sm font-medium">{upiId}</p> : null}
          <p className="text-xs text-muted-foreground">
            Show this QR to the client. Once they pay, confirm below.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="receive-amount">Amount</Label>
          <Input
            id="receive-amount"
            type="number"
            min={0}
            step={1}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">Due: {formatINR(amountDue)}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="receive-notes">Notes</Label>
          <Textarea
            id="receive-notes"
            rows={1}
            placeholder="Optional"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
      </div>

      <Button type="button" className="w-full" disabled={isSubmitting} onClick={handleSubmit}>
        {method === "cash" ? "Receive Payment" : "Verified Payment"}
      </Button>
    </div>
  );
}
