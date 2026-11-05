import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/i18n";
import { adSlots, type AdSlot } from "@/lib/ad-slots";
import { cn } from "@/lib/utils";
import { iconTone } from "@/views/home/components/home-shortcuts";
import {
  Bot,
  Briefcase,
  ChartLine,
  Code,
  Eye,
  Fingerprint,
  Globe,
  Hourglass,
  Image,
  LayoutTemplate,
  Network,
  Rocket,
  Server,
  ShieldCheck,
  Target,
  UserRoundSearch,
  type LucideIcon,
} from "lucide-react";

/** One page section in the site's standard card. */
function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        {hint && (
          <p className="m-0 text-[13px] text-muted-foreground">{hint}</p>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Icon tile matching the tool directory at the bottom of every page. */
function IconTile({ icon: Icon, index }: { icon: LucideIcon; index: number }) {
  return (
    <span
      className={cn(
        "grid size-9 flex-none place-items-center rounded-[10px] [&_svg]:size-[18px] [&_svg]:stroke-[1.75]",
        iconTone(index + 1),
      )}
    >
      <Icon aria-hidden="true" />
    </span>
  );
}

function FeatureItem({
  icon,
  index,
  title,
  text,
}: {
  icon: LucideIcon;
  index: number;
  title: string;
  text: string;
}) {
  return (
    <div className="flex min-w-0 gap-3 rounded-[12px] bg-muted/50 p-3">
      <IconTile icon={icon} index={index} />
      <div className="min-w-0">
        <h3 className="m-0 text-[13px] font-semibold">{title}</h3>
        <p className="mt-0.5 mb-0 text-[12px] leading-relaxed text-muted-foreground">
          {text}
        </p>
      </div>
    </div>
  );
}

const audience = [
  ["proxy", Network],
  ["ecommerce", Globe],
  ["ai", Bot],
  ["vps", Server],
  ["privacy", UserRoundSearch],
  ["dev", Code],
] as const;
const advertisers = [
  ["proxy", Network],
  ["vps", Server],
  ["vpn", ShieldCheck],
  ["browser", Fingerprint],
  ["network", Rocket],
  ["saas", Briefcase],
] as const;
const benefits = [
  ["native", LayoutTemplate],
  ["intent", Target],
  ["data", ChartLine],
  ["reach", Eye],
] as const;

export function AudienceSections() {
  return (
    <>
      <SectionCard
        title={t("advertise.audience.title")}
        hint={t("advertise.audience.hint")}
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {audience.map(([key, icon], index) => (
            <FeatureItem
              key={key}
              icon={icon}
              index={index}
              title={t(`advertise.audience.${key}.title`)}
              text={t(`advertise.audience.${key}.text`)}
            />
          ))}
        </div>
      </SectionCard>
      <SectionCard
        title={t("advertise.advertisers.title")}
        hint={t("advertise.advertisers.hint")}
      >
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {advertisers.map(([key, Icon]) => (
            <li
              key={key}
              className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground"
            >
              <Icon aria-hidden="true" className="size-3.5 text-primary" />
              {t(`advertise.advertisers.${key}`)}
            </li>
          ))}
        </ul>
      </SectionCard>
      <SectionCard title={t("advertise.benefits.title")}>
        <div className="grid gap-2 sm:grid-cols-2">
          {benefits.map(([key, icon], index) => (
            <FeatureItem
              key={key}
              icon={icon}
              index={index}
              title={t(`advertise.benefits.${key}.title`)}
              text={t(`advertise.benefits.${key}.text`)}
            />
          ))}
        </div>
      </SectionCard>
    </>
  );
}

function SlotStatus({ slot }: { slot: AdSlot }) {
  const free =
    slot.total === undefined ? undefined : slot.total - (slot.booked ?? 0);
  return (
    <Badge variant={free === 0 ? "secondary" : "success"}>
      {free === undefined
        ? t("advertise.slots.open")
        : free > 0
          ? t("advertise.slots.available", [free])
          : t("advertise.slots.full")}
    </Badge>
  );
}

export function SlotSection() {
  return (
    <SectionCard
      title={t("advertise.slots.title")}
      hint={t("advertise.slots.hint")}
    >
      <div className="grid gap-2 md:grid-cols-2">
        {adSlots.map((slot) => (
          <div
            key={slot.id}
            className="flex min-w-0 flex-col gap-2.5 rounded-[12px] bg-muted/50 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="m-0 text-[13px] font-semibold">
                {t(`advertise.slots.${slot.id}.name`)}
              </h3>
              <SlotStatus slot={slot} />
            </div>
            <p className="m-0 text-[12px] leading-relaxed text-muted-foreground">
              {t(`advertise.slots.${slot.id}.text`)}
            </p>
            <div className="flex gap-2 text-[12px]">
              <Image
                aria-hidden="true"
                className="mt-0.5 size-3.5 flex-none text-primary"
              />
              <div>
                <p className="m-0 font-medium">
                  {t(`advertise.slots.${slot.id}.size`)}
                </p>
                <p className="m-0 text-muted-foreground">
                  {t(`advertise.slots.${slot.id}.sizeHint`)}
                </p>
              </div>
            </div>
            {slot.nextFree && (
              <div className="flex items-center gap-2 text-[12px] font-medium">
                <Hourglass
                  aria-hidden="true"
                  className="size-3.5 flex-none text-primary"
                />
                {t("advertise.slots.nextFree", [slot.nextFree])}
              </div>
            )}
            <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-2.5">
              <strong className="text-sm font-semibold">
                {slot.price ?? t("advertise.slots.priceOnRequest")}
              </strong>
              <a
                href="#advertise-contact"
                className="text-[13px] font-medium text-primary hover:underline"
              >
                {t("advertise.slots.book")}
              </a>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 mb-0 text-[12px] leading-relaxed text-muted-foreground">
        {t("advertise.materials")}
      </p>
    </SectionCard>
  );
}
