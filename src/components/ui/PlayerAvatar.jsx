import { useState } from "react";

const SIZES = {
  xs:   { outer: "w-7 h-7",            text: "text-[10px]" },
  sm:  { outer: "w-[42px] h-[42px]",  text: "text-sm" },
  base: { outer: "w-[54px] h-[54px]",  text: "text-base" },
  md:   { outer: "w-[66px] h-[66px]",  text: "text-xl" },
  lg:   { outer: "w-[108px] h-[108px]", text: "text-3xl" },
};

function getInitials(nickname) {
  if (!nickname) return "?";
  return nickname.slice(0, 2).toUpperCase();
}

export function PlayerAvatar({ player, size = "md", clickable = true }) {
  const [imgError, setImgError] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const { outer, text } = SIZES[size] ?? SIZES.md;

  const showImg = player?.avatarUrl && !imgError;
  const canClick = clickable && showImg;

  return (
    <>
      <div className={`${outer} rounded-full shrink-0 overflow-hidden ${canClick ? "cursor-pointer" : ""}`}
        onClick={() => canClick && setLightbox(true)}
      >
        {showImg ? (
          <img
            src={player.avatarUrl}
            alt={player?.nickname ?? ""}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={`w-full h-full rounded-full bg-elev-3 text-stone-300 ring-1 ring-inset ring-line-strong flex items-center justify-center font-bold ${text}`}>
            {getInitials(player?.nickname)}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightbox(false)}
        >
          <img
            src={player.avatarUrl}
            alt={player?.nickname ?? ""}
            className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
