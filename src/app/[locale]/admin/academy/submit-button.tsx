"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = ComponentProps<typeof Button> & { pendingLabel?: ReactNode };

export function SubmitButton({ children, pendingLabel, disabled, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} type="submit" disabled={disabled || pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
