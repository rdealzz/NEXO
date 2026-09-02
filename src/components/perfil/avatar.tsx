import { acharAvatar, avatarPadrao, type Avatar } from "@/lib/avatares";

/**
 * O retrato.
 *
 * Cada bicho é montado com as mesmas peças — disco, cabeça, orelhas, olhos —
 * variando forma e cor. Assim os oito parecem uma família, não oito desenhos
 * avulsos, e cada um continua legível a 28px no cabeçalho.
 */
export function AvatarNexo({
  id,
  semente = "nexo",
  className = "size-10",
}: {
  id?: string | null;
  semente?: string;
  className?: string;
}) {
  const bicho = acharAvatar(id) ?? avatarPadrao(semente);

  return (
    <svg viewBox="0 0 100 100" className={`${className} shrink-0 rounded-full`} role="img" aria-label={bicho.nome}>
      <circle cx="50" cy="50" r="50" fill={bicho.fundo} />
      <g>{desenho(bicho)}</g>
    </svg>
  );
}

function desenho(a: Avatar) {
  const olhos = (
    <>
      <circle cx="40" cy="52" r="4.2" fill="#1d1b16" />
      <circle cx="60" cy="52" r="4.2" fill="#1d1b16" />
      <circle cx="41.4" cy="50.6" r="1.4" fill="#fff" />
      <circle cx="61.4" cy="50.6" r="1.4" fill="#fff" />
    </>
  );

  switch (a.id) {
    case "raposa":
      return (
        <>
          <path d="M22 34l12 12-6 12z" fill={a.corpo} />
          <path d="M78 34L66 46l6 12z" fill={a.corpo} />
          <path d="M50 30c16 0 26 12 26 26 0 14-12 24-26 24S24 70 24 56c0-14 10-26 26-26z" fill={a.corpo} />
          <path d="M50 56c9 0 16 6 16 14 0 7-7 12-16 12s-16-5-16-12c0-8 7-14 16-14z" fill={a.detalhe} />
          {olhos}
          <circle cx="50" cy="68" r="4" fill="#1d1b16" />
        </>
      );
    case "leao":
      return (
        <>
          {[...Array(12)].map((_, i) => {
            const ang = (i / 12) * Math.PI * 2;
            return (
              <circle
                key={i}
                cx={50 + Math.cos(ang) * 27}
                cy={54 + Math.sin(ang) * 27}
                r="11"
                fill={a.detalhe}
                opacity="0.55"
              />
            );
          })}
          <circle cx="50" cy="54" r="26" fill={a.corpo} />
          {olhos}
          <path d="M44 66h12l-6 6z" fill="#1d1b16" />
        </>
      );
    case "tucano":
      return (
        <>
          <circle cx="46" cy="50" r="26" fill={a.corpo} />
          <path d="M62 44c14-4 24 2 26 8-6 8-18 12-28 8z" fill={a.detalhe} />
          <path d="M62 44c10-3 18-1 22 3-4 4-12 6-20 5z" fill="#f6c14b" />
          <circle cx="42" cy="46" r="7" fill="#fff" />
          <circle cx="42" cy="46" r="3.6" fill="#1d1b16" />
        </>
      );
    case "camelo":
      return (
        <>
          {/* A corcova atrás, depois a cabeça: é ela que faz reconhecer o bicho. */}
          <ellipse cx="50" cy="36" rx="27" ry="13" fill={a.corpo} opacity="0.75" />
          <ellipse cx="33" cy="30" rx="6" ry="8" fill={a.corpo} transform="rotate(-20 33 30)" />
          <ellipse cx="67" cy="30" rx="6" ry="8" fill={a.corpo} transform="rotate(20 67 30)" />
          <ellipse cx="50" cy="54" rx="19" ry="23" fill={a.corpo} />
          <ellipse cx="50" cy="70" rx="14" ry="12" fill={a.detalhe} opacity="0.35" />
          <circle cx="42" cy="48" r="3.8" fill="#1d1b16" />
          <circle cx="58" cy="48" r="3.8" fill="#1d1b16" />
          <circle cx="43.2" cy="46.8" r="1.3" fill="#fff" />
          <circle cx="59.2" cy="46.8" r="1.3" fill="#fff" />
          <ellipse cx="45" cy="68" rx="2" ry="2.6" fill="#6b4a24" />
          <ellipse cx="55" cy="68" rx="2" ry="2.6" fill="#6b4a24" />
        </>
      );
    case "pinguim":
      return (
        <>
          <ellipse cx="50" cy="56" rx="26" ry="30" fill={a.corpo} />
          <ellipse cx="50" cy="62" rx="16" ry="22" fill="#fdfdfd" />
          {olhos}
          <path d="M44 62h12l-6 8z" fill={a.detalhe} />
        </>
      );
    case "coruja":
      return (
        <>
          <path d="M26 34l10 10M74 34L64 44" stroke={a.corpo} strokeWidth="7" strokeLinecap="round" />
          <ellipse cx="50" cy="56" rx="28" ry="27" fill={a.corpo} />
          <circle cx="39" cy="52" r="12" fill="#fdfdfd" />
          <circle cx="61" cy="52" r="12" fill="#fdfdfd" />
          <circle cx="39" cy="52" r="5.5" fill="#1d1b16" />
          <circle cx="61" cy="52" r="5.5" fill="#1d1b16" />
          <path d="M44 64h12l-6 8z" fill={a.detalhe} />
        </>
      );
    case "baleia":
      return (
        <>
          <path d="M14 60c0-14 14-22 30-22s34 8 34 22-16 22-34 22S14 74 14 60z" fill={a.corpo} />
          <path d="M20 68c14 8 40 8 54 0-4 8-16 14-27 14s-23-6-27-14z" fill={a.detalhe} opacity="0.5" />
          <circle cx="34" cy="56" r="4" fill="#1d1b16" />
          <circle cx="35.2" cy="54.8" r="1.3" fill="#fff" />
          <path d="M62 30c0 8-4 12-8 14 8 0 14-6 14-14z" fill={a.detalhe} />
        </>
      );
    case "urso":
      return (
        <>
          <circle cx="28" cy="34" r="10" fill={a.corpo} />
          <circle cx="72" cy="34" r="10" fill={a.corpo} />
          <circle cx="50" cy="56" r="28" fill={a.corpo} />
          <circle cx="40" cy="52" r="3.8" fill={a.detalhe} />
          <circle cx="60" cy="52" r="3.8" fill={a.detalhe} />
          <ellipse cx="50" cy="66" rx="9" ry="7" fill="#e7eef3" />
          <ellipse cx="50" cy="64" rx="4" ry="3" fill={a.detalhe} />
        </>
      );
    default:
      return <circle cx="50" cy="55" r="26" fill={a.corpo} />;
  }
}
