"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

const ITEMS = [
  { href: "/", label: "Home", icon: "M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" },
  { href: "/bible", label: "Bible", icon: "M5 4h10a4 4 0 014 4v12H9a4 4 0 01-4-4zM9 4v16" },
  { href: "/pray", label: "Pray", icon: "M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z" },
  { href: "/journal", label: "Journal", icon: "M6 3h12v18H6zM9 8h6M9 12h6M9 16h4" },
  { href: "/journey", label: "My Account", icon: "M12 3c3 4 6 6 6 10a6 6 0 01-12 0c0-4 3-6 6-10z" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col gap-2 p-5 bg-ivory/80 backdrop-blur border-r border-gold/20">
        <Link href="/" className="flex items-center gap-3 mb-6">
          <Logo />
          <span className="font-display font-extrabold leading-tight">LAMB<br />OF CHRIST</span>
        </Link>
        <nav aria-label="Primary" className="flex flex-col gap-1">
          {ITEMS.map((i) => (
            <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined}
              className={`flex items-center gap-3 min-h-[48px] px-4 rounded-full font-bold transition ${active(i.href) ? "bg-sage text-white shadow-soft" : "hover:bg-cream-deep"}`}>
              <Icon d={i.icon} />{i.label}
            </Link>
          ))}
        </nav>
      </aside>
      {/* Mobile bottom bar */}
      <nav aria-label="Primary" className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-ivory/95 backdrop-blur border-t border-gold/20 pb-[env(safe-area-inset-bottom)]">
        <ul className="flex justify-around">
          {ITEMS.map((i) => (
            <li key={i.href} className="flex-1">
              <Link href={i.href} aria-current={active(i.href) ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-[11px] font-bold ${active(i.href) ? "text-sage-dark" : "text-cocoa-soft"}`}>
                <span className={`px-4 py-1 rounded-full transition ${active(i.href) ? "bg-sage-light" : ""}`}><Icon d={i.icon} /></span>
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
