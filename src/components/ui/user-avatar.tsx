import { useState } from "react";
import { cn } from "@/lib/utils";
import { getAvatarColor, getAvatarIcon } from "@/lib/avatars";

interface UserAvatarProps {
  name: string;
  colorId?: string;
  iconId?: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-xl",
  xl: "w-16 h-16 text-2xl",
};

export function UserAvatar({
  name,
  colorId = "green",
  iconId = "avatar_1",
  avatarUrl,
  size = "md",
  className,
}: UserAvatarProps) {
  const color = getAvatarColor(colorId);
  const icon = getAvatarIcon(iconId);
  const [imgError, setImgError] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const imageSrc = avatarUrl || icon.path;

  if (imageSrc && !imgError) {
    return (
      <div
        className={cn(
          "rounded-full flex items-center justify-center overflow-hidden transition-all duration-200 border-2",
          sizeClasses[size],
          className
        )}
        style={{ borderColor: color.bg }}
        title={name}
      >
        <img
          src={imageSrc}
          alt={name}
          width={64}
          height={64}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-medium transition-all duration-200",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: color.bg, color: color.text }}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
