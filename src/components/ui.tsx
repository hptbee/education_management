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
  "inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-brand text-white hover:bg-brand-dark",
        sunny: "bg-pastel-yellow text-amber-800 hover:bg-amber-200/80",
        mint: "bg-pastel-sky text-sky-800 hover:bg-sky-200/80",
        peach: "bg-pastel-pink text-rose-800 hover:bg-rose-200/80",
        ghost: "border border-slate-200 bg-white text-slate-700 hover:bg-surface-soft shadow-none",
        danger: "bg-rose-100 text-rose-700 hover:bg-rose-200/80",
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
        "rounded-3xl border border-sky-100 bg-white p-5 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full bg-pastel-yellow px-3 py-1 text-sm font-bold text-amber-800 shadow-sm", className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("classroom-field min-h-12 px-4", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("classroom-field min-h-28 px-4 py-3", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("classroom-field min-h-12 px-4", className)} {...props} />;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-600">
      {label}
      {children}
    </label>
  );
}
