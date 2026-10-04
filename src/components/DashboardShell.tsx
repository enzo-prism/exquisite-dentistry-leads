import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { Activity, CircleHelp, CreditCard, Inbox, LayoutGrid, LockKeyhole, Moon, RefreshCw, ShieldCheck, Sun, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuBadge,
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
  { id: 'overview', label: 'Overview', icon: LayoutGrid, title: 'Overview', description: 'A clear view of inquiries, patient financing, and website performance.' },
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
      <SidebarHeader className="px-3 pb-12 pt-7">
        {isMobile && <Button variant="ghost" size="icon" className="self-end" aria-label="Close navigation" onClick={() => setOpenMobile(false)}><X /></Button>}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Exquisite Dentistry" onClick={() => navigate('overview')} aria-label="Exquisite Dentistry overview">
              <img src="/brand/exquisite-icon.png" alt="" className="size-9 shrink-0 rounded-xl object-contain" />
              <span className="flex min-w-0 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold tracking-tight">Exquisite</span>
                <span className="text-xs text-muted-foreground">Dentistry</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-3">
          <SidebarGroupContent>
            <nav aria-label="Dashboard sections">
              <SidebarMenu className="gap-2">
                {sections.map(({ id, label, icon: Icon }) => <SidebarMenuItem key={id}>
                  <SidebarMenuButton isActive={view === id} tooltip={label} onClick={() => navigate(id)} aria-current={view === id ? 'page' : undefined} className="h-12 gap-3 rounded-xl px-3 font-medium [&>svg]:size-[18px] [&>svg]:stroke-[1.6]">
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                  {id === 'inbox' && loaded && <SidebarMenuBadge className="top-1/2! right-3 -translate-y-1/2 text-muted-foreground">{submissionCount}</SidebarMenuBadge>}
                </SidebarMenuItem>)}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-2 px-3 pb-6">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} onClick={onToggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} aria-pressed={theme === 'dark'} className="h-11 gap-3 rounded-xl px-3 text-muted-foreground [&>svg]:size-[18px] [&>svg]:stroke-[1.6]">
              {theme === 'light' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
              <span>Appearance</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Lock dashboard" onClick={onLock} className="h-11 gap-3 rounded-xl px-3 text-muted-foreground [&>svg]:size-[18px] [&>svg]:stroke-[1.6]">
              <LockKeyhole aria-hidden="true" /><span>Lock dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
    <SidebarInset className="dashboard-inset min-w-0">
      <header className="dashboard-shell-header flex min-h-20 shrink-0 items-center justify-between gap-3 px-5 py-4 sm:px-8 lg:px-12">
        <Tooltip>
          <TooltipTrigger render={<SidebarTrigger className="-ml-2 size-11 rounded-xl text-muted-foreground" />} />
          <TooltipContent side="bottom">Toggle navigation</TooltipContent>
        </Tooltip>
        <div className="flex items-center gap-2">
          <Dialog>
            <Tooltip>
              <TooltipTrigger render={<DialogTrigger render={<Button variant="ghost" size="icon" className="size-11 rounded-xl text-muted-foreground" aria-label="About this dashboard" />} />}>
                <CircleHelp className="size-[19px] stroke-[1.6]" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent side="bottom">About this dashboard</TooltipContent>
            </Tooltip>
            <DialogContent className="gap-6 p-6 sm:max-w-md">
              <DialogHeader className="gap-3 pr-5">
                <DialogTitle className="text-lg">About this dashboard</DialogTitle>
                <DialogDescription className="leading-6">{section.description}</DialogDescription>
              </DialogHeader>
              <div className="flex gap-3 rounded-xl bg-muted/50 p-4">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div className="flex flex-col gap-2">
                  <p className="font-medium">Private practice workspace</p>
                  <p className="text-sm leading-6 text-muted-foreground" aria-live="polite">{checkedLabel(fetchedAt, loaded)}</p>
                  <p className="text-sm leading-6 text-muted-foreground">Use Refresh to check the latest data. Each source keeps its own reporting window and availability.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" size="icon" className="size-11 rounded-xl bg-card text-muted-foreground shadow-none" onClick={onRefresh} disabled={loading} aria-label={loading ? 'Refreshing dashboard' : 'Refresh dashboard'} />}>
              <RefreshCw aria-hidden="true" className={`size-[18px] stroke-[1.6] ${loading ? 'animate-spin' : ''}`} />
            </TooltipTrigger>
            <TooltipContent side="bottom">{loading ? 'Refreshing dashboard' : 'Refresh dashboard'}</TooltipContent>
          </Tooltip>
          <span className="sr-only" role="status">{loading ? 'Refreshing dashboard' : checkedLabel(fetchedAt, loaded)}</span>
        </div>
      </header>
      <div className="dashboard-content mx-auto flex w-full max-w-[1440px] flex-col gap-9 px-5 pb-12 pt-3 sm:gap-10 sm:px-8 sm:pt-5 lg:px-12 lg:pb-16">
        <div className="dashboard-page-intro">
          <h1 id="dashboard-heading" ref={heading} tabIndex={-1} className="text-3xl font-semibold tracking-tight outline-none sm:text-4xl">{section.title}</h1>
        </div>
        {children}
      </div>
    </SidebarInset>
  </>
}

export function DashboardShell(props: DashboardShellProps) {
  return <SidebarProvider style={{ '--sidebar-width': '15.5rem' } as CSSProperties} className="dashboard-shell">
    <ShellContent {...props} />
  </SidebarProvider>
}
