export interface ServicePrices {
  basic: number;
  standard: number;
  premium: number;
}

export interface StudioService {
  id: string;
  studioId: string;
  name: string;
  category: string;
  description: string;
  active: boolean;
  mandatory: boolean;
  isStudioRent: boolean;
  sortOrder: number;
  legacyPrice: number;
  prices: ServicePrices;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
