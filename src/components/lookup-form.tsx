import { useEffect, useId } from "react";
import { ActionButton } from "@/components/toolkit";
import { Field, FieldGroup, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group";
import { t } from "@/i18n";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  query: z
    .string()
    .trim()
    .min(1, t("lookup.enterAQuery"))
    .max(253, t("lookup.inputIsTooLong")),
});
export function LookupForm({
  value = "",
  placeholder,
  busy,
  label = t("common.lookup"),
  onSubmit,
  grouped = false,
}: {
  grouped?: boolean;
  value?: string;
  placeholder: string;
  busy: boolean;
  label?: string;
  onSubmit: (query: string) => void;
}) {
  const errorId = useId();
  const form = useForm<{ query: string }>({
    resolver: zodResolver(schema),
    defaultValues: { query: value },
  });
  useEffect(() => {
    form.reset({ query: value });
  }, [value, form]);
  const Container = grouped ? InputGroup : "div";
  const Control = grouped ? InputGroupInput : Input;
  return (
    <form
      aria-busy={busy}
      onSubmit={form.handleSubmit((data) => {
        if (!busy) onSubmit(data.query);
      })}
    >
      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.query}>
          <Container className={grouped ? "h-9" : "flex gap-2.5"}>
            <Control
              aria-label={placeholder}
              placeholder={placeholder}
              aria-invalid={!!form.formState.errors.query}
              aria-describedby={
                form.formState.errors.query ? errorId : undefined
              }
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={
                grouped
                  ? // Font size only; keeps the Input's own line-heights.
                    "min-w-0 text-[0.85rem] leading-[1.5] md:text-[0.85rem] md:leading-[calc(1.25/0.875)]"
                  : "h-11 min-w-0 rounded-[8px]"
              }
              {...form.register("query")}
            />
            {grouped ? (
              <InputGroupAddon align="inline-end">
                <ActionButton
                  className="h-7 min-w-14 px-3"
                  size="sm"
                  type="submit"
                  busy={busy}
                >
                  {busy ? t("common.lookingUp") : label}
                </ActionButton>
              </InputGroupAddon>
            ) : (
              <ActionButton
                className="h-11 min-w-[88px]"
                type="submit"
                busy={busy}
              >
                {label}
              </ActionButton>
            )}
          </Container>
          <FieldError id={errorId} errors={[form.formState.errors.query]} />
        </Field>
      </FieldGroup>
    </form>
  );
}
