import Image from "next/image";
import Link from "next/link";

export function NavBar() {
  return (
    <header role="banner" className="border-b border-linen bg-white px-6 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-apricot-soft">
            <Image
              src="/hagal/hagal-fox.png"
              alt="Hagal the fox"
              width={36}
              height={36}
            />
          </span>
          <span className="font-display text-2xl font-bold tracking-tight text-pine">
            Hagal
          </span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-4 text-sm font-bold">
          <Link
            href="/"
            className="rounded-full bg-pine px-4 py-2 text-white hover:bg-pine/90"
          >
            New quote
          </Link>
        </nav>
      </div>
    </header>
  );
}
