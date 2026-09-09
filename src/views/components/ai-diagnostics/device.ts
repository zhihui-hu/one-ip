export async function deviceInfo() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  let fingerprint = "不可用";
  if (context) {
    context.font = "16px system-ui";
    context.fillText("Net.Coffee · IP diagnostics", 4, 20);
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(canvas.toDataURL()),
    );
    fingerprint = [...new Uint8Array(digest)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16);
  }
  const gl = document.createElement("canvas").getContext("webgl");
  let renderer = "不可用";
  if (gl) {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    renderer = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
      : "浏览器已隐藏";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
  return [
    ["时区", Intl.DateTimeFormat().resolvedOptions().timeZone],
    ["语言", navigator.language],
    ["操作系统 / 浏览器", navigator.userAgent],
    ["触屏", navigator.maxTouchPoints > 0 ? "支持" : "不支持"],
    ["网络类型", "浏览器未标准化提供"],
    ["Do Not Track", navigator.doNotTrack ?? "未设置"],
    ["WebGL 渲染器", renderer],
    ["Canvas 指纹", fingerprint],
  ] as [string, string][];
}
