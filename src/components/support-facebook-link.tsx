"use client";

import { MessageCircle } from "lucide-react";
import { SUPPORT_FACEBOOK_CTA, SUPPORT_FACEBOOK_URL } from "@/src/auth/support-contact";
import { classroomButtonVariants } from "@/src/components/classroom";
import { cn } from "@/lib/utils";

export function SupportFacebookLink({
  variant = "primary",
  className,
}: {
  variant?: "primary" | "outline" | "secondary";
  className?: string;
}) {
  return (
    <a
      href={SUPPORT_FACEBOOK_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(classroomButtonVariants({ variant, size: "md" }), "w-full", className)}
    >
      <MessageCircle className="size-4" aria-hidden />
      {SUPPORT_FACEBOOK_CTA}
    </a>
  );
}
