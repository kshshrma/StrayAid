export interface OrganizationMember {
  userId: string;
  role: "admin" | "coordinator" | "vet" | "volunteer";
  name?: string;
}

export interface Organization {
  id: string;
  name: string;
  description: string;
  logo?: string;
  organizationType:
    | "rescue_ngo"
    | "veterinary"
    | "shelter"
    | "rescue_team"
    | "wildlife"
    | "animal_welfare"
    | "group_channel";
  city: string;
  state: string;
  serviceAreas: string[];
  latitude?: number;
  longitude?: number;
  verified: boolean;
  verificationStatus: "verified" | "pending" | "rejected" | "suspended";
  active: boolean;
  emergencyAvailable: boolean;
  availabilityStatus: "available" | "limited" | "offline";
  emergencyResponseEnabled: boolean;
  operatingHours: string;
  phone: string;
  alternatePhone?: string;
  email: string;
  website?: string;
  address: string;
  members: OrganizationMember[];
  stats: {
    casesResolved: number;
    activeRescues: number;
  };
  createdAt: string;
  lastVerifiedAt: string;
  distanceKm?: number;
}

export interface Helpline {
  id: string;
  name: string;
  category:
    | "emergency"
    | "veterinary"
    | "rescue"
    | "wildlife"
    | "cruelty"
    | "government"
    | "shelter"
    | "ambulance";
  phone: string;
  alternatePhone?: string;
  state: string;
  city: string;
  serviceArea: string;
  operatingHours: string;
  emergency: boolean;
  verifiedSource: string;
  sourceUrl?: string;
  active: boolean;
  lastVerifiedAt: string;
  notes?: string;
}

export interface RescueDetails {
  emergencyType?: string;
  animalInfo?: string;
  location?: string;
  urgency?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
}

export interface ReportSummaryContext {
  reportId: string;
  animalType: string;
  breed?: string;
  name?: string;
  color?: string;
  status: "lost" | "found" | "pending" | "emergency";
  location: string;
  image?: string;
  lastSeen?: string;
  urgency?: string;
}

export interface NGOConversation {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationLogo?: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  reportId?: string;
  requestType: "general" | "lost_report" | "found_report" | "emergency_rescue" | "veterinary";
  rescueStatus?: "pending" | "reviewing" | "accepted" | "declined" | "in_progress" | "resolved";
  rescueDetails?: RescueDetails;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

export interface NGOMessage {
  id: string;
  conversationId: string;
  organizationId: string;
  senderId: string;
  senderType: "user" | "ngo";
  senderName: string;
  senderAvatar?: string;
  content: string;
  messageType: "text" | "report_card" | "rescue_card" | "status_update";
  reportContext?: ReportSummaryContext;
  createdAt: string;
  isRead: boolean;
}
