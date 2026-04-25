"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import Agent from "@/components/Agent";

export function HomeAgentSection() {
  const { signIn } = useAuthActions();

  return (
    <section
      id="agent-interface"
      aria-label="AI Agent Interface"
      className="flex flex-col gap-4"
    >
      {/* <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Try it now</h2>
        <p className="text-sm text-muted-foreground">
          Select an agent on the left and start chatting
        </p>
      </div> */}

      <div className="h-[620px] rounded-2xl border border-border/40 bg-muted/20 flex items-center justify-center overflow-hidden">
        <AuthLoading>
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Spinner className="size-8" />
            <p className="text-sm">Loading session…</p>
          </div>
        </AuthLoading>

        <Unauthenticated>
          <div className="flex flex-col items-center gap-4 px-6 text-center max-w-md">
            <p className="text-muted-foreground">
              Sign in with Google to use the agent interface. Your chat history
              is saved per agent tab.
            </p>
            <Button
              type="button"
              onClick={() => void signIn("google")}
              className="rounded-full"
            >
              Sign in with Google
            </Button>
          </div>
        </Unauthenticated>

        <Authenticated>
          <div className="w-full h-full min-h-0 p-0 flex">
            <Agent />
          </div>
        </Authenticated>
      </div>
    </section>
  );
}
