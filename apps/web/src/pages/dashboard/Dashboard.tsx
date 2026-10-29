import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { User } from "../../api/auth";
import { clearAuth, getStoredUser } from "../../api/auth-storage";
import Button, { Spinner } from "../../components/ui/Button";
import Icon, { type IconName } from "../../components/ui/Icon";
import { cn } from "../../components/ui/cn";

/*
  Dashboard standards
  - Sits inside the workspace's centered column: no page background,
    no outer padding, no page-level max-width beyond the 768px content.
  - Vertically centered like a chat home screen.
  - Cards: white, hairline border, 12px radius. Selected = blue border + soft ring.
  - Composer: 16px radius, focus ring on the container, Ctrl/⌘ + Enter submits.
*/

type WorkspaceAction = "scan" | "review" | "learn";

const actionLabels: Record<WorkspaceAction, string> = {
  scan: "Scan source code",
  review: "Review a vulnerability",
  learn: "Learn secure coding",
};

const actions: {
  id: WorkspaceAction;
  title: string;
  description: string;
  icon: IconName;
}[] = [
  {
    id: "scan",
    title: "Scan code",
    description: "Find potential security issues",
    icon: "search",
  },
  {
    id: "review",
    title: "Review findings",
    description: "Understand security risks",
    icon: "alert",
  },
  {
    id: "learn",
    title: "Learn security",
    description: "Explore secure coding",
    icon: "book",
  },
];

function getFirstName(email: string) {
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[._-]/)[0] ?? "";

  if (!first) return "Developer";

  return first.charAt(0).toUpperCase() + first.slice(1);
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [activeAction, setActiveAction] =
    useState<WorkspaceAction>("scan");

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    const storedUser = getStoredUser();

    if (accessToken && storedUser) {
      setUser(storedUser);
      setLoading(false);
      return;
    }

    clearAuth();
    navigate("/login", { replace: true });
  }, [navigate]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // The conversation API is not connected yet.
    // Navigate to projects instead of fabricating an AI response.
    navigate("/projects");
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div
          role="status"
          className="flex items-center gap-2.5 text-sm text-zinc-500"
        >
          <Spinner />
          Loading your workspace…
        </div>
      </div>
    );
  }

  if (!user) return null;

  const firstName = getFirstName(user.email);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-7.5rem)] w-full max-w-3xl flex-col justify-center">
      {/* Greeting */}
      <div className="text-center">
        <div
          aria-hidden="true"
          className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-blue-600 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_6px_16px_-8px_rgba(0,0,0,0.12)]"
        >
          <Icon name="shield" className="h-6 w-6" />
        </div>

        <p className="text-sm text-zinc-500">
          Welcome back, {firstName}
        </p>

        <h1 className="mt-1.5 text-3xl font-semibold tracking-[-0.03em] text-zinc-900 sm:text-[2rem] sm:leading-10">
          What are we securing today?
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">
          Analyze source code, investigate vulnerabilities, and build
          safer software.
        </p>
      </div>

      {/* Quick actions */}
      <div
        role="group"
        aria-label="Quick actions"
        className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {actions.map((action) => {
          const isActive = activeAction === action.id;

          return (
            <button
              key={action.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => {
                setActiveAction(action.id);

                if (action.id === "scan") {
                  navigate("/projects");
                } else {
                  setPrompt(
                    action.id === "review"
                      ? "Help me review a security finding"
                      : "Help me learn secure coding practices",
                  );
                }
              }}
              className={cn(
                "group flex items-start gap-3 rounded-xl border bg-white p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition duration-150 focus-visible:outline-none focus-visible:ring-4 sm:flex-col sm:gap-0",
                isActive
                  ? "border-blue-500 ring-4 ring-blue-500/10 focus-visible:ring-blue-500/20"
                  : "border-zinc-200 hover:border-zinc-300 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] focus-visible:border-zinc-400 focus-visible:ring-zinc-900/5",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition duration-150",
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "bg-zinc-100 text-zinc-600 group-hover:text-zinc-900",
                )}
              >
                <Icon name={action.icon} className="h-[18px] w-[18px]" />
              </span>

              <span className="min-w-0 sm:mt-3.5">
                <span className="block text-sm font-medium text-zinc-900">
                  {action.title}
                </span>

                <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
                  {action.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="mt-5 rounded-2xl border border-zinc-200 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.1)] transition duration-150 focus-within:border-zinc-400 focus-within:ring-4 focus-within:ring-zinc-900/5"
      >
        <label htmlFor="security-prompt" className="sr-only">
          Describe your security task
        </label>

        <textarea
          id="security-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              (event.metaKey || event.ctrlKey)
            ) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={`Describe your task: ${actionLabels[activeAction].toLowerCase()}…`}
          rows={3}
          className="block w-full resize-none bg-transparent px-2 py-1.5 text-sm leading-6 text-zinc-900 outline-none placeholder:text-zinc-400"
        />

        <div className="mt-2 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
          <p className="min-w-0 text-xs leading-4 text-zinc-500">
            Select a project to begin a real scan.
          </p>

          <Button
            type="submit"
            title="Continue (Ctrl/⌘ + Enter)"
            className="shrink-0"
          >
            Continue
            <Icon name="arrowUp" />
          </Button>
        </div>
      </form>

      <p className="mt-4 text-center text-xs leading-5 text-zinc-400">
        Security findings come from the analysis pipeline. AI
        explanations will be connected separately.
      </p>
    </div>
  );
}