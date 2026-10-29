import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { clearAuth } from "../api/auth-storage";
import { getProjects, type Project } from "../api/projects";
import { getSnapshots, type SourceSnapshot } from "../api/source-code";
import Button from "../components/ui/Button";
import Icon, { type IconName } from "../components/ui/Icon";
import { cn, scrollArea } from "../components/ui/cn";
import ReportPanel from "./ReportPanel";
import {
  SCAN_EVENT,
  WORKSPACE_EVENT,
  findFindingsArray,
  type ScanCompletedDetail,
} from "./scan-report";

/*
  Workspace layout standards
  - Sidebar   256px expanded, 60px icon rail when collapsed (Ctrl/Cmd + B)
  - Header    56px, white, hairline bottom border
  - Content   centered column on the #f7f7f8 canvas, max 1024px
              (1280px on the source-code route, which needs the room)
  - Rows      32–36px tall, 8px radius, 13px text
  - Active    zinc-100 fill + zinc-900 text (no colored borders)
*/

const SIDEBAR_KEY = "vulnguardian:sidebar-collapsed";

const navigationItems: {
  label: string;
  path: string;
  icon: IconName;
  end: boolean;
}[] = [
  { label: "Dashboard", path: "/dashboard", icon: "home", end: true },
  { label: "Projects", path: "/projects", icon: "folder", end: false },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-1";

const iconButton = cn(
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition duration-150 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50",
  focusRing,
);

function BrandMark() {
  return (
    <div
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(37,99,235,0.4)]"
    >
      V
    </div>
  );
}

function readCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}

export default function WorkspaceLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // The report panel stays hidden until a scan returns data.
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readCollapsed);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");

  const [expandedProjects, setExpandedProjects] = useState<
    Record<string, boolean>
  >({});
  const [snapshotsByProject, setSnapshotsByProject] = useState<
    Record<string, SourceSnapshot[]>
  >({});
  const [snapshotsLoading, setSnapshotsLoading] = useState<
    Record<string, boolean>
  >({});
  const [snapshotErrors, setSnapshotErrors] = useState<Record<string, string>>(
    {},
  );

  const [scanResult, setScanResult] = useState<ScanCompletedDetail | null>(
    null,
  );

  const activeProjectId = location.pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const isSourceRoute = /^\/projects\/[^/]+\/source/.test(location.pathname);

  const findingsCount = useMemo(() => {
    if (!scanResult) return null;
    return findFindingsArray(scanResult.result)?.length ?? null;
  }, [scanResult]);

  // Breadcrumb for the header: where the user is, with links back up the tree.
  const crumbs = useMemo<{ label: string; to?: string }[]>(() => {
    if (!location.pathname.startsWith("/projects")) {
      return [{ label: "Dashboard" }];
    }

    if (!activeProjectId) {
      return [{ label: "Projects" }];
    }

    const projectName =
      projects.find((project) => project.id === activeProjectId)?.name ??
      "Project";

    if (!isSourceRoute) {
      return [{ label: "Projects", to: "/projects" }, { label: projectName }];
    }

    const snapshotId = new URLSearchParams(location.search).get("snapshotId");
    const snapshot = snapshotId
      ? snapshotsByProject[activeProjectId]?.find(
          (item) => item.id === snapshotId,
        )
      : undefined;

    return [
      { label: "Projects", to: "/projects" },
      { label: projectName, to: `/projects/${activeProjectId}` },
      {
        label: snapshot
          ? `Source code · Version ${snapshot.version}`
          : "Source code",
      },
    ];
  }, [
    location.pathname,
    location.search,
    activeProjectId,
    isSourceRoute,
    projects,
    snapshotsByProject,
  ]);

  // Track requests in flight so initial loading, expansion and refresh events
  // do not launch duplicate requests for the same project.
  const snapshotRequests = useRef(new Map<string, Promise<void>>());

  const loadSnapshots = useCallback(
    (projectId: string, force = false): Promise<void> => {
      const existingRequest = snapshotRequests.current.get(projectId);
      if (existingRequest) return existingRequest;

      if (!force && snapshotsByProject[projectId] !== undefined) {
        return Promise.resolve();
      }

      const token = localStorage.getItem("accessToken");

      if (!token) {
        navigate("/login", { replace: true });
        return Promise.resolve();
      }

      setSnapshotsLoading((current) => ({
        ...current,
        [projectId]: true,
      }));
      setSnapshotErrors((current) => ({
        ...current,
        [projectId]: "",
      }));

      const request = (async () => {
        try {
          const data = await getSnapshots(token, projectId);
          setSnapshotsByProject((current) => ({
            ...current,
            [projectId]: data,
          }));
          setSnapshotErrors((current) => ({
            ...current,
            [projectId]: "",
          }));
        } catch (error) {
          setSnapshotErrors((current) => ({
            ...current,
            [projectId]:
              error instanceof Error
                ? error.message
                : "Unable to load snapshots.",
          }));
        } finally {
          snapshotRequests.current.delete(projectId);
          setSnapshotsLoading((current) => ({
            ...current,
            [projectId]: false,
          }));
        }
      })();

      snapshotRequests.current.set(projectId, request);
      return request;
    },
    [navigate, snapshotsByProject],
  );

  const loadProjects = useCallback(async () => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setProjectsLoading(true);
    setProjectsError("");

    try {
      const data = await getProjects(token);
      setProjects(data);
    } catch (error) {
      setProjectsError(
        error instanceof Error ? error.message : "Unable to load projects.",
      );
    } finally {
      setProjectsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  // Load existing snapshots for every project as soon as the project list
  // arrives. An empty array is cached too, so empty projects aren't refetched
  // on every render.
  useEffect(() => {
    for (const project of projects) {
      void loadSnapshots(project.id);
    }
  }, [projects, loadSnapshots]);

  useEffect(() => {
    const handleWorkspaceUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        projectId?: string;
        type: "project-created" | "snapshot-created";
      }>;

      const detail = customEvent.detail;
      if (!detail) return;

      if (detail.type === "project-created") {
        void loadProjects();
        return;
      }

      if (detail.type === "snapshot-created" && detail.projectId) {
        const projectId = detail.projectId;

        setExpandedProjects((current) => ({
          ...current,
          [projectId]: true,
        }));

        // Force a refresh so a newly created snapshot appears in the sidebar.
        void loadSnapshots(projectId, true);
      }
    };

    window.addEventListener(WORKSPACE_EVENT, handleWorkspaceUpdate);
    return () =>
      window.removeEventListener(WORKSPACE_EVENT, handleWorkspaceUpdate);
  }, [loadProjects, loadSnapshots]);

  useEffect(() => {
    const handleScanCompleted = (event: Event) => {
      const customEvent = event as CustomEvent<ScanCompletedDetail>;
      const detail = customEvent.detail;

      if (!detail || !("result" in detail)) return;

      setScanResult(detail);

      // Open one frame after the panel has mounted closed, so it slides in
      // instead of popping into place.
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => setRightPanelOpen(true)),
      );
    };

    window.addEventListener(SCAN_EVENT, handleScanCompleted);
    return () => window.removeEventListener(SCAN_EVENT, handleScanCompleted);
  }, []);

  // Automatically expand the active project's snapshot section and make sure
  // its snapshots have been loaded.
  useEffect(() => {
    if (!activeProjectId) return;

    setExpandedProjects((current) => ({
      ...current,
      [activeProjectId]: true,
    }));

    void loadSnapshots(activeProjectId);
  }, [activeProjectId, loadSnapshots]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname, location.search]);

  // Remember the collapsed state between visits.
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? "1" : "0");
    } catch {
      // Storage can be unavailable (private mode); the state still works.
    }
  }, [sidebarCollapsed]);

  const toggleSidebar = useCallback(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setSidebarCollapsed((collapsed) => !collapsed);
    } else {
      setMobileSidebarOpen((open) => !open);
    }
  }, []);

  // Ctrl/Cmd + B toggles the sidebar, Escape closes the mobile drawer.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleSidebar();
        return;
      }

      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const toggleProject = (projectId: string) => {
    const isExpanded = Boolean(expandedProjects[projectId]);

    if (isExpanded) {
      setExpandedProjects((current) => ({
        ...current,
        [projectId]: false,
      }));
      return;
    }

    setExpandedProjects((current) => ({
      ...current,
      [projectId]: true,
    }));

    void loadSnapshots(projectId);
  };

  const retrySnapshots = async (projectId: string) => {
    await loadSnapshots(projectId, true);
  };

  const handleLogout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  function renderRail() {
    return (
      <div className="flex h-full min-h-0 flex-col items-center bg-white">
        <div className="flex h-14 w-full shrink-0 items-center justify-center border-b border-zinc-200">
          <BrandMark />
        </div>

        <nav className="mt-3 flex flex-col items-center gap-1">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              title={item.label}
              aria-label={item.label}
              className={({ isActive }) =>
                cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition duration-150",
                  focusRing,
                  isActive
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                )
              }
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto w-full border-t border-zinc-200 p-3">
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className={cn(
              "mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition duration-150 hover:bg-red-50 hover:text-red-600",
              focusRing,
            )}
          >
            <Icon name="logout" className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    );
  }

  function renderSidebar() {
    return (
      <div className="flex h-full min-h-0 flex-col bg-white text-zinc-900">
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-zinc-200 px-4">
          <BrandMark />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-5 tracking-tight">
              VulnGuardian
            </p>
            <p className="truncate text-xs leading-4 text-zinc-500">
              Security workspace
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close navigation"
            className={cn(iconButton, "lg:hidden")}
          >
            <Icon name="x" />
          </button>
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain p-3",
            scrollArea,
          )}
        >
          <p className="mb-1.5 px-2 text-xs font-medium text-zinc-500">
            Workspace
          </p>

          <nav className="space-y-0.5">
            {navigationItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition duration-150",
                    focusRing,
                    isActive
                      ? "bg-zinc-100 font-medium text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                  )
                }
              >
                <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mb-1.5 mt-6 flex items-center justify-between gap-2 pl-2">
            <p className="text-xs font-medium text-zinc-500">
              Recent projects
            </p>

            <button
              type="button"
              onClick={() => navigate("/projects")}
              aria-label="Browse projects"
              title="Browse projects"
              className={cn(iconButton, "h-7 w-7")}
            >
              <Icon name="plus" />
            </button>
          </div>

          {projectsLoading ? (
            <div className="space-y-1.5 px-1 py-1" aria-label="Loading projects">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-8 animate-pulse rounded-lg bg-zinc-100 motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : projectsError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-xs leading-5 text-red-700">{projectsError}</p>

              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => void loadProjects()}
              >
                Try again
              </Button>
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-4">
              <p className="text-xs leading-5 text-zinc-500">
                No projects yet. Create a project to start organizing your code
                and security scans.
              </p>

              <button
                type="button"
                onClick={() => navigate("/projects")}
                className={cn(
                  "mt-2.5 rounded text-xs font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition duration-150 hover:decoration-zinc-900",
                  focusRing,
                )}
              >
                Browse projects
              </button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {projects.map((project) => {
                const isActive = activeProjectId === project.id;
                const isExpanded = Boolean(expandedProjects[project.id]);
                const snapshots = snapshotsByProject[project.id] ?? [];
                const sourcePath = `/projects/${project.id}/source`;
                const isSourceSelected = location.pathname === sourcePath;

                return (
                  <div key={project.id} className="min-w-0">
                    <div
                      className={cn(
                        "flex min-w-0 items-center rounded-lg transition-colors duration-150",
                        isActive ? "bg-zinc-100" : "hover:bg-zinc-50",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/projects/${project.id}`)}
                        title={project.name}
                        className={cn(
                          "flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px]",
                          focusRing,
                          isActive
                            ? "font-medium text-zinc-900"
                            : "text-zinc-600 hover:text-zinc-900",
                        )}
                      >
                        <Icon
                          name="folder"
                          className="h-4 w-4 shrink-0 text-zinc-400"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {project.name}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleProject(project.id)}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? "Collapse" : "Expand"} snapshots for ${project.name}`}
                        title="Show source snapshots"
                        className={cn(iconButton, "mr-1 h-7 w-7")}
                      >
                        <Icon
                          name="chevronRight"
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-150",
                            isExpanded && "rotate-90",
                          )}
                        />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="ml-[18px] mt-0.5 space-y-0.5 border-l border-zinc-200 pb-1 pl-2.5">
                        <button
                          type="button"
                          onClick={() => navigate(sourcePath)}
                          className={cn(
                            "flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-xs transition duration-150",
                            focusRing,
                            isSourceSelected
                              ? "bg-zinc-100 font-medium text-zinc-900"
                              : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                          )}
                        >
                          <Icon
                            name="code"
                            className="h-3.5 w-3.5 shrink-0"
                          />
                          <span className="truncate">Source code</span>
                        </button>

                        {snapshotsLoading[project.id] ? (
                          <p className="px-2 py-1.5 text-xs text-zinc-500">
                            Loading snapshots…
                          </p>
                        ) : snapshotErrors[project.id] ? (
                          <div className="px-2 py-1.5">
                            <p className="text-xs leading-4 text-red-600">
                              {snapshotErrors[project.id]}
                            </p>

                            <button
                              type="button"
                              onClick={() => void retrySnapshots(project.id)}
                              className={cn(
                                "mt-1 rounded text-xs font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900",
                                focusRing,
                              )}
                            >
                              Retry
                            </button>
                          </div>
                        ) : snapshots.length === 0 ? (
                          <p className="px-2 py-1.5 text-xs leading-4 text-zinc-400">
                            No source snapshots
                          </p>
                        ) : (
                          snapshots.map((snapshot) => {
                            const isSelected =
                              isSourceSelected &&
                              new URLSearchParams(location.search).get(
                                "snapshotId",
                              ) === snapshot.id;

                            return (
                              <button
                                key={snapshot.id}
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `${sourcePath}?snapshotId=${encodeURIComponent(snapshot.id)}`,
                                  )
                                }
                                title={snapshot.id}
                                className={cn(
                                  "flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition duration-150",
                                  focusRing,
                                  isSelected
                                    ? "bg-zinc-100 text-zinc-900"
                                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900",
                                )}
                              >
                                <Icon
                                  name="file"
                                  className="h-3.5 w-3.5 shrink-0"
                                />

                                <span className="min-w-0 flex-1 truncate">
                                  <span className="font-medium">
                                    Version {snapshot.version}
                                  </span>
                                  <span className="ml-1.5 font-mono text-[11px] text-zinc-400">
                                    {snapshot.id}
                                  </span>
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-zinc-200 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-zinc-600 transition duration-150 hover:bg-red-50 hover:text-red-600",
              focusRing,
            )}
          >
            <Icon name="logout" className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-white text-zinc-900 antialiased">
      {/* Desktop sidebar: full width or icon rail */}
      <aside
        className={cn(
          "hidden shrink-0 overflow-hidden border-r border-zinc-200 bg-white transition-[width] duration-200 ease-out motion-reduce:transition-none lg:block",
          sidebarCollapsed ? "w-[60px]" : "w-64",
        )}
      >
        {/* Fixed-width inner box: the sidebar is revealed, not squashed */}
        {sidebarCollapsed ? (
          <div className="h-full w-[60px]">{renderRail()}</div>
        ) : (
          <div className="h-full w-64">{renderSidebar()}</div>
        )}
      </aside>

      {/* Mobile drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setMobileSidebarOpen(false)}
            className="absolute inset-0 bg-zinc-900/30 backdrop-blur-[2px]"
          />

          <aside className="absolute inset-y-0 left-0 w-[min(19rem,88vw)] border-r border-zinc-200 shadow-2xl">
            {renderSidebar()}
          </aside>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation"
              className={cn(iconButton, "lg:hidden")}
            >
              <Icon name="menu" className="h-[18px] w-[18px]" />
            </button>

            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              aria-expanded={!sidebarCollapsed}
              title={`${sidebarCollapsed ? "Expand" : "Collapse"} sidebar (Ctrl/⌘ + B)`}
              className={cn(iconButton, "hidden lg:flex")}
            >
              <Icon name="sidebar" className="h-[18px] w-[18px]" />
            </button>

            <span
              aria-hidden="true"
              className="mx-1.5 hidden h-4 w-px bg-zinc-200 lg:block"
            />

            <nav aria-label="Breadcrumb" className="min-w-0">
              <ol className="flex min-w-0 items-center gap-1.5 text-sm">
                {crumbs.map((crumb, index) => {
                  const isLast = index === crumbs.length - 1;

                  return (
                    <li
                      key={`${index}-${crumb.label}`}
                      className={cn(
                        "min-w-0 items-center gap-1.5",
                        isLast ? "flex" : "hidden sm:flex",
                      )}
                    >
                      {index > 0 && (
                        <Icon
                          name="chevronRight"
                          className="hidden h-3.5 w-3.5 shrink-0 text-zinc-300 sm:block"
                        />
                      )}

                      {crumb.to && !isLast ? (
                        <Link
                          to={crumb.to}
                          className={cn(
                            "truncate rounded text-zinc-500 transition duration-150 hover:text-zinc-900",
                            focusRing,
                          )}
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span
                          aria-current={isLast ? "page" : undefined}
                          className={cn(
                            "truncate",
                            isLast
                              ? "font-medium text-zinc-900"
                              : "text-zinc-500",
                          )}
                        >
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>

          {/* Only offered once a scan has returned data, on wide screens */}
          {scanResult && (
            <div className="hidden shrink-0 xl:block">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRightPanelOpen((open) => !open)}
                aria-pressed={rightPanelOpen}
                title={rightPanelOpen ? "Hide scan results" : "Show scan results"}
              >
                <Icon name="panelRight" />
                Scan results
                {findingsCount !== null && (
                  <span className="rounded-full bg-zinc-100 px-1.5 text-[11px] font-semibold tabular-nums text-zinc-600">
                    {findingsCount}
                  </span>
                )}
              </Button>
            </div>
          )}
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Scroll area: content sits in a centered column */}
          <section
            className={cn(
              "min-w-0 flex-1 overflow-y-auto bg-[#f7f7f8] [scrollbar-gutter:stable_both-edges]",
              scrollArea,
            )}
          >
            <div
              className={cn(
                "mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
                isSourceRoute ? "max-w-7xl" : "max-w-5xl",
              )}
            >
              <Outlet />
            </div>
          </section>

          {/* Third panel: absent until data arrives, then slides in */}
          {scanResult && (
            <div
              aria-hidden={!rightPanelOpen}
              className={cn(
                "hidden shrink-0 overflow-hidden transition-[width,visibility] duration-200 ease-out motion-reduce:transition-none xl:block",
                rightPanelOpen ? "w-80" : "invisible w-0",
              )}
            >
              <ReportPanel
                scanResult={scanResult}
                onClose={() => setRightPanelOpen(false)}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}