import axiosClient from "./axiosClient";

export interface UserProfile {
  userId:    string;
  fullName:  string | null;
  email:     string;
  avatarUrl: string | null;
  createdAt: string;
}

export const userApi = {
  getMe: () =>
    axiosClient.get("/user/me") as unknown as Promise<UserProfile>,

  updateProfile: (fullName: string, avatar?: File | null) => {
    const fd = new FormData();
    fd.append("fullName", fullName);
    if (avatar) fd.append("avatar", avatar);
    return axiosClient.patch("/user/profile", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }) as unknown as Promise<UserProfile>;
  },

  changePassword: (oldPassword: string, newPassword: string) =>
    axiosClient.patch("/user/password", { oldPassword, newPassword }) as unknown as Promise<void>,
};