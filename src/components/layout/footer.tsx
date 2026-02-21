// =============================================================
// Footer — Site-wide footer with links & legal
// =============================================================

import Link from "next/link";
import { Bot } from "lucide-react";

const footerLinks = [
  { label: "Marketplace", href: "/agents" },
  { label: "Pricing", href: "/pricing" },
  { label: "Sign In", href: "/sign-in" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bot className="h-4 w-4" />
          <span>© {year} AI Agent Marketplace SA. All rights reserved.</span>
        </div>

        {/* Links */}
        <nav className="flex items-center gap-4">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
