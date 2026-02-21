// =============================================================
// /sign-in — Clerk Sign In page
// =============================================================

import { SignIn } from "@clerk/nextjs";

export const metadata = {
  title: "Sign In — AI Agent Marketplace",
  description: "Sign in to your AI Agent Marketplace account.",
};

export default function SignInPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg",
          },
        }}
      />
    </div>
  );
}
