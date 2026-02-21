// =============================================================
// /sign-up — Clerk Sign Up page
// =============================================================

import { SignUp } from "@clerk/nextjs";

export const metadata = {
  title: "Sign Up — AI Agent Marketplace",
  description: "Create your AI Agent Marketplace account.",
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <SignUp
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
