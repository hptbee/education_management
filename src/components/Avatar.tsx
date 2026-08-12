const avatarColors = ["bg-[#ffd86f]", "bg-[#9ce8c5]", "bg-[#8fd8ff]", "bg-[#ff9fd0]", "bg-[#b89cff]"];

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
      className={`${sizeClass} grid shrink-0 place-items-center overflow-hidden rounded-[35%] border-4 border-white shadow-[0_8px_0_rgba(41,48,77,0.12)] ${avatarColors[name.length % avatarColors.length]} font-black text-[#29304d]`}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span>{initials || "?"}</span>}
    </div>
  );
}
