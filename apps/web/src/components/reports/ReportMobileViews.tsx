import type { ReactNode } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@st-manager/ui";

import {
  MobileDataCard,
  MobileDataField,
  ResponsiveDataView,
} from "@/components/ui/ResponsiveDataView";
import { formatINR } from "@/lib/currency";

interface SimpleAmountRow {
  id: string;
  label: string;
  amount: number;
}

export function SimpleAmountTable({
  rows,
  labelHeader,
  amountHeader,
}: {
  rows: SimpleAmountRow[];
  labelHeader: string;
  amountHeader: string;
}) {
  return (
    <ResponsiveDataView
      mobile={rows.map((row) => (
        <MobileDataCard key={row.id} title={row.label}>
          <MobileDataField label={amountHeader} value={formatINR(row.amount)} className="col-span-2" />
        </MobileDataCard>
      ))}
      desktop={
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labelHeader}</TableHead>
              <TableHead>{amountHeader}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.label}</TableCell>
                <TableCell>{formatINR(row.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }
    />
  );
}

export function ReportSectionTable({
  mobile,
  desktop,
}: {
  mobile: ReactNode;
  desktop: ReactNode;
}) {
  return <ResponsiveDataView mobile={mobile} desktop={desktop} />;
}

export function ReportLinkTitle({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="font-medium text-primary underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
