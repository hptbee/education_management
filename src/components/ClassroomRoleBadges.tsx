import type { ClassroomRole } from "@/src/types/models";
import { getRolePastelStyle } from "@/src/utils/pastelPalette";

interface ClassroomRoleBadgesProps {
  roles: ClassroomRole[];
  className?: string;
  size?: "sm" | "md";
}

export function ClassroomRoleBadges({ roles, className = "", size = "sm" }: ClassroomRoleBadgesProps) {
  if (roles.length === 0) return null;

  const textClass = size === "sm" ? "text-[10px]" : "text-xs";
  const paddingClass = size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1";

  return (
    <div className={`flex flex-wrap justify-center gap-1 ${className}`}>
      {roles.map((role, index) => {
        const style = getRolePastelStyle(index);
        return (
          <span
            key={role.id}
            className={`inline-flex items-center gap-1 rounded-full font-bold ${style.badge} ${textClass} ${paddingClass}`}
          >
            {role.icon ? <span>{role.icon}</span> : null}
            <span>{role.name}</span>
          </span>
        );
      })}
    </div>
  );
}
