import { HomeAgentSection } from "@/components/HomeAgentSection";
import {
  Code2,
  SearchIcon,
  BarChart3Icon,
  DatabaseIcon,
  ZapIcon,
  ShieldCheckIcon,
  GitBranchIcon,
} from "lucide-react";

// ─── Feature cards ──────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: <SearchIcon className="size-5 text-violet-400" />,
    title: "Deep Research",
    description:
      "Multi-step web search and synthesis. Gets the full picture on any topic.",
  },
  {
    icon: <BarChart3Icon className="size-5 text-emerald-400" />,
    title: "Data Processing",
    description:
      "Upload CSV or Excel data and receive instant statistical insights.",
  },
  {
    icon: <DatabaseIcon className="size-5 text-sky-400" />,
    title: "Database Agent",
    description:
      "Provide your schema, get optimised multi-step SQL queries automatically.",
  },
  {
    icon: <ZapIcon className="size-5 text-amber-400" />,
    title: "Multi-step Execution",
    description:
      "Agents break complex tasks into sub-steps and execute them in order.",
  },
  {
    icon: <GitBranchIcon className="size-5 text-rose-400" />,
    title: "Tool Chaining",
    description:
      "Every agent chains tool calls intelligently to complete your task end-to-end.",
  },
  {
    icon: <ShieldCheckIcon className="size-5 text-teal-400" />,
    title: "Graceful Failure Handling",
    description:
      "Errors are caught, retried when possible, and surfaced with clear context.",
  },
];

// ─── Gradient text helper ────────────────────────────────────────────────────
function GradientText({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-sky-400 to-emerald-400 ${className}`}
    >
      {children}
    </span>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <main className="relative flex flex-col min-h-screen bg-background overflow-x-hidden">
      {/* Background glow blobs */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-500/10 blur-[120px]" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] rounded-full bg-sky-500/10 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 w-[400px] h-[400px] -translate-x-1/2 rounded-full bg-emerald-500/8 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 gap-16">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="text-center flex flex-col items-center gap-6">
          {/* Badge */}
          {/* <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 bg-muted/30 text-xs text-muted-foreground backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Powered by GPT-5.4 &middot; Vercel AI SDK &middot; Multi-Agent
          </div> */}

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-tight max-w-4xl">
            <GradientText>Passad AI</GradientText> : your agent for complex work
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Passad AI accepts any complex instruction, decomposes it into
            logical steps, and executes each one reliably — with full
            observability over reasoning and tool calls.
          </p>

          {/* Stat chips */}
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {[
              {
                label: "Research Agent",
                color: "text-violet-400 border-violet-500/30 bg-violet-500/10",
              },
              {
                label: "Data Processing",
                color:
                  "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
              },
              {
                label: "Database Agent",
                color: "text-sky-400 border-sky-500/30 bg-sky-500/10",
              },
            ].map(({ label, color }) => (
              <span
                key={label}
                className={`px-4 py-1.5 rounded-full border text-sm font-medium ${color}`}
              >
                {label}
              </span>
            ))}
          </div>
        </section>

        {/* ── Agent Chat Box ────────────────────────────────────────────────── */}
        <HomeAgentSection />

        {/* ── Features grid ────────────────────────────────────────────────── */}
        <section
          aria-labelledby="features-heading"
          className="flex flex-col gap-8"
        >
          <div className="text-center">
            <h2
              id="features-heading"
              className="text-3xl sm:text-4xl font-bold text-foreground"
            >
              <GradientText>Passad AI</GradientText> — everything you need to
              automate with confidence
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Passad AI is built on the Vercel AI SDK with ToolLoopAgent for
              reliable, observable, multi-step task execution.
            </p>
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            aria-label="Core capabilities"
          >
            {[
              {
                icon: <Code2 className="size-5 text-amber-400" />,
                title: "Python runtime",
                description:
                  "Execute code in a managed runtime: scripts, data transforms, and checks so agents can act on your instructions safely.",
                ring: "border-amber-500/40 bg-amber-500/10",
              },
              {
                icon: <SearchIcon className="size-5 text-violet-400" />,
                title: "Web search",
                description:
                  "Search and synthesize the public web in multiple steps so answers stay current when your task needs outside context.",
                ring: "border-violet-500/40 bg-violet-500/10",
              },
              {
                icon: <DatabaseIcon className="size-5 text-sky-400" />,
                title: "Live PostgreSQL",
                description:
                  "Run schema-aware SQL against live data — multi-step queries, exploration, and answers grounded in your database.",
                ring: "border-sky-500/40 bg-sky-500/10",
              },
            ].map(({ icon, title, description, ring }) => (
              <div
                key={title}
                className={`flex flex-col gap-2.5 p-4 rounded-2xl border ${ring} backdrop-blur-sm`}
              >
                <div className="flex items-center gap-2.5">
                  {icon}
                  <h3 className="font-semibold text-foreground text-sm">
                    {title}
                  </h3>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon, title, description }) => (
              <div
                key={title}
                className="group relative flex flex-col gap-3 p-5 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm hover:border-border transition-all duration-300 hover:bg-card/70 hover:shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted/50 group-hover:bg-muted/80 transition-colors">
                    {icon}
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">
                    {title}
                  </h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section
          aria-labelledby="how-heading"
          className="flex flex-col gap-8 pb-8"
        >
          <div className="text-center">
            <h2
              id="how-heading"
              className="text-3xl sm:text-4xl font-bold text-foreground"
            >
              How it <GradientText>works</GradientText>
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {[
              {
                step: "01",
                title: "Describe your task",
                description:
                  "Give the agent any complex instruction in plain language.",
                color:
                  "from-violet-500/20 to-violet-500/5 border-violet-500/30",
                accent: "text-violet-400",
              },
              {
                step: "02",
                title: "Agent plans & executes",
                description:
                  "The agent breaks the task into sub-steps and calls tools to execute each one.",
                color: "from-sky-500/20 to-sky-500/5 border-sky-500/30",
                accent: "text-sky-400",
              },
              {
                step: "03",
                title: "See live results",
                description:
                  "Watch reasoning, tool calls, and final output stream in real-time.",
                color:
                  "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
                accent: "text-emerald-400",
              },
            ].map(({ step, title, description, color, accent }) => (
              <div
                key={step}
                className={`flex-1 p-6 rounded-2xl border bg-gradient-to-b ${color} backdrop-blur-sm`}
              >
                <span className={`text-4xl font-black ${accent} opacity-30`}>
                  {step}
                </span>
                <h3 className="mt-2 font-semibold text-foreground">{title}</h3>
                <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
