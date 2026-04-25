"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FcGoogle } from "react-icons/fc";
import Agent from "@/components/Agent";

export function HomeAgentSection() {
  const { signIn } = useAuthActions();

  return (
    <section
      id="agent-interface"
      aria-label="AI Agent Interface"
      className="flex flex-col gap-4"
    >
      <AuthLoading>
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Spinner className="size-5" />
          <span>Loading session…</span>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <div className="flex w-full justify-center py-8">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => void signIn("google")}
            className="h-11 gap-2.5 rounded-full px-8 text-sm font-medium min-w-[240px] justify-center"
          >
            <FcGoogle className="size-5 shrink-0" aria-hidden />
            Sign in with Google
          </Button>
        </div>
      </Unauthenticated>

      <Authenticated>
        <div className="h-[620px] rounded-2xl border border-border/40 bg-muted/20 flex flex-col overflow-hidden">
          <div className="w-full h-full min-h-0 flex flex-1 flex-col">
            <Agent />
          </div>
        </div>
      </Authenticated>
    </section>
  );
}
