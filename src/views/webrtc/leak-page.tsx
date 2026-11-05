import WebRtcPage from ".";
import { PageHeading } from "@/components/toolkit";
import { t } from "@/i18n";

/** Standalone WebRTC leak page under "Leak test". */
export default function WebRtcLeakPage() {
  return (
    <>
      <PageHeading title={t("navigation.webrtcLeak")} />
      <WebRtcPage />
    </>
  );
}
