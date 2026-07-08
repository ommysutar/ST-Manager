import type { ReactNode } from "react";

interface ResponsiveDataViewProps {
  mobile: ReactNode;
  desktop: ReactNode;
}

export function ResponsiveDataView({ mobile, desktop }: ResponsiveDataViewProps) {
  return (
    <>
      <div className="grid gap-3 md:hidden">{mobile}</div>
      <div className="hidden md:block">{desktop}</div>
    </>
  );
}

interface MobileDataCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}

export function MobileDataCard({ title, subtitle, children, actions }: MobileDataCardProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">{children}</dl>
    </div>
  );
}

interface MobileDataFieldProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function MobileDataField({ label, value, className }: MobileDataFieldProps) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium break-words">{value}</dd>
    </div>
  );
}
