"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { layout } from "@st-manager/theme";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@st-manager/ui";
import { SaveIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { AdvancePaymentStep } from "@/components/inquiry/wizard/steps/AdvancePaymentStep";
import { ClientDetailsStep } from "@/components/inquiry/wizard/steps/ClientDetailsStep";
import { FinalDecisionStep } from "@/components/inquiry/wizard/steps/FinalDecisionStep";
import { PlanSelectionStep } from "@/components/inquiry/wizard/steps/PlanSelectionStep";
import { ProjectDetailsStep } from "@/components/inquiry/wizard/steps/ProjectDetailsStep";
import { ServicesSelectionStep } from "@/components/inquiry/wizard/steps/ServicesSelectionStep";
import { SuccessStep } from "@/components/inquiry/wizard/steps/SuccessStep";
import { WizardNavigation } from "@/components/inquiry/wizard/WizardNavigation";
import { WizardProgress } from "@/components/inquiry/wizard/WizardProgress";
import { useAuth } from "@/hooks/useAuth";
import { useIsClientMounted, useProjectPlans, useStudioServices } from "@/hooks/useInquiryStorage";
import { calculateAdvance, calculateQuotation } from "@/lib/inquiry/quotation";
import {
  defaultWizardValues,
  inquiryWizardSchema,
  STEP_FIELD_MAP,
  type InquiryWizardSchema,
} from "@/lib/inquiry/schema";
import {
  clearWizardDraft,
  linkInquiryToProject,
  loadWizardDraft,
  saveInquiryRecord,
  saveWizardDraft,
} from "@/lib/inquiry/storage";
import { createProjectFromInquiry } from "@/lib/projects/storage";
import type { StudioProject } from "@/lib/projects/types";

interface WizardBootstrap {
  step: number;
  form: InquiryWizardSchema;
  hadDraft: boolean;
}

function readWizardBootstrap(): WizardBootstrap {
  const draft = loadWizardDraft();
  if (!draft) {
    return { step: 1, form: defaultWizardValues, hadDraft: false };
  }

  return { step: draft.step, form: draft.form, hadDraft: true };
}

function InquiryWizardForm({ initialState }: { initialState: WizardBootstrap }) {
  const router = useRouter();
  const [step, setStep] = useState(initialState.step);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdProject, setCreatedProject] = useState<StudioProject | null>(null);
  const draftToastShown = useRef(false);

  const form = useForm<InquiryWizardSchema>({
    resolver: zodResolver(inquiryWizardSchema),
    defaultValues: initialState.form,
    mode: "onChange",
  });

  const { control, trigger, setError, clearErrors, getValues } = form;
  const values = useWatch({ control }) as InquiryWizardSchema;
  const services = useStudioServices();
  const plans = useProjectPlans();

  useEffect(() => {
    if (initialState.hadDraft && !draftToastShown.current) {
      draftToastShown.current = true;
      toast.info("Draft restored", {
        description: "Your previous inquiry progress was loaded.",
      });
    }
  }, [initialState.hadDraft]);

  const persistDraft = useCallback(
    (nextStep: number) => {
      saveWizardDraft({
        step: nextStep,
        form: getValues(),
        updatedAt: new Date().toISOString(),
      });
    },
    [getValues],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      persistDraft(step);
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [values, step, persistDraft]);

  const quotation = useMemo(
    () => calculateQuotation(values ?? defaultWizardValues, services, plans),
    [values, services, plans],
  );

  async function validateStep(currentStep: number): Promise<boolean> {
    if (currentStep === 3 && !getValues("planId")) {
      setError("planId", { type: "manual", message: "Please select a project plan" });
      return false;
    }

    clearErrors("planId");
    const fields = STEP_FIELD_MAP[currentStep] ?? [];
    if (fields.length === 0) {
      return true;
    }

    return trigger(fields);
  }

  async function validateThroughStep(targetStep: number): Promise<boolean> {
    for (let current = 1; current <= targetStep; current += 1) {
      const valid = await validateStep(current);
      if (!valid) {
        setStep(current);
        toast.error("Please complete required fields before continuing.");
        return false;
      }
    }
    return true;
  }

  async function goNext() {
    const valid = await validateStep(step);
    if (!valid) {
      toast.error("Please complete required fields before continuing.");
      return;
    }

    const nextStep = Math.min(step + 1, 6);
    setStep(nextStep);
    persistDraft(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    const prevStep = Math.max(step - 1, 1);
    setStep(prevStep);
    persistDraft(prevStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveInquiry() {
    const valid = await validateThroughStep(4);
    if (!valid || !getValues("planId")) {
      return;
    }

    setIsSubmitting(true);
    try {
      const formValues = getValues();
      saveInquiryRecord({
        form: formValues,
        quotation: calculateQuotation(formValues, services, plans),
        status: "inquiry",
      });
      clearWizardDraft();
      toast.success("Inquiry saved", {
        description: "The inquiry is now available in the Inquiry menu.",
      });
      router.push("/inquiries");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddToProject() {
    const valid = await validateThroughStep(4);
    if (!valid || !getValues("planId")) {
      return;
    }

    setStep(6);
    persistDraft(6);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleCreateProject() {
    const valid = await validateThroughStep(6);
    if (!valid || !getValues("planId")) {
      return;
    }

    setIsSubmitting(true);
    try {
      const formValues = getValues();
      const quote = calculateQuotation(formValues, services, plans);
      const { advanceAmount, remainingBalance } = calculateAdvance(
        quote.grandTotal,
        formValues.advancePercent,
      );

      const inquiry = saveInquiryRecord({
        form: formValues,
        quotation: quote,
        status: "project",
        advanceAmount,
        remainingBalance,
      });

      const project = createProjectFromInquiry({
        inquiryId: inquiry.id,
        form: formValues,
        quotation: quote,
        advanceAmount,
        remainingBalance,
      });

      linkInquiryToProject(inquiry.id, project.id);
      clearWizardDraft();
      setCreatedProject(project);
      toast.success("Project created successfully");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleManualSaveDraft() {
    persistDraft(step);
    toast.success("Draft saved", { description: "You can continue this inquiry later." });
  }

  if (createdProject) {
    return (
      <div className="mx-auto" style={{ maxWidth: layout.contentMaxWidth }}>
        <SuccessStep project={createdProject} />
      </div>
    );
  }

  const showPaymentActions = step === 6;
  const showDecisionActions = step === 5;
  const progressMaxStep = step >= 6 ? 6 : 5;

  return (
    <div
      className="mx-auto flex flex-col gap-6"
      style={{ maxWidth: layout.contentMaxWidth }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
            Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">New Inquiry Wizard</h1>
          <p className="text-sm text-muted-foreground">
            Dashboard → New Inquiry → Client → Project → Plan → Services → Quotation → Project
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleManualSaveDraft}>
          <SaveIcon className="size-4" />
          Save draft
        </Button>
      </div>

      <Card className="overflow-hidden border-border/60 bg-background/70 shadow-xl backdrop-blur-xl dark:bg-background/40">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
          <CardTitle className="text-lg">Studio Inquiry Workflow</CardTitle>
          <CardDescription>
            Complete each step to build a quotation and convert to project when ready.
          </CardDescription>
          <div className="pt-4">
            <WizardProgress currentStep={step} maxStep={progressMaxStep} />
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          <FormProvider {...form}>
            <div className="transition-all duration-300">
              {step === 1 ? <ClientDetailsStep /> : null}
              {step === 2 ? <ProjectDetailsStep /> : null}
              {step === 3 ? <PlanSelectionStep /> : null}
              {step === 4 ? <ServicesSelectionStep /> : null}
              {step === 5 ? (
                <FinalDecisionStep
                  onSaveInquiry={handleSaveInquiry}
                  onAddToProject={handleAddToProject}
                  isSubmitting={isSubmitting}
                />
              ) : null}
              {step === 6 ? <AdvancePaymentStep /> : null}
            </div>
          </FormProvider>

          <WizardNavigation
            step={step}
            isSubmitting={isSubmitting}
            showPaymentActions={showPaymentActions}
            showDecisionActions={showDecisionActions}
            onPrevious={goBack}
            onNext={goNext}
            onCreateProject={handleCreateProject}
          />
        </CardContent>
      </Card>

      {step >= 4 && step <= 6 ? (
        <p className="text-center text-xs text-muted-foreground">
          Grand total preview: ₹{quotation.grandTotal.toLocaleString("en-IN")}
        </p>
      ) : null}
    </div>
  );
}

export function InquiryWizardPageClient() {
  const { isAuthenticated } = useAuth();
  const mounted = useIsClientMounted();

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Sign in to create a new inquiry.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Loading wizard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <InquiryWizardForm initialState={readWizardBootstrap()} />;
}
