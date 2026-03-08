interface Props {
  className?: string
  size?: number
}

export default function BullLogo({ className = '', size = 48 }: Props) {
  return (
    <svg
      viewBox="0 0 240 180"
      width={size}
      height={size}
      fill="white"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Main body */}
      <path d="M75 118 C68 92 74 68 96 52 C118 36 150 34 176 46 C202 58 210 82 204 104 C198 126 176 140 150 142 C124 144 98 136 80 126 Z" />
      {/* Head / neck */}
      <path d="M75 118 C62 112 46 106 32 104 C18 102 10 112 14 125 C18 138 36 144 57 138 C68 135 77 127 75 118 Z" />
      {/* Horn outer */}
      <path d="M26 102 Q10 78 22 62" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" />
      {/* Horn inner */}
      <path d="M40 98 Q32 74 52 64" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* Eye */}
      <circle cx="34" cy="118" r="4" fill="#1B72CC" />
      {/* Front leg 1 */}
      <path d="M88 140 L80 170" stroke="white" strokeWidth="14" strokeLinecap="round" fill="none" />
      {/* Front leg 2 */}
      <path d="M108 143 L103 173" stroke="white" strokeWidth="13" strokeLinecap="round" fill="none" />
      {/* Back leg 1 */}
      <path d="M158 141 L166 170" stroke="white" strokeWidth="14" strokeLinecap="round" fill="none" />
      {/* Back leg 2 */}
      <path d="M174 134 L186 162" stroke="white" strokeWidth="12" strokeLinecap="round" fill="none" />
      {/* Tail */}
      <path d="M204 100 Q224 74 212 52 Q206 40 218 34" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" />
    </svg>
  )
}
