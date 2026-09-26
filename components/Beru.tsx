export type BeruPose = "wave" | "lift" | "eat" | "alarm" | "cheer";

const sparkle = (s: number) =>
  `M0 -${s} L${s * 0.3} -${s * 0.3} L${s} 0 L${s * 0.3} ${s * 0.3} L0 ${s} L-${s * 0.3} ${s * 0.3} L-${s} 0 L-${s * 0.3} -${s * 0.3} Z`;

/** Beru — the BearFit mascot. A honey bear with a mango headband, five poses. */
export function Beru({
  pose = "wave",
  size = 200,
  band = "#FF8A3D",
  className,
  title,
}: {
  pose?: BeruPose;
  size?: number;
  band?: string;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {/* body */}
      <ellipse cx="100" cy="190" rx="54" ry="7" fill="#2B2335" opacity="0.10" />
      <ellipse cx="76" cy="176" rx="19" ry="13" fill="#A96A3D" />
      <ellipse cx="124" cy="176" rx="19" ry="13" fill="#A96A3D" />
      <ellipse cx="76" cy="179" rx="10" ry="6" fill="#F6DDBD" />
      <ellipse cx="124" cy="179" rx="10" ry="6" fill="#F6DDBD" />
      <ellipse cx="100" cy="138" rx="50" ry="42" fill="#C98B57" />
      <ellipse cx="100" cy="146" rx="31" ry="27" fill="#F6DDBD" />
      <circle cx="62" cy="44" r="17" fill="#C98B57" />
      <circle cx="138" cy="44" r="17" fill="#C98B57" />
      <circle cx="62" cy="44" r="9" fill="#F2B09A" />
      <circle cx="138" cy="44" r="9" fill="#F2B09A" />
      <circle cx="100" cy="80" r="47" fill="#C98B57" />
      <path d="M56 62 Q100 40 144 62 L147 74 Q100 52 53 74 Z" fill={band} />
      <circle cx="100" cy="56" r="4" fill="#FFFFFF" opacity="0.9" />
      <ellipse cx="82" cy="86" rx="5.5" ry="6.5" fill="#2B2335" />
      <ellipse cx="118" cy="86" rx="5.5" ry="6.5" fill="#2B2335" />
      <circle cx="84" cy="83.5" r="2" fill="#FFFFFF" />
      <circle cx="120" cy="83.5" r="2" fill="#FFFFFF" />
      <ellipse cx="100" cy="104" rx="17" ry="13" fill="#F6DDBD" />
      <ellipse cx="100" cy="98" rx="6.5" ry="4.8" fill="#2B2335" />
      <path d="M93 106 Q100 113 107 106" stroke="#2B2335" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <ellipse cx="70" cy="101" rx="8" ry="5" fill="#FF8FA3" opacity="0.65" />
      <ellipse cx="130" cy="101" rx="8" ry="5" fill="#FF8FA3" opacity="0.65" />

      {pose === "wave" && (
        <g>
          <ellipse cx="58" cy="138" rx="13" ry="21" fill="#B97A48" transform="rotate(25 58 138)" />
          <circle cx="50" cy="156" r="10" fill="#C98B57" />
          <ellipse cx="154" cy="108" rx="13" ry="23" fill="#B97A48" transform="rotate(25 154 108)" />
          <circle cx="164" cy="86" r="11" fill="#C98B57" />
          <ellipse cx="164" cy="87" rx="5" ry="4" fill="#F2B09A" />
          <path d="M180 72 Q186 78 182 86 M187 62 Q196 72 190 86" stroke={band} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}

      {pose === "lift" && (
        <g>
          <ellipse cx="154" cy="108" rx="13" ry="23" fill="#B97A48" transform="rotate(25 154 108)" />
          <rect x="146" y="83" width="36" height="6" rx="3" fill="#6B6275" />
          <rect x="141" y="72" width="9" height="28" rx="3" fill="#6A5AE0" />
          <rect x="178" y="72" width="9" height="28" rx="3" fill="#6A5AE0" />
          <circle cx="164" cy="86" r="10" fill="#C98B57" />
          <ellipse cx="46" cy="108" rx="13" ry="23" fill="#B97A48" transform="rotate(-25 46 108)" />
          <circle cx="36" cy="86" r="11" fill="#C98B57" />
          <path d="M30 118 Q40 108 52 116" stroke="#A96A3D" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M152 30 Q146 40 152 44 Q158 40 152 30 Z" fill="#4DB5FF" />
          <path d="M164 44 Q160 51 164 54 Q168 51 164 44 Z" fill="#4DB5FF" />
        </g>
      )}

      {pose === "eat" && (
        <g>
          <ellipse cx="62" cy="134" rx="12" ry="18" fill="#B97A48" transform="rotate(20 62 134)" />
          <ellipse cx="138" cy="134" rx="12" ry="18" fill="#B97A48" transform="rotate(-20 138 134)" />
          <path d="M64 140 H136 A36 30 0 0 1 64 140 Z" fill="#3CCB9A" />
          <ellipse cx="100" cy="140" rx="36" ry="7" fill="#2FB386" />
          <circle cx="86" cy="135" r="8" fill="#58C26B" />
          <circle cx="100" cy="131" r="9" fill="#7ED957" />
          <circle cx="114" cy="135" r="8" fill="#58C26B" />
          <circle cx="93" cy="133" r="4.5" fill="#FF6B6B" />
          <circle cx="110" cy="130" r="4" fill="#FF6B6B" />
          <ellipse cx="104" cy="137" rx="6" ry="4.5" fill="#FFFFFF" />
          <circle cx="104" cy="137" r="2.3" fill="#FFC940" />
          <circle cx="64" cy="148" r="11" fill="#C98B57" />
          <circle cx="136" cy="148" r="11" fill="#C98B57" />
          <path d={sparkle(8)} fill="#FFC940" transform="translate(160 122)" />
          <path d={sparkle(6)} fill="#FF8A3D" transform="translate(38 118)" />
        </g>
      )}

      {pose === "alarm" && (
        <g>
          <ellipse cx="64" cy="138" rx="12" ry="18" fill="#B97A48" transform="rotate(20 64 138)" />
          <ellipse cx="136" cy="138" rx="12" ry="18" fill="#B97A48" transform="rotate(-20 136 138)" />
          <circle cx="84" cy="126" r="8" fill="#FF8A3D" />
          <circle cx="116" cy="126" r="8" fill="#FF8A3D" />
          <circle cx="100" cy="150" r="25" fill="#FFC940" />
          <circle cx="100" cy="150" r="19" fill="#FFFFFF" />
          <path d="M100 150 V138 M100 150 L109 155" stroke="#2B2335" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="100" cy="150" r="2.5" fill="#2B2335" />
          <circle cx="74" cy="154" r="10" fill="#C98B57" />
          <circle cx="126" cy="154" r="10" fill="#C98B57" />
          <path
            d="M56 118 L48 112 M52 132 L42 132 M144 118 L152 112 M148 132 L158 132"
            stroke="#FF6B8B"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      )}

      {pose === "cheer" && (
        <g>
          <ellipse cx="154" cy="108" rx="13" ry="23" fill="#B97A48" transform="rotate(25 154 108)" />
          <circle cx="164" cy="86" r="11" fill="#C98B57" />
          <ellipse cx="46" cy="108" rx="13" ry="23" fill="#B97A48" transform="rotate(-25 46 108)" />
          <circle cx="36" cy="86" r="11" fill="#C98B57" />
          <ellipse cx="100" cy="108" rx="7" ry="6" fill="#2B2335" />
          <ellipse cx="100" cy="111" rx="4" ry="2.5" fill="#FF6B8B" />
          <path d={sparkle(9)} fill="#FFC940" transform="translate(28 50)" />
          <path d={sparkle(9)} fill="#FFC940" transform="translate(174 50)" />
          <path d={sparkle(6)} fill="#3CCB9A" transform="translate(18 116)" />
          <path d={sparkle(6)} fill="#FF6B8B" transform="translate(184 118)" />
          <circle cx="150" cy="30" r="4" fill="#4DB5FF" />
          <circle cx="50" cy="26" r="3.5" fill="#FF8A3D" />
        </g>
      )}
    </svg>
  );
}
