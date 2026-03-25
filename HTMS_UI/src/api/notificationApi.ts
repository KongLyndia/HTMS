import axiosClient from "./axiosClient";

export interface NotificationItem {
  notificationId: string;
  title:          string;
  message:        string;
  isRead:         boolean;
  linkUrl:        string | null;
  senderName:     string | null;
  senderAvatar:   string | null;
  createdAt:      string;
}

export interface NotificationSummary {
  unreadCount: number;
  items:       NotificationItem[];
}

export const notificationApi = {
  getSummary: (page = 1, pageSize = 20) =>
    axiosClient.get(`/notification?page=${page}&pageSize=${pageSize}`) as unknown as Promise<NotificationSummary>,

  markRead: (id: string) =>
    axiosClient.patch(`/notification/${id}/read`) as unknown as Promise<void>,

  markAllRead: () =>
    axiosClient.patch("/notification/read-all") as unknown as Promise<void>,

  deleteOne: (id: string) =>
    axiosClient.delete(`/notification/${id}`) as unknown as Promise<void>,
};