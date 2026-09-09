import { useEffect } from "react";
import { ActionButton } from "@/components/toolkit";
import { Field, FieldGroup, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  query: z.string().trim().min(1, "请输入查询内容").max(253, "输入过长"),
});
export function LookupForm({
  value = "",
  placeholder,
  busy,
  label = "查询",
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
    <form onSubmit={form.handleSubmit((data) => onSubmit(data.query))}>
      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.query}>
          <Container
            className={grouped ? "lookup-input-group h-9" : "lookup-form"}
          >
            <Control
              aria-label={placeholder}
              placeholder={placeholder}
              aria-invalid={!!form.formState.errors.query}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
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
                  {busy ? "查询中..." : label}
                </ActionButton>
              </InputGroupAddon>
            ) : (
              <ActionButton type="submit" busy={busy}>
                {label}
              </ActionButton>
            )}
          </Container>
          <FieldError errors={[form.formState.errors.query]} />
        </Field>
      </FieldGroup>
    </form>
  );
}
