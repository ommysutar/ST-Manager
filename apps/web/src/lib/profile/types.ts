export type UserRole = "owner" | "assistant" | "engineer";

export interface BankDetails {
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
}

export interface StudioProfile {
  userId: string;
  role: UserRole;
  profilePhotoDataUrl: string;
  fullName: string;
  studioName: string;
  mobile: string;
  email: string;
  address: string;
  website: string;
  facebook: string;
  instagram: string;
  youtube: string;
  upiQrDataUrl: string;
  signatureDataUrl: string;
  logoDataUrl: string;
  /** Future ready — not yet enforced on documents. */
  gstNumber: string;
  bankDetails: BankDetails;
  upiId: string;
  footerText: string;
  termsAndConditions: string;
  thankYouMessage: string;
  updatedAt: string;
}

export const PROFILE_STORAGE_KEY = "st-manager-studio-profile";
