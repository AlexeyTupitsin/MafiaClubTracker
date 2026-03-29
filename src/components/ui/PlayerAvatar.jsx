import { useState } from "react";

const SIZES = {
  sm: { outer: "w-7 h-7", text: "text-[10px]" },
  md: { outer: "w-11 h-11", text: "text-sm" },
  lg: { outer: "w-[72px] h-[72px]", text: "text-xl" },
};

function getInitials(nickname) {
  if (!nickname) return "?";
  return nickname.slice(0, 2).toUpperCase();
}

export function PlayerAvatar({ player, size = "md" }) {
  const [imgError, setImgError] = useState(false);
  const { outer, text } = SIZES[size] ?? SIZES.md;

  const showImg = player?.avatarUrl && !imgError;

  return (
    <div className={`${outer} rounded-full shrink-0 overflow-hidden`}>
      {showImg ? (
        <img
          src={player.avatarUrl}
          alt={player?.nickname ?? ""}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={`w-full h-full rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold ${text}`}>
          {getInitials(player?.nickname)}
        </div>
      )}
    </div>
  );
}
