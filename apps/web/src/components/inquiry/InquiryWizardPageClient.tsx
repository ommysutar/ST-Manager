"use client";

import { ApiError } from "@st-manager/api-sdk";
import { zodResolver } from "@hookform/resolvers/zod";
import { layout } from "@st-manager/theme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@st-manager/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { AdvancePaymentStep } from "@/components/inquiry/wizard/steps/AdvancePaymentStep";
import { ClientDetailsStep } from "@/components/inquiry/wizard/steps/ClientDetailsStep";
import { FinalDecisionStep } from "@/components/inquiry/wizard/steps/FinalDecisionStep";
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
  saveInquiryRecord,
} from "@/lib/inquiry/storage";
import { linkDocumentsToProject } from "@/lib/documents/storage";
import { ensureInquiryClientSynced } from "@/lib/clients/sync";
import { addPayment } from "@/lib/payments/storage";
import { createProjectFromInquiry } from "@/lib/projects/storage";
import type { StudioProject } from "@/lib/projects/types";

interface WizardBootstrap {
  step: number;
  form: InquiryWizardSchema;
  editingInquiryId?: string;
  convertMode: boolean;
  sessionKey: string;
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
  const sessionKey = searchParams.get("session") ?? inquiryId ?? "new";

  if (inquiryId) {
    const inquiry = getInquiry(inquiryId);
    if (inquiry) {
      if (inquiry.projectId && convertMode) {
        return {
          step: 1,
          form: normalizeInquiryForm(inquiry.form),
          editingInquiryId: inquiry.id,
          convertMode: false,
          sessionKey,
        };
      }

      return {
        step: convertMode ? 5 : 1,
        form: normalizeInquiryForm(inquiry.form),
        editingInquiryId: inquiry.id,
        convertMode,
        sessionKey,
      };
    }
  }

  clearWizardDraft();
  return {
    step: 1,
    form: buildInitialFormValues(),
    convertMode: false,
    sessionKey,
  };
}

function InquiryWizardForm({ initialState }: { initialState: WizardBootstrap }) {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(initialState.step);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdProject, setCreatedProject] = useState<StudioProject | null>(null);
  const editingInquiryId = initialState.editingInquiryId;
  const isEditSession = Boolean(initialState.editingInquiryId);
  const convertMode = initialState.convertMode;
  const draftToastShown = useRef(false);

  const form = useForm<InquiryWizardSchema>({
    resolver: zodResolver(inquiryWizardSchema),
    defaultValues: initialState.form,
    mode: "onChange",
  });

  const { control, trigger, getValues, clearErrors } = form;
  const values = useWatch({ control }) as InquiryWizardSchema;
  const services = useStudioServices();

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

  const quotation = useMemo(
    () => calculateQuotation(values ?? defaultWizardValues, services),
    [values, services],
  );

  const activeCatalogServices = useMemo(() => services.filter((service) => service.active), [services]);

  async function validateStep(currentStep: number): Promise<boolean> {
    if (currentStep === 3 && activeCatalogServices.length === 0) {
      toast.error("Please create at least one Service in Settings before creating an Inquiry.");
      return false;
    }

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

    const nextStep = Math.min(step + 1, 5);
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    const prevStep = Math.max(step - 1, 1);
    setStep(prevStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function describeError(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return "Please try again.";
  }

  async function handleSaveInquiry() {
    clearErrors(["mobileNumber", "email"]);
    const valid = await validateThroughStep(3);
    if (!valid) {
      return;
    }

    setIsSubmitting(true);
    try {
      const formValues = getValues();
      const { form: syncedForm } = await ensureInquiryClientSynced(formValues);

      saveInquiryRecord({
        id: isEditSession ? editingInquiryId : undefined,
        form: syncedForm,
        quotation: calculateQuotation(syncedForm, services),
        status: "inquiry",
      });

      clearWizardDraft();
      toast.success("Inquiry saved", {
        description: "The inquiry is now available in the Inquiry list.",
      });
      router.push("/inquiries");
    } catch (error) {
      toast.error("Could not save inquiry", {
        description: describeError(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddToProject() {
    clearErrors(["mobileNumber", "email"]);
    const valid = await validateThroughStep(3);
    if (!valid) {
      return;
    }

    setStep(5);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function createProjectFromWizard() {
    const existingInquiry = editingInquiryId ? getInquiry(editingInquiryId) : undefined;
    if (existingInquiry?.projectId) {
      toast.info("Project already exists for this inquiry.");
      router.push(`/projects/${existingInquiry.projectId}`);
      return;
    }

    const formValues = getValues();
    const { form: syncedForm } = await ensureInquiryClientSynced(formValues);

    const quote = calculateQuotation(syncedForm, services);
    const { advanceAmount, remainingBalance } = calculateAdvance(
      quote.grandTotal,
      syncedForm.advancePercent,
    );

    const inquiry = saveInquiryRecord({
      id: isEditSession ? editingInquiryId : undefined,
      form: syncedForm,
      quotation: quote,
      status: "project",
      advanceAmount,
      remainingBalance,
    });

    const project = createProjectFromInquiry({
      inquiryId: inquiry.id,
      form: syncedForm,
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
        method: syncedForm.advanceMethod,
        notes: syncedForm.advanceNotes || "Advance payment",
        receivedBy: user?.email ?? "",
        source: "advance",
      });
    }

    clearWizardDraft();
    setCreatedProject(project);
    toast.success("Project created successfully");
  }

  async function handleCreateProject() {
    clearErrors(["mobileNumber", "email"]);
    const valid = await validateThroughStep(5);
    if (!valid) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createProjectFromWizard();
    } catch (error) {
      toast.error("Could not create project", {
        description: describeError(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (createdProject) {
    return (
      <div className="mx-auto" style={{ maxWidth: layout.contentMaxWidth }}>
        <SuccessStep project={createdProject} />
      </div>
    );
  }

  const showPaymentActions = step === 5;
  const showDecisionActions = step === 4;
  const progressMaxStep = step >= 5 ? 5 : 4;
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
            Client → Project → Services → Quotation → Project
          </p>
        </div>
      </div>

      <Card className="overflow-hidden border-border/60 bg-background/70 shadow-xl backdrop-blur-xl dark:bg-background/40">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
          <CardTitle className="text-lg">Studio Inquiry Workflow</CardTitle>
          <CardDescription>
            Quotation uses selected services and manual inputs.
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
              {step === 3 ? <ServicesSelectionStep /> : null}
              {step === 4 ? (
                <FinalDecisionStep
                  onSaveInquiry={handleSaveInquiry}
                  onAddToProject={handleAddToProject}
                  isSubmitting={isSubmitting}
                />
              ) : null}
              {step === 5 ? <AdvancePaymentStep /> : null}
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

      {step >= 3 && step <= 5 ? (
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
      key={initialState.sessionKey}
      initialState={initialState}
    />
  );
}
