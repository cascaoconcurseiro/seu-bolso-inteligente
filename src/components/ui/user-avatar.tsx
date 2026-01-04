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

export function UserAvatar({ name, colorId = "green", iconId = "avatar_1", avatarUrl, size = "md", className }: UserAvatarProps) {
  const color = getAvatarColor(colorId);
  const icon = getAvatarIcon(iconId);

  // Fallback para iniciais se não tiver imagem
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Prioridade: avatarUrl > icon.path > iniciais
  const imageSrc = avatarUrl || icon.path;

  // Se tiver path de imagem, usar a imagem
  if (imageSrc) {
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
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback para iniciais se a imagem não carregar
            const target = e.currentTarget;
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `<span class="font-medium" style="color: ${color.text}">${getInitials(name)}</span>`;
              parent.style.backgroundColor = color.bg;
            }
          }}
        />
      </div>
    );
  }

  // Fallback para iniciais
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
