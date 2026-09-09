self.onmessage = () => {
  self.postMessage({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    languages: Array.from(navigator.languages),
    hardwareConcurrency: navigator.hardwareConcurrency,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
};
export {};
