export type UserRole = "employee" | "manager";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vehicle {
  id: string;
  plateNumber: string | null;
  vin: string | null;
  currentLot: string;
  lastLocation: GeoLocation | null;
  lastMovedAt: Date;
  lastMovedBy: string;
  lastMovedByUid: string;
  totalMoves: number;
  firstSeenAt: Date;
  brand: string | null;
  lastPhotoUrl: string | null;
  wasLinked?: boolean;
  linkedAt?: Date | null;
  linkedBy?: string | null;
  wasMerged?: boolean;
  mergedAt?: Date | null;
  mergedBy?: string | null;
  mergedFromIds?: string[];
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  label?: string | null;
}

export type IdentifierType = "plate" | "vin";

export interface Movement {
  id: string;
  vehicleId: string;
  identifierType: IdentifierType;
  plateNumber: string | null;
  vin: string | null;
  fromLot: string;
  toLot: string;
  employeeId: string;
  employeeName: string;
  timestamp: Date;
  notes: string | null;
  photoUrl: string;
  location: GeoLocation | null;
  hadDiscrepancy?: boolean;
  systemFromLot?: string | null;
  declaredFromLot?: string | null;
  discrepancyReason?: string | null;
  discrepancyDetails?: string | null;
}
