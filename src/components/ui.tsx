import { cva, type VariantProps } from "class-variance-authority";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-bold transition hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#7c5cff] text-white shadow-[0_10px_0_#5d43c9] hover:bg-[#6d4ef0]",
        sunny: "bg-[#ffd86f] text-[#473100] shadow-[0_10px_0_#e3b83f] hover:bg-[#ffcf4d]",
        mint: "bg-[#60d394] text-[#12351f] shadow-[0_10px_0_#37aa6c] hover:bg-[#51c986]",
        peach: "bg-[#ff8f70] text-white shadow-[0_10px_0_#d7664a] hover:bg-[#ff7d59]",
        ghost: "bg-white/75 text-[#29304d] shadow-[0_6px_0_rgba(41,48,77,0.12)] hover:bg-white",
        danger: "bg-[#ff7f96] text-white shadow-[0_10px_0_#d95d74] hover:bg-[#ff6c86]",
      },
      size: {
        sm: "min-h-10 px-4 text-sm",
        md: "min-h-12 px-5 text-base",
        lg: "min-h-14 px-7 text-lg",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), "select-none", className)} {...props} />;
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[2rem] border border-white/80 bg-white/88 p-5 shadow-[0_14px_28px_rgba(67,60,133,0.10),0_2px_0_rgba(255,255,255,0.75)_inset] backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full bg-[#fff0ad] px-3 py-1 text-sm font-bold text-[#614800] shadow-sm", className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-12 w-full rounded-2xl border border-[#d9d2ff] bg-white px-4 text-[#29304d] outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#b89cff]/25",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-2xl border border-[#d9d2ff] bg-white px-4 py-3 text-[#29304d] outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#b89cff]/25",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "min-h-12 w-full rounded-2xl border border-[#d9d2ff] bg-white px-4 text-[#29304d] outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#b89cff]/25",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#4c557c]">
      {label}
      {children}
    </label>
  );
}
