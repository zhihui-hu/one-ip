import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { t } from "@/i18n";

export function LookupFaq({
  items,
}: {
  items: { title: string; text: string }[];
}) {
  return (
    <section className="mt-4" aria-label={t("lookup.frequentlyAskedQuestions")}>
      <Card className="gap-1.5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("lookup.frequentlyAskedQuestions")}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              FAQ
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {items.map((item) => (
              <AccordionItem
                key={item.title}
                value={item.title}
                className="border-0"
              >
                <AccordionTrigger className="gap-3 px-2 py-2 text-[13px] hover:bg-muted/60 hover:no-underline">
                  {item.title}
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-3">
                  <p className="whitespace-pre-line text-[13px] leading-6 text-muted-foreground">
                    {item.text}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </section>
  );
}
