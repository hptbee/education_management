import { getAvatarPastelClass } from "@/src/utils/pastelPalette";

export function Avatar({ src, name, size = "md" }: { src?: string; name: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const sizeClass = {
    sm: "h-12 w-12 text-base",
    md: "h-16 w-16 text-xl",
    lg: "h-24 w-24 text-3xl",
    xl: "h-36 w-36 text-5xl",
  }[size];

  return (
    <div
      className={`${sizeClass} grid shrink-0 place-items-center overflow-hidden rounded-[35%] border-4 border-white shadow-sm ${getAvatarPastelClass(name)} font-black text-slate-700`}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span>{initials || "?"}</span>}
    </div>
  );
}
