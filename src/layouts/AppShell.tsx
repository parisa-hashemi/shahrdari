import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Building2,
  ChevronDown,
  LogOut,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  Route as RouteIcon,
  Search,
} from 'lucide-react';
import { navigation, navSectionLabels, type NavSection } from '@/app/navigation';
import { stepForPath, journey } from '@/app/journey';
import { useAuthStore, demoPersonas } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useJourneyStore } from '@/stores/journeyStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { denialReason } from '@/utils/permissions';
import { roleLabels } from '@/utils/dictionary';
import { notificationsApi } from '@/api/governance';
import { studiesApi } from '@/api/studies';
import { regionsApi } from '@/api/catalog';
import { Badge, Ltr } from '@/components/ui/display';
import { Toaster } from '@/components/ui/feedback';
import { DemoBadge } from '@/components/workflow';
import { JourneyBar, NextStepCard } from '@/components/journey/JourneyBar';
import { NotificationPanel } from '@/features/notifications/NotificationPanel';
import { cn } from '@/utils/cn';
import { formatNumber } from '@/utils/format';

const SECTION_ORDER: NavSection[] = ['workspace', 'data', 'analysis', 'governance', 'system'];

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
}

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const location = useLocation();
  const roles = useAuthStore((s) => s.user.roles);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    const match = navigation.find(
      (group) => group.to && group.to !== '/dashboard' && location.pathname.startsWith(group.to),
    );
    setOpenGroup(match?.key ?? null);
  }, [location.pathname]);

  const items = useMemo(
    () => navigation.filter((group) => !group.requires || !denialReason(roles, group.requires)),
    [roles],
  );

  return (
    <nav aria-label="ناوبری اصلی" className="space-y-4 p-2.5">
      {SECTION_ORDER.map((section) => {
        const groups = items.filter((group) => group.section === section);
        if (groups.length === 0) return null;
        return (
          <div key={section}>
            {!collapsed && (
              <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-nav-muted">
                {navSectionLabels[section]}
              </p>
            )}
            <div className="space-y-0.5">
              {groups.map((group) => {
                const Icon = group.icon;
                const active = group.to
                  ? group.to === '/dashboard'
                    ? location.pathname === '/dashboard' || location.pathname === '/'
                    : location.pathname.startsWith(group.to)
                  : false;
                const expanded = openGroup === group.key && !collapsed;
                const children = (group.children ?? []).filter(
                  (child) => !child.requires || !denialReason(roles, child.requires),
                );

                return (
                  <div key={group.key}>
                    <div className="relative flex items-stretch">
                      {active && (
                        <span
                          className="absolute -start-2.5 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary-300"
                          aria-hidden
                        />
                      )}
                      <NavLink
                        to={group.to ?? '#'}
                        onClick={onNavigate}
                        title={collapsed ? group.label : undefined}
                        className={cn(
                          'flex flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors',
                          active
                            ? 'bg-white/12 font-semibold text-white'
                            : 'text-nav-text hover:bg-white/8 hover:text-white',
                          collapsed && 'justify-center px-0',
                        )}
                      >
                        <Icon size={17} className="shrink-0" aria-hidden />
                        {!collapsed && <span className="truncate">{group.label}</span>}
                      </NavLink>
                      {!collapsed && children.length > 0 && (
                        <button
                          type="button"
                          aria-label={expanded ? `بستن ${group.label}` : `باز کردن ${group.label}`}
                          aria-expanded={expanded}
                          onClick={() => setOpenGroup(expanded ? null : group.key)}
                          className="rounded-lg px-1.5 text-nav-muted hover:bg-white/8 hover:text-white"
                        >
                          <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
                        </button>
                      )}
                    </div>
                    {expanded && children.length > 0 && (
                      <ul className="my-1 space-y-0.5 border-s border-white/10 pe-0 ps-2 ms-4">
                        {children.map((child) => (
                          <li key={child.to}>
                            <NavLink
                              to={child.to}
                              onClick={onNavigate}
                              className={({ isActive }) =>
                                cn(
                                  'block rounded-md px-2.5 py-1.5 text-xs transition-colors',
                                  isActive && location.search === new URL(child.to, 'http://x').search
                                    ? 'bg-white/12 text-white'
                                    : 'text-nav-muted hover:bg-white/8 hover:text-white',
                                )
                              }
                            >
                              {child.label}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export function AppShell() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const setUserById = useAuthStore((s) => s.setUserById);
  const signOut = useAuthStore((s) => s.signOut);
  const activeRegionId = useAuthStore((s) => s.activeRegionId);
  const setActiveRegion = useAuthStore((s) => s.setActiveRegion);
  const activeStudyId = useWorkspaceStore((s) => s.activeStudyId);
  const journeyActive = useJourneyStore((s) => s.active);
  const setJourneyActive = useJourneyStore((s) => s.setActive);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: 15000,
  });
  const { data: regions = [] } = useQuery({ queryKey: ['regions'], queryFn: regionsApi.list });
  const { data: activeStudy } = useQuery({
    queryKey: ['study', activeStudyId],
    queryFn: () => studiesApi.get(activeStudyId!),
    enabled: Boolean(activeStudyId),
  });

  const unread = notifications.filter((n) => !n.read).length;
  const step = stepForPath(location.pathname);

  return (
    <div className="min-h-screen">
      <aside
        className="fixed inset-y-0 start-0 z-40 hidden flex-col bg-nav transition-[width] duration-200 lg:flex"
        style={{ width: collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)' }}
      >
        <div className="flex h-[var(--topbar-h)] items-center gap-2.5 border-b border-white/10 px-3.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-500 text-white">
            <Building2 size={17} />
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white">سامانه هوشمند</p>
              <p className="truncate text-2xs text-nav-muted">برنامه‌ریزی شهری تهران</p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <SidebarContent collapsed={collapsed} />
        </div>

        {!collapsed && step && journeyActive && (
          <Link
            to="/journey"
            className="mx-2.5 mb-2 rounded-lg bg-white/8 p-2.5 text-nav-text hover:bg-white/12"
          >
            <span className="flex items-center gap-1.5 text-2xs text-nav-muted">
              <RouteIcon size={12} />
              مسیر راهنما
            </span>
            <span className="num mt-1 block text-xs font-medium text-white">
              قدم {formatNumber(step.index)} از {formatNumber(journey.length)} — {step.title}
            </span>
          </Link>
        )}

        <div className="border-t border-white/10 p-2">
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs text-nav-muted hover:bg-white/8 hover:text-white"
          >
            {collapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
            {!collapsed && 'جمع‌کردن منو'}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 start-0 w-[280px] overflow-y-auto bg-nav">
            <div className="flex h-[var(--topbar-h)] items-center gap-2.5 border-b border-white/10 px-3.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-white">
                <Building2 size={17} />
              </span>
              <p className="text-[13px] font-semibold text-white">سامانه هوشمند برنامه‌ریزی شهری</p>
            </div>
            <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div
        className="flex min-h-screen flex-col transition-[padding] duration-200"
        style={{ paddingInlineStart: collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)' }}
      >
        <header className="sticky top-0 z-30 flex h-[var(--topbar-h)] items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur lg:px-6">
          <button
            type="button"
            aria-label="باز کردن منو"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-muted hover:bg-surface-3 lg:hidden"
          >
            <Menu size={18} />
          </button>

          <div className="hidden min-w-0 items-center gap-2 md:flex">
            <span className="text-xs text-muted">در حال کار روی:</span>
            {activeStudy ? (
              <Link
                to={`/studies/${activeStudy.id}`}
                className="truncate rounded-md bg-surface-2 px-2 py-1 text-[13px] font-medium hover:bg-surface-3"
              >
                {activeStudy.title}
              </Link>
            ) : (
              <span className="text-[13px] text-muted">مطالعه‌ای انتخاب نشده است</span>
            )}
            {activeStudy && (
              <Badge tone="muted">
                <Ltr>{`rev ${activeStudy.revision}`}</Ltr>
              </Badge>
            )}
            <DemoBadge />
          </div>

          <div className="ms-auto flex items-center gap-2">
            <label className="hidden items-center gap-1.5 text-xs text-muted xl:flex">
              منطقه فعال:
              <select
                value={activeRegionId}
                onChange={(event) => setActiveRegion(event.target.value)}
                className="h-8 rounded-md border border-border-strong bg-surface px-2 text-xs"
                aria-label="فیلتر منطقه"
              >
                <option value="all">همه مناطق مجاز</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.title}
                  </option>
                ))}
              </select>
            </label>

            <Link
              to="/gis"
              className="hidden h-8 items-center gap-1.5 rounded-md border border-border-strong px-2.5 text-xs text-muted hover:bg-surface-2 sm:inline-flex"
            >
              <Search size={14} />
              جست‌وجوی سراسری
            </Link>

            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              aria-label={`اعلان‌ها${unread ? ` — ${unread} مورد خوانده‌نشده` : ''}`}
              className="relative rounded-md p-2 text-muted hover:bg-surface-3"
            >
              <Bell size={17} />
              {unread > 0 && (
                <span className="num absolute -top-0.5 -end-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] text-white">
                  {formatNumber(unread)}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                className="flex items-center gap-2 rounded-md border border-border-strong py-1 pe-1.5 ps-2 text-xs hover:bg-surface-2"
              >
                <span className="hidden text-start sm:block">
                  <span className="block leading-4">{user.displayName}</span>
                  <span className="block text-2xs leading-4 text-muted">{roleLabels[user.roles[0]]}</span>
                </span>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary-600 text-2xs font-semibold text-white">
                  {initials(user.displayName)}
                </span>
                <ChevronDown size={13} className="text-faint" />
              </button>

              {menuOpen && (
                <div className="absolute end-0 top-12 z-40 w-72 rounded-xl border border-border bg-surface p-2 shadow-raised">
                  <p className="px-2 py-1 text-2xs text-muted">
                    تغییر نقش نمایشی — برای دیدن تفاوت دسترسی‌ها
                  </p>
                  <ul className="max-h-64 overflow-y-auto">
                    {demoPersonas.map((persona) => (
                      <li key={persona.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setUserById(persona.id);
                            setMenuOpen(false);
                            queryClient.invalidateQueries();
                          }}
                          className={cn(
                            'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-start text-[13px] hover:bg-surface-2',
                            persona.id === user.id && 'bg-primary-50',
                          )}
                        >
                          <span>
                            <span className="block">{persona.displayName}</span>
                            <span className="block text-2xs text-muted">{roleLabels[persona.roles[0]]}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-1 space-y-0.5 border-t border-border pt-1">
                    <button
                      type="button"
                      onClick={() => setJourneyActive(!journeyActive)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-[13px] hover:bg-surface-2"
                    >
                      <RouteIcon size={14} className="text-muted" />
                      {journeyActive ? 'خاموش کردن مسیر راهنما' : 'روشن کردن مسیر راهنما'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        signOut();
                        setMenuOpen(false);
                        navigate('/login');
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-[13px] text-danger hover:bg-danger-bg"
                    >
                      <LogOut size={14} />
                      خروج از سامانه
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <JourneyBar />

        <main id="main" className="flex-1 px-4 py-6 lg:px-6">
          <div className="mx-auto max-w-[1320px]">
            <Outlet />
            <NextStepCard />
          </div>
        </main>

        <footer className="border-t border-border px-4 py-3 text-2xs text-muted lg:px-6">
          سامانه هوشمند برنامه‌ریزی شهری تهران — محیط نمایشی. داده‌ها و ضرایب نمونه‌اند و مبنای رسمی
          شهرداری محسوب نمی‌شوند. تأیید در سامانه به‌معنای مجوز قانونی نیست.
        </footer>
      </div>

      <NotificationPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <Toaster />
    </div>
  );
}
