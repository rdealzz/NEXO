/**
 * A marca do NEXO.
 *
 * O símbolo é um sino de notificação com o N vazado no corpo: o mesmo desenho
 * serve de ícone do app, de ícone da notificação que chega no celular e de
 * marca no cabeçalho. O wordmark usa `currentColor`, então acompanha o tema.
 *
 * Os gradientes precisam de ids únicos quando há mais de um símbolo na mesma
 * página — daí o `id`.
 */
export function SimboloNexo({ className = "size-7", id = "nexo" }: { className?: string; id?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}-face`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#7fecc0" />
          <stop offset="0.5" stopColor="#2e9d74" />
          <stop offset="1" stopColor="#14684b" />
        </linearGradient>
        <linearGradient id={`${id}-luz`} x1="0.15" y1="0" x2="0.5" y2="0.85">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <path
          id={`${id}-sino`}
          d="M256 108c-70 0-118 52-118 140 0 56-10 106-34 136-9 11-1 28 14 28h276c15 0 23-17 14-28-24-30-34-80-34-136 0-88-48-140-118-140z"
        />
        <path id={`${id}-badalo`} d="M216 412h80c0 25-18 44-40 44s-40-19-40-44z" />
        <clipPath id={`${id}-recorte`}>
          <use href={`#${id}-sino`} />
        </clipPath>
      </defs>

      <g fill="#11543d" opacity="0.5" transform="translate(0 12)">
        <use href={`#${id}-sino`} />
        <use href={`#${id}-badalo`} />
      </g>
      <g fill={`url(#${id}-face)`}>
        <circle cx="256" cy="86" r="26" />
        <use href={`#${id}-sino`} />
        <use href={`#${id}-badalo`} />
      </g>
      <g clipPath={`url(#${id}-recorte)`}>
        <rect width="512" height="512" fill={`url(#${id}-luz)`} />
      </g>
      <path
        d="M208 336V216l96 102V216"
        fill="none"
        stroke="#fbfefc"
        strokeWidth="34"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WordmarkNexo({ className = "h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 450 200" className={`w-auto ${className}`} role="img" aria-label="NEXO">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="22"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 140V60l68 80V60" />
        <path d="M121 60v80M121 60h65M121 100h55M121 140h65" />
        <path d="M228 60l68 80M296 60l-68 80" />
        <circle cx="383" cy="100" r="44" />
      </g>
    </svg>
  );
}

export function MarcaNexo({
  className = "",
  id = "nexo",
  simbolo = "size-7",
  wordmark = "h-4",
}: {
  className?: string;
  id?: string;
  simbolo?: string;
  wordmark?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <SimboloNexo className={simbolo} id={id} />
      <WordmarkNexo className={wordmark} />
    </span>
  );
}
