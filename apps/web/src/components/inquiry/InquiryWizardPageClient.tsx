"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { layout } from "@st-manager/theme";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@st-manager/ui";
import { SaveIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { useIsClientMounted, useStudioServices } from "@/hooks/useInquiryStorage";
import { calculateAdvance, calculateQuotation } from "@/lib/inquiry/quotation";
import {
  defaultWizardValues,
  inquiryWizardSchema,
  normalizeInquiryForm,
  STEP_FIELD_MAP,
  type InquiryWizardSchema,
} from "@/lib/inquiry/schema";
import { getMandatoryServiceIds } from "@/lib/inquiry/services";
import {
  clearWizardDraft,
  getInquiry,
  linkInquiryToProject,
  loadWizardDraft,
  saveInquiryRecord,
  saveWizardDraft,
} from "@/lib/inquiry/storage";
import { linkDocumentsToProject } from "@/lib/documents/storage";
import { addPayment } from "@/lib/payments/storage";
import { createProjectFromInquiry } from "@/lib/projects/storage";
import type { StudioProject } from "@/lib/projects/types";

interface WizardBootstrap {
  step: number;
  form: InquiryWizardSchema;
  hadDraft: boolean;
  editingInquiryId?: string;
  convertMode: boolean;
}

function buildInitialFormValues(): InquiryWizardSchema {
  const mandatoryIds = getMandatoryServiceIds();
  return {
    ...defaultWizardValues,
    selectedServiceIds: mandatoryIds,
  };
}

function readWizardBootstrap(searchParams: URLSearchParams): WizardBootstrap {
  const inquiryId = searchParams.get("inquiryId");
  const convertMode = searchParams.get("mode") === "convert";

  if (inquiryId) {
    const inquiry = getInquiry(inquiryId);
    if (inquiry) {
      if (inquiry.projectId && convertMode) {
        return {
          step: 1,
          form: normalizeInquiryForm(inquiry.form),
          hadDraft: false,
          editingInquiryId: inquiry.id,
          convertMode: false,
        };
      }

      return {
        step: convertMode ? 6 : 1,
        form: normalizeInquiryForm(inquiry.form),
        hadDraft: false,
        editingInquiryId: inquiry.id,
        convertMode,
      };
    }
  }

  const draft = loadWizardDraft();
  if (draft) {
    return { step: draft.step, form: normalizeInquiryForm(draft.form), hadDraft: true, convertMode: false };
  }

  return { step: 1, form: buildInitialFormValues(), hadDraft: false, convertMode: false };
}

function InquiryWizardForm({ initialState }: { initialState: WizardBootstrap }) {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(initialState.step);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdProject, setCreatedProject] = useState<StudioProject | null>(null);
  const [editingInquiryId, setEditingInquiryId] = useState(initialState.editingInquiryId);
  const draftToastShown = useRef(false);
  const convertMode = initialState.convertMode;

  const form = useForm<InquiryWizardSchema>({
    resolver: zodResolver(inquiryWizardSchema),
    defaultValues: initialState.form,
    mode: "onChange",
  });

  const { control, trigger, getValues } = form;
  const values = useWatch({ control }) as InquiryWizardSchema;
  const services = useStudioServices();

  useEffect(() => {
    if (initialState.hadDraft && !draftToastShown.current) {
      draftToastShown.current = true;
      toast.info("Draft restored", {
        description: "Your previous inquiry progress was loaded.",
      });
    }
  }, [initialState.hadDraft]);

  useEffect(() => {
    if (editingInquiryId && !draftToastShown.current) {
      draftToastShown.current = true;
      toast.info(convertMode ? "Convert to project" : "Inquiry reopened", {
        description: convertMode
          ? "Review payment details and create the project."
          : "Continue editing this saved inquiry.",
      });
    }
  }, [editingInquiryId, convertMode]);

  const persistDraft = useCallback(
    (nextStep: number) => {
      if (editingInquiryId) {
        return;
      }

      saveWizardDraft({
        step: nextStep,
        form: getValues(),
        updatedAt: new Date().toISOString(),
      });
    },
    [getValues, editingInquiryId],
  );

  useEffect(() => {
    if (editingInquiryId) {
      return;
    }

    const timeout = window.setTimeout(() => {
      persistDraft(step);
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [values, step, persistDraft, editingInquiryId]);

  const quotation = useMemo(
    () => calculateQuotation(values ?? defaultWizardValues, services),
    [values, services],
  );

  async function validateStep(currentStep: number): Promise<boolean> {
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
    if (!valid) {
      return;
    }

    setIsSubmitting(true);
    try {
      const formValues = getValues();
      const inquiry = saveInquiryRecord({
        id: editingInquiryId,
        form: formValues,
        quotation: calculateQuotation(formValues, services),
        status: "inquiry",
      });

      setEditingInquiryId(inquiry.id);
      clearWizardDraft();
      toast.success("Inquiry saved", {
        description: "The inquiry is now available in the Inquiry list.",
      });
      router.push("/inquiries");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddToProject() {
    const valid = await validateThroughStep(4);
    if (!valid) {
      return;
    }

    setStep(6);
    persistDraft(6);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleCreateProject() {
    const valid = await validateThroughStep(6);
    if (!valid) {
      return;
    }

    const existingInquiry = editingInquiryId ? getInquiry(editingInquiryId) : undefined;
    if (existingInquiry?.projectId) {
      toast.info("Project already exists for this inquiry.");
      router.push(`/projects/${existingInquiry.projectId}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const formValues = getValues();
      const quote = calculateQuotation(formValues, services);
      const { advanceAmount, remainingBalance } = calculateAdvance(
        quote.grandTotal,
        formValues.advancePercent,
      );

      const inquiry = saveInquiryRecord({
        id: editingInquiryId,
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
      linkDocumentsToProject(inquiry.id, project.id);

      if (advanceAmount > 0) {
        addPayment({
          projectId: project.id,
          amount: advanceAmount,
          method: formValues.advanceMethod,
          notes: formValues.advanceNotes || "Advance payment",
          receivedBy: user?.email ?? "",
          source: "advance",
        });
      }

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
  const pageTitle = editingInquiryId
    ? convertMode
      ? "Convert Inquiry to Project"
      : "Edit Inquiry"
    : "New Inquiry Wizard";

  return (
    <div
      className="mx-auto flex flex-col gap-6"
      style={{ maxWidth: layout.contentMaxWidth }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/inquiries" className="text-sm text-primary underline-offset-4 hover:underline">
            Back to inquiries
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground">
            Client → Project → Plan comparison → Services → Quotation → Project
          </p>
        </div>
        {!editingInquiryId ? (
          <Button type="button" variant="outline" size="sm" onClick={handleManualSaveDraft}>
            <SaveIcon className="size-4" />
            Save draft
          </Button>
        ) : null}
      </div>

      <Card className="overflow-hidden border-border/60 bg-background/70 shadow-xl backdrop-blur-xl dark:bg-background/40">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
          <CardTitle className="text-lg">Studio Inquiry Workflow</CardTitle>
          <CardDescription>
            Plans are for comparison only. Quotation uses selected services and manual inputs.
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
  const searchParams = useSearchParams();
  const initialState = useMemo(
    () => (mounted ? readWizardBootstrap(searchParams) : null),
    [mounted, searchParams],
  );

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

  if (!mounted || !initialState) {
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

  return (
    <InquiryWizardForm
      key={`${initialState.editingInquiryId ?? "new"}-${initialState.convertMode}`}
      initialState={initialState}
    />
  );
}
