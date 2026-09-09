export function normalizeStatus(data) {
  if (data.status?.indicator) return data;
  const states = {
    UP: { indicator: "none", description: "正常运行" },
    HASISSUES: { indicator: "minor", description: "存在服务故障" },
    UNDERMAINTENANCE: { indicator: "maintenance", description: "维护中" },
  };
  const status = states[data.page?.status];
  if (!status) return data;
  const incidents = [
    ...(data.activeIncidents ?? []).filter(
      (item) => item.status !== "RESOLVED",
    ),
    ...(data.activeMaintenances ?? []).filter(
      (item) => item.status === "INPROGRESS",
    ),
  ];
  return {
    status,
    incidents: incidents.map((item) => ({
      id: item.id ?? item.url,
      name: item.name,
      status: item.status,
      updated_at: item.updatedAt ?? item.started ?? item.start,
      shortlink: item.url,
    })),
  };
}
