import { endpoint } from "@/lib/network";

export interface ServiceStatus {
  status: { indicator: string; description: string };
  incidents: {
    id: string;
    name: string;
    status: string;
    updated_at: string;
    shortlink?: string;
  }[];
  components?: { id: string; name: string; status: string }[];
  fetchedAt: string;
  source: string;
}
export const getStatus = (id: string, signal?: AbortSignal) =>
  endpoint<ServiceStatus>(`/status/${id}`, { signal });
