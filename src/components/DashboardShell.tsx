import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { Activity, ChevronRight, CreditCard, Inbox, LayoutDashboard, LockKeyhole, Moon, RefreshCw, ShieldCheck, Sun, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuBadge,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar'

export type DashboardView = 'overview' | 'inbox' | 'financing' | 'activity'

export interface DashboardShellProps {
  view: DashboardView
  onViewChange: (view: DashboardView) => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onLock: () => void
  loading: boolean
  onRefresh: () => void
  fetchedAt: string
  loaded: boolean
  submissionCount: number
  children: ReactNode
}

const sections = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, title: 'Practice overview', description: 'A clear view of inquiries, patient financing, and website performance.' },
  { id: 'inbox', label: 'Lead inbox', icon: Inbox, title: 'Lead inbox', description: 'Find patient inquiries, review their details, and plan your next conversation.' },
  { id: 'financing', label: 'Cherry financing', icon: CreditCard, title: 'Cherry financing', description: 'Review approval and funded-plan notices from the practice mailbox.' },
  { id: 'activity', label: 'Website activity', icon: Activity, title: 'Website activity', description: 'Review consented clicks, form events, and scheduling activity.' },
] as const

function checkedLabel(fetchedAt: string, loaded: boolean) {
  const date = new Date(fetchedAt)
  if (!loaded || !fetchedAt || Number.isNaN(date.getTime())) return 'Inbox not yet verified'
  return `Inbox checked ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' }).format(date)} PT`
}

function ShellContent({ view, onViewChange, theme, onToggleTheme, onLock, loading, onRefresh, fetchedAt, loaded, submissionCount, children }: DashboardShellProps) {
  const { isMobile, setOpenMobile } = useSidebar()
  const heading = useRef<HTMLHeadingElement>(null)
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const section = sections.find((item) => item.id === view) ?? sections[0]
  useEffect(() => () => { if (focusTimer.current) clearTimeout(focusTimer.current) }, [])

  function navigate(nextView: DashboardView) {
    if (focusTimer.current) clearTimeout(focusTimer.current)
    onViewChange(nextView)
    if (isMobile) setOpenMobile(false)
    // Allow the mobile Sheet to restore focus and finish its exit first.
    focusTimer.current = setTimeout(() => {
      heading.current?.focus({ preventScroll: true })
      window.scrollTo({ top: 0, behavior: 'instant' })
    }, isMobile ? 350 : 0)
  }

  return <>
    <a href="#dashboard-heading" className="dashboard-skip-link sr-only focus:not-sr-only">Skip to dashboard content</a>
    <Sidebar role="complementary" aria-label="Practice workspace" variant="inset" collapsible="icon" className="dashboard-sidebar">
      <SidebarHeader className="pb-5 pt-4">
        {isMobile && <Button variant="ghost" size="icon" className="self-end" aria-label="Close navigation" onClick={() => setOpenMobile(false)}><X /></Button>}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Exquisite Dentistry" onClick={() => navigate('overview')} aria-label="Exquisite Dentistry overview">
              <img src="/brand/exquisite-icon.png" alt="" className="size-8 shrink-0 rounded-lg object-contain" />
              <span className="flex min-w-0 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">Exquisite Dentistry</span>
                <span className="text-xs text-muted-foreground">Practice dashboard</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground">Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <nav aria-label="Dashboard sections">
              <SidebarMenu className="gap-1.5">
                {sections.map(({ id, label, icon: Icon }) => <SidebarMenuItem key={id}>
                  <SidebarMenuButton isActive={view === id} tooltip={label} onClick={() => navigate(id)} aria-current={view === id ? 'page' : undefined} className="h-10">
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                  {id === 'inbox' && loaded && <SidebarMenuBadge>{submissionCount}</SidebarMenuBadge>}
                </SidebarMenuItem>)}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-3 pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} onClick={onToggleTheme} aria-pressed={theme === 'dark'}>
              {theme === 'light' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
              <span>{theme === 'light' ? 'Dark appearance' : 'Light appearance'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Lock dashboard" onClick={onLock}>
              <LockKeyhole aria-hidden="true" /><span>Lock dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Separator />
        <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
          <span>Private practice workspace</span>
        </div>
      </SidebarFooter>
    </Sidebar>
    <SidebarInset className="dashboard-inset min-w-0">
      <header className="dashboard-shell-header flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <nav aria-label="Breadcrumb" className="min-w-0 text-sm">
            <ol className="flex items-center gap-2">
              <li className="hidden text-muted-foreground lg:block">Practice dashboard</li>
              <li aria-hidden="true" className="hidden lg:block"><ChevronRight className="size-3.5 text-muted-foreground" /></li>
              <li aria-current="page" className="truncate">{section.label}</li>
            </ol>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground xl:block" aria-live="polite">{checkedLabel(fetchedAt, loaded)}</span>
          <Button variant="outline" onClick={onRefresh} disabled={loading} aria-label={loading ? 'Refreshing dashboard' : 'Refresh dashboard'}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" className={loading ? 'animate-spin' : undefined} />
            <span>{loading ? 'Refreshing' : 'Refresh'}</span>
          </Button>
        </div>
      </header>
      <div className="dashboard-content mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="dashboard-page-intro flex flex-col gap-2">
          <h1 id="dashboard-heading" ref={heading} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none sm:text-3xl">{section.title}</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{section.description}</p>
          <span className="text-xs text-muted-foreground xl:hidden" aria-live="polite">{checkedLabel(fetchedAt, loaded)}</span>
        </div>
        {children}
      </div>
    </SidebarInset>
  </>
}

export function DashboardShell(props: DashboardShellProps) {
  return <SidebarProvider style={{ '--sidebar-width': '16rem' } as CSSProperties} className="dashboard-shell">
    <ShellContent {...props} />
  </SidebarProvider>
}
