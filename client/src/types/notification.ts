export type NotificationCategory = "all" | "lost_found" | "nearby_report" | "rescue_alert";

export interface AppNotification {
  id: string;
  category: "lost_found" | "nearby_report" | "rescue_alert" | "status_update";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  location?: string;
  distanceKm?: number;
  animalType?: string;
  breed?: string;
  imageUrl?: string;
  linkUrl?: string;
  meta?: {
    reportId?: string;
    lostFoundId?: string;
    severity?: string;
    messageId?: string;
    senderId?: string;
    content?: string;
  };
}
