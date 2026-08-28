import type { AuthUserDto } from "@st-manager/contracts";
import type { StudioSettingsResponseDto, UpdateStudioSettingsDto } from "@st-manager/contracts";

import type { StudioProfile, UserRole } from "@/lib/profile/types";
import { createDefaultWhatsAppSettings } from "@/lib/whatsapp/constants";
import type { WhatsAppSettings } from "@/lib/whatsapp/types";

function normalizeRole(role: string): UserRole {
  if (role === "owner") return "owner";
  if (role === "engineer") return "engineer";
  return "assistant";
}

function defaultProfile(user: AuthUserDto): StudioProfile {
  return {
    userId: user.id,
    role: normalizeRole(user.role),
    profilePhotoDataUrl: "",
    fullName: user.fullName?.trim() || "",
    studioName: "",
    mobile: "",
    email: user.email,
    address: "",
    website: "",
    facebook: "",
    instagram: "",
    youtube: "",
    upiQrDataUrl: "",
    signatureDataUrl: "",
    logoDataUrl: "",
    gstNumber: "",
    bankDetails: { accountName: "", accountNumber: "", ifsc: "", bankName: "" },
    upiId: "",
    footerText: "",
    termsAndConditions: "",
    thankYouMessage: "Thank you for choosing us!",
    updatedAt: new Date().toISOString(),
  };
}

export function profileFromSettingsJson(
  user: AuthUserDto,
  raw: unknown,
): StudioProfile {
  const fallback = defaultProfile(user);
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const parsed = raw as Partial<StudioProfile>;
  return {
    ...fallback,
    ...parsed,
    bankDetails: { ...fallback.bankDetails, ...(parsed.bankDetails ?? {}) },
    userId: user.id,
    fullName: parsed.fullName?.trim() || fallback.fullName,
    email: parsed.email?.trim() || fallback.email,
  };
}

export function profileToSettingsJson(profile: StudioProfile): unknown {
  return {
    userId: profile.userId,
    role: profile.role,
    profilePhotoDataUrl: profile.profilePhotoDataUrl,
    fullName: profile.fullName,
    studioName: profile.studioName,
    mobile: profile.mobile,
    email: profile.email,
    address: profile.address,
    website: profile.website,
    facebook: profile.facebook,
    instagram: profile.instagram,
    youtube: profile.youtube,
    upiQrDataUrl: profile.upiQrDataUrl,
    signatureDataUrl: profile.signatureDataUrl,
    logoDataUrl: profile.logoDataUrl,
    gstNumber: profile.gstNumber,
    bankDetails: profile.bankDetails,
    upiId: profile.upiId,
    footerText: profile.footerText,
    termsAndConditions: profile.termsAndConditions,
    thankYouMessage: profile.thankYouMessage,
    updatedAt: profile.updatedAt,
  };
}

export function whatsappFromSettingsJson(raw: unknown): WhatsAppSettings {
  const defaults = createDefaultWhatsAppSettings();
  if (!raw || typeof raw !== "object") {
    return defaults;
  }

  const parsed = raw as WhatsAppSettings;
  const templateMap = new Map((parsed.templates ?? []).map((template) => [template.id, template]));

  return {
    ...defaults,
    ...parsed,
    templates: defaults.templates.map((defaultTemplate) => {
      const saved = templateMap.get(defaultTemplate.id);
      return saved
        ? {
            ...defaultTemplate,
            ...saved,
            label: defaultTemplate.label,
          }
        : defaultTemplate;
    }),
    updatedAt: parsed.updatedAt ?? defaults.updatedAt,
  };
}

export function whatsappToSettingsJson(settings: WhatsAppSettings): unknown {
  return {
    templates: settings.templates,
    updatedAt: settings.updatedAt,
  };
}

export function settingsDtoToLocal(
  dto: StudioSettingsResponseDto,
  user: AuthUserDto,
): { profile: StudioProfile; whatsapp: WhatsAppSettings } {
  return {
    profile: profileFromSettingsJson(user, dto.profile),
    whatsapp: whatsappFromSettingsJson(dto.whatsapp),
  };
}

export function buildUpdateDto(patch: {
  profile?: StudioProfile;
  whatsapp?: WhatsAppSettings;
}): UpdateStudioSettingsDto {
  const dto: UpdateStudioSettingsDto = {};
  if (patch.profile !== undefined) {
    dto.profile = profileToSettingsJson(patch.profile);
  }
  if (patch.whatsapp !== undefined) {
    dto.whatsapp = whatsappToSettingsJson(patch.whatsapp);
  }
  return dto;
}
