import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import "katex/dist/katex.min.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import appCss from "./globals.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        title: "Passad AI — Agent Task Execution Agent",
      },
      {
        name: "description",
        content:
          "An intelligent multi-agent system that accepts complex instructions, decomposes them into steps, and executes them reliably. Research, data processing, and database automation in one platform.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en" className={cn("h-full dark", "antialiased", "font-sans")}>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-full flex flex-col">
        <ConvexClientProvider>
          <TooltipProvider>
            <Outlet />
            <Toaster />
          </TooltipProvider>
        </ConvexClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
