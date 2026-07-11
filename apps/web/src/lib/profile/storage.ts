import type { AuthUserDto } from "@st-manager/contracts";

import { notifyProfileUpdated } from "./events";
import { getProfileSnapshot, setProfileSnapshot } from "./snapshots";
import type { StudioProfile, UserRole } from "./types";
import { PROFILE_STORAGE_KEY } from "./types";

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

export function normalizeRole(role: string): UserRole {
  if (role === "owner") {
    return "owner";
  }
  if (role === "engineer") {
    return "engineer";
  }
  return "assistant";
}

export function loadProfile(user: AuthUserDto): StudioProfile {
  if (typeof window === "undefined") {
    return defaultProfile(user);
  }

  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      return defaultProfile(user);
    }

    const parsed = JSON.parse(raw) as StudioProfile;
    if (parsed.userId !== user.id) {
      return defaultProfile(user);
    }

    const fallback = defaultProfile(user);
    return {
      ...fallback,
      ...parsed,
      bankDetails: { ...fallback.bankDetails, ...parsed.bankDetails },
      userId: user.id,
      fullName: parsed.fullName?.trim() || fallback.fullName,
      email: parsed.email?.trim() || fallback.email,
    };
  } catch {
    return defaultProfile(user);
  }
}

export function saveProfile(profile: StudioProfile): StudioProfile {
  const updated: StudioProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
  setProfileSnapshot(updated);
  notifyProfileUpdated();
  return updated;
}

export function mergeServerProfile(
  user: AuthUserDto,
  server: {
    fullName?: string | null;
    phone?: string | null;
    studioName?: string | null;
    email?: string;
  },
): StudioProfile {
  const current = loadProfile(user);
  return saveProfile({
    ...current,
    userId: user.id,
    fullName: server.fullName?.trim() || current.fullName,
    mobile: server.phone?.trim() || current.mobile,
    studioName: server.studioName?.trim() || current.studioName,
    email: server.email?.trim() || current.email || user.email,
  });
}

export function initializeProfileSnapshot(user: AuthUserDto | null): StudioProfile | null {
  if (!user) {
    setProfileSnapshot(null);
    return null;
  }

  const profile = loadProfile(user);
  setProfileSnapshot(profile);
  return profile;
}

export { getProfileSnapshot };
