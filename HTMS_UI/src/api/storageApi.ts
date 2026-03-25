import axiosClient from "./axiosClient";

export interface ProjectFileItem {
  fileId:         string;
  fileName:       string;
  fileUrl:        string;
  fileType:       string;
  fileSize:       number;
  createdAt:      string;
  uploaderName:   string;
  uploaderAvatar: string | null;
  uploadedById:   string;
  canDelete:      boolean;
}

export const storageApi = {
  getFiles: (projectId: string) =>
    axiosClient.get(`/project/${projectId}/files`) as unknown as Promise<ProjectFileItem[]>,

  uploadFile: (projectId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return axiosClient.post(`/project/${projectId}/files`, fd, {
        headers: { "Content-Type": undefined },
    }) as unknown as Promise<ProjectFileItem>;
  },

  deleteFile: (projectId: string, fileId: string) =>
    axiosClient.delete(`/project/${projectId}/files/${fileId}`) as unknown as Promise<void>,
};