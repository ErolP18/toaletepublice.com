export const toiletTypes = [
  "strada",
  "parc",
  "gara",
  "piata",
  "centru-comercial",
  "statie",
  "alta",
] as const;

export type ToiletType = (typeof toiletTypes)[number];

export const toiletStatuses = ["confirmat", "exemplu", "propunere"] as const;

export type ToiletStatus = (typeof toiletStatuses)[number];

export type Toilet = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  city: string;
  county: string;
  address?: string;
  hours?: string;
  photo?: string;
  price?: string;
  accessible: boolean;
  free: boolean;
  type: ToiletType;
  status: ToiletStatus;
  notes?: string;
  source?: string;
  institutionId?: string;
  sourceRequestId?: string;
  sourceRespondedAt?: string;
};

export type ToiletDraft = {
  lat: number;
  lng: number;
  name: string;
  city: string;
  county: string;
  address: string;
  hours: string;
  price: string;
  accessible: boolean;
  free: boolean;
  type: ToiletType;
  status: ToiletStatus;
  notes: string;
};
