import Image from "next/image";
import Link from "next/link";

export function Logotipo() {
  return (
    <Link prefetch={false} href="/" className="flex items-center gap-2" aria-label="DoLado — página inicial">
      <Image src="/brand/dolado-logo-icon.svg" alt="" width={30} height={30} />
      <span className="text-[19px] font-extrabold tracking-[-0.02em] text-[var(--v2-navy)]">DoLado</span>
    </Link>
  );
}
