// =============================================================
// /dashboard/* — Error boundary for dashboard pages
// =============================================================

"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError]", error.message, error.digest);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-8 pb-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Dashboard error</h2>
            <p className="text-sm text-muted-foreground">
              Something went wrong loading your dashboard. Please try again.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={reset} size="sm">
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Retry
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/agents">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Marketplace
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
