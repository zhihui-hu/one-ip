import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function Explanation({
  items,
}: {
  items: { title: string; text: string }[];
}) {
  return (
    <section className="reading">
      <h2>📖 拓展阅读</h2>
      <Accordion type="multiple">
        {items.map((item, i) => (
          <AccordionItem value={String(i)} key={item.title}>
            <AccordionTrigger>{item.title}</AccordionTrigger>
            <AccordionContent>
              <p className="explanation-text">{item.text}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
