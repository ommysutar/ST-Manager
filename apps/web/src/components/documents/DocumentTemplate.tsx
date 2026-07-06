import { formatINR } from "@/lib/currency";
import type { DocumentViewModel } from "@/lib/documents/view-model";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function DocumentTemplate({ data }: { data: DocumentViewModel }) {
  const title = data.type === "invoice" ? "INVOICE" : "QUOTATION";
  const hasBankDetails = Boolean(
    data.studio.bankDetails.accountNumber || data.studio.bankDetails.ifsc || data.studio.bankDetails.bankName,
  );

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-border/60 bg-white p-8 text-neutral-900 shadow-lg print:max-w-none print:rounded-none print:border-none print:shadow-none sm:p-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-neutral-900 pb-6">
        <div className="flex items-start gap-4">
          {data.studio.logoDataUrl ? (
            <img src={data.studio.logoDataUrl} alt={data.studio.studioName} className="size-16 object-contain" />
          ) : null}
          <div>
            <p className="text-xl font-bold tracking-tight">{data.studio.studioName}</p>
            {data.studio.address ? (
              <p className="max-w-xs text-sm text-neutral-600">{data.studio.address}</p>
            ) : null}
            <p className="text-sm text-neutral-600">
              {[data.studio.mobile, data.studio.email].filter(Boolean).join(" · ")}
            </p>
            {data.studio.website ? <p className="text-sm text-neutral-600">{data.studio.website}</p> : null}
            {data.studio.gstNumber ? (
              <p className="text-xs text-neutral-500">GSTIN: {data.studio.gstNumber}</p>
            ) : null}
          </div>
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold tracking-widest text-primary">{title}</p>
          <p className="mt-1 text-sm text-neutral-600">
            {data.type === "invoice" ? "Invoice" : "Quotation"} #: <span className="font-medium">{data.documentNumber}</span>
          </p>
          <p className="text-sm text-neutral-600">Date: {formatDate(data.date)}</p>
        </div>
      </div>

      {/* Bill To / Project */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {data.type === "invoice" ? "Billed To" : "Quotation For"}
          </p>
          <p className="mt-1 font-semibold">{data.client.name}</p>
          {data.client.mobile ? <p className="text-sm text-neutral-600">{data.client.mobile}</p> : null}
          {data.client.email ? <p className="text-sm text-neutral-600">{data.client.email}</p> : null}
          {data.client.address ? <p className="text-sm text-neutral-600">{data.client.address}</p> : null}
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Project Details</p>
          <p className="mt-1 font-semibold">{data.project.projectName}</p>
          <p className="text-sm text-neutral-600">Project #: {data.project.projectNumber}</p>
          {data.project.category ? (
            <p className="text-sm text-neutral-600">Category: {data.project.category}</p>
          ) : null}
        </div>
      </div>

      {/* Line items */}
      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b-2 border-neutral-900 text-left">
            <th className="py-2 pr-2 font-semibold">#</th>
            <th className="py-2 pr-2 font-semibold">Service</th>
            <th className="py-2 pr-2 text-right font-semibold">Qty</th>
            <th className="py-2 pr-2 text-right font-semibold">Price</th>
            <th className="py-2 pl-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.lineItems.map((item, index) => (
            <tr key={item.id} className="border-b border-neutral-200">
              <td className="py-2 pr-2 text-neutral-500">{index + 1}</td>
              <td className="py-2 pr-2">{item.name}</td>
              <td className="py-2 pr-2 text-right">{item.quantity || 1}</td>
              <td className="py-2 pr-2 text-right">{formatINR(item.price)}</td>
              <td className="py-2 pl-2 text-right font-medium">{formatINR(item.amount)}</td>
            </tr>
          ))}
          {data.lineItems.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-6 text-center text-neutral-500">
                No services added yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <div className="w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-600">Subtotal</span>
            <span className="font-medium">{formatINR(data.subtotal)}</span>
          </div>
          {data.discountAmount > 0 ? (
            <div className="flex justify-between text-emerald-700">
              <span>Discount</span>
              <span>-{formatINR(data.discountAmount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t-2 border-neutral-900 pt-2 text-base font-bold">
            <span>Grand Total</span>
            <span>{formatINR(data.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Payment summary (invoice only) */}
      {data.paymentSummary ? (
        <div className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Payment Summary</p>
          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <p className="text-neutral-600">Grand Total</p>
              <p className="font-semibold">{formatINR(data.grandTotal)}</p>
            </div>
            <div>
              <p className="text-neutral-600">Received</p>
              <p className="font-semibold text-emerald-700">{formatINR(data.paymentSummary.received)}</p>
            </div>
            <div>
              <p className="text-neutral-600">Remaining Balance</p>
              <p className="font-semibold text-amber-700">{formatINR(data.paymentSummary.remaining)}</p>
            </div>
          </div>

          {data.paymentSummary.history.length > 0 ? (
            <table className="mt-4 w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-300 text-left text-neutral-500">
                  <th className="py-1 pr-2 font-medium">Date</th>
                  <th className="py-1 pr-2 font-medium">Method</th>
                  <th className="py-1 pr-2 font-medium">Notes</th>
                  <th className="py-1 pl-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.paymentSummary.history.map((payment) => (
                  <tr key={payment.id} className="border-b border-neutral-100">
                    <td className="py-1 pr-2">{formatDate(payment.createdAt)}</td>
                    <td className="py-1 pr-2 uppercase">{payment.method}</td>
                    <td className="py-1 pr-2 text-neutral-500">{payment.notes || "—"}</td>
                    <td className="py-1 pl-2 text-right">{formatINR(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      ) : null}

      {/* Footer */}
      <div className="mt-10 grid gap-8 border-t border-neutral-200 pt-6 sm:grid-cols-2">
        <div className="space-y-3 text-xs text-neutral-600">
          {hasBankDetails ? (
            <div>
              <p className="font-semibold text-neutral-800">Bank Details</p>
              {data.studio.bankDetails.accountName ? <p>Account Name: {data.studio.bankDetails.accountName}</p> : null}
              {data.studio.bankDetails.accountNumber ? (
                <p>Account No.: {data.studio.bankDetails.accountNumber}</p>
              ) : null}
              {data.studio.bankDetails.ifsc ? <p>IFSC: {data.studio.bankDetails.ifsc}</p> : null}
              {data.studio.bankDetails.bankName ? <p>Bank: {data.studio.bankDetails.bankName}</p> : null}
            </div>
          ) : null}
          {data.studio.termsAndConditions ? (
            <div>
              <p className="font-semibold text-neutral-800">Terms &amp; Conditions</p>
              <p className="whitespace-pre-line">{data.studio.termsAndConditions}</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-end justify-between gap-4">
          {data.studio.upiQrDataUrl ? (
            <div className="text-right">
              <img src={data.studio.upiQrDataUrl} alt="UPI QR" className="ml-auto size-24 object-contain" />
              {data.studio.upiId ? <p className="mt-1 text-xs text-neutral-600">{data.studio.upiId}</p> : null}
            </div>
          ) : null}

          <div className="text-right">
            {data.studio.signatureDataUrl ? (
              <img src={data.studio.signatureDataUrl} alt="Signature" className="ml-auto h-14 object-contain" />
            ) : null}
            <p className="mt-1 border-t border-neutral-400 pt-1 text-xs font-medium text-neutral-700">
              Authorized Signatory
            </p>
          </div>
        </div>
      </div>

      {data.studio.thankYouMessage || data.studio.footerText ? (
        <div className="mt-8 border-t border-neutral-200 pt-4 text-center text-xs text-neutral-500">
          {data.studio.thankYouMessage ? <p className="font-medium">{data.studio.thankYouMessage}</p> : null}
          {data.studio.footerText ? <p>{data.studio.footerText}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
