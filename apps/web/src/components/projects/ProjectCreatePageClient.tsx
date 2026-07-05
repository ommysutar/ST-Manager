"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Label, Textarea } from "@st-manager/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useStudioServices } from "@/hooks/useInquiryStorage";
import { layout } from "@st-manager/theme";
import {
  defaultManualProjectValues,
  manualProjectSchema,
  type ManualProjectFormValues,
} from "@/lib/projects/project.schema";
import { createProject } from "@/lib/projects/storage";

export function ProjectCreatePageClient() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const services = useStudioServices();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ManualProjectFormValues>({
    resolver: zodResolver(manualProjectSchema),
    defaultValues: defaultManualProjectValues,
  });

  const selectedServiceIds = useWatch({ control, name: "selectedServiceIds" }) ?? [];

  function toggleService(serviceId: string) {
    const next = selectedServiceIds.includes(serviceId)
      ? selectedServiceIds.filter((id) => id !== serviceId)
      : [...selectedServiceIds, serviceId];
    setValue("selectedServiceIds", next, { shouldValidate: true });
  }

  function onSubmit(values: ManualProjectFormValues) {
    const project = createProject({
      source: "manual",
      projectName: values.projectName,
      clientName: values.clientName,
      clientMobile: values.clientMobile,
      assignedEngineer: values.assignedEngineer,
      selectedServiceIds: values.selectedServiceIds,
      notes: values.notes,
    });

    toast.success("Project created", {
      description: "Tasks were generated from selected services.",
    });
    router.push(`/projects/${project.id}`);
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Sign in to create projects.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex flex-col gap-6" style={{ maxWidth: layout.contentMaxWidth }}>
      <div>
        <Link href="/projects" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New Project</h1>
        <p className="text-sm text-muted-foreground">
          Manual project creation uses the same project entity as the inquiry wizard.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name *</Label>
                <Input id="projectName" {...register("projectName")} />
                {errors.projectName ? (
                  <p className="text-sm text-destructive">{errors.projectName.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name *</Label>
                <Input id="clientName" {...register("clientName")} />
                {errors.clientName ? (
                  <p className="text-sm text-destructive">{errors.clientName.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientMobile">Client Mobile</Label>
                <Input id="clientMobile" {...register("clientMobile")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedEngineer">Assigned Engineer</Label>
                <Input id="assignedEngineer" placeholder="Engineer name" {...register("assignedEngineer")} />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Services *</Label>
              <p className="text-xs text-muted-foreground">
                Selected services generate the default task workflow.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {services.map((service) => (
                  <label
                    key={service.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-3"
                  >
                    <Checkbox
                      checked={selectedServiceIds.includes(service.id)}
                      onCheckedChange={() => toggleService(service.id)}
                    />
                    <span className="text-sm">{service.name}</span>
                  </label>
                ))}
              </div>
              {errors.selectedServiceIds ? (
                <p className="text-sm text-destructive">{errors.selectedServiceIds.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={3} {...register("notes")} />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={isSubmitting}>
                Create Project
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/projects">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
