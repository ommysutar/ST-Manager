interface WizardStepHeaderProps {
  title: string;
  description: string;
}

export function WizardStepHeader({ title, description }: WizardStepHeaderProps) {
  return (
    <div className="mb-6 space-y-1">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
