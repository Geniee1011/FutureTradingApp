"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/Field";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Password field with a single, consistent show/hide toggle. The browsers'
 * native reveal control (Edge's `::-ms-reveal`, etc.) is suppressed globally in
 * globals.css so this is the only eye icon shown. Do not pass `type` — it's
 * owned by the toggle.
 */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = useState(false);
    return (
      <div className="relative">
        <Input ref={ref} type={show ? "text" : "password"} className={cn("pr-10", className)} {...props} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted transition-colors hover:text-foreground"
        >
          <Icon name={show ? "eyeOff" : "eye"} width={18} height={18} />
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
