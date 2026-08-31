import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>
type Part = [string, Record<string, string | number>]

const makeIcon = (parts: Part[]) => function Icon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {parts.map(([tag, attributes], index) => {
      if (tag === 'circle') return <circle key={index} {...attributes} />
      if (tag === 'rect') return <rect key={index} {...attributes} />
      return <path key={index} {...attributes} />
    })}
  </svg>
}

export const Search = makeIcon([['circle',{cx:11,cy:11,r:8}],['path',{d:'m21 21-4.3-4.3'}]])
export const Mail = makeIcon([['rect',{x:3,y:5,width:18,height:14,rx:2}],['path',{d:'m3 7 9 6 9-6'}]])
export const Phone = makeIcon([['path',{d:'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z'}]])
export const Users = makeIcon([['path',{d:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'}],['circle',{cx:9,cy:7,r:4}],['path',{d:'M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'}]])
export const UserRound = makeIcon([['circle',{cx:12,cy:8,r:5}],['path',{d:'M20 21a8 8 0 0 0-16 0'}]])
export const TrendingUp = makeIcon([['path',{d:'m3 17 6-6 4 4 8-8'}],['path',{d:'M15 7h6v6'}]])
export const Sparkles = makeIcon([['path',{d:'m12 3-1.9 4.8a2 2 0 0 1-1.2 1.2L4 11l4.9 1.9a2 2 0 0 1 1.2 1.2L12 19l1.9-4.9a2 2 0 0 1 1.2-1.2L20 11l-4.9-1.9a2 2 0 0 1-1.2-1.2z'}],['path',{d:'M5 3v4M3 5h4M19 17v4M17 19h4'}]])
export const MousePointerClick = makeIcon([['path',{d:'m9 9 5 12 1.8-5.2L21 14z'}],['path',{d:'M7.2 2.2 8 5.1M2.2 7.2 5.1 8M14 4l-2 2M4 14l2-2'}]])
export const LayoutDashboard = makeIcon([['rect',{x:3,y:3,width:7,height:9,rx:1}],['rect',{x:14,y:3,width:7,height:5,rx:1}],['rect',{x:14,y:12,width:7,height:9,rx:1}],['rect',{x:3,y:16,width:7,height:5,rx:1}]])
export const ExternalLink = makeIcon([['path',{d:'M15 3h6v6M10 14 21 3'}],['path',{d:'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'}]])
export const Menu = makeIcon([['path',{d:'M4 6h16M4 12h16M4 18h16'}]])
export const ChevronDown = makeIcon([['path',{d:'m6 9 6 6 6-6'}]])
export const X = makeIcon([['path',{d:'M18 6 6 18M6 6l12 12'}]])
export const SlidersHorizontal = makeIcon([['path',{d:'M21 4H14M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3'}],['path',{d:'M14 2v4M8 10v4M16 18v4'}]])
export const ArrowDownUp = makeIcon([['path',{d:'m3 16 4 4 4-4M7 20V4M21 8l-4-4-4 4M17 4v16'}]])
export const CalendarDays = makeIcon([['rect',{x:3,y:4,width:18,height:17,rx:2}],['path',{d:'M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01'}]])
export const Clock3 = makeIcon([['circle',{cx:12,cy:12,r:9}],['path',{d:'M12 7v5l-3 2'}]])
export const Moon = makeIcon([['path',{d:'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z'}]])
export const Sun = makeIcon([['circle',{cx:12,cy:12,r:4}],['path',{d:'M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41'}]])
export const LockKeyhole = makeIcon([['rect',{x:4,y:10,width:16,height:11,rx:2}],['path',{d:'M8 10V7a4 4 0 0 1 8 0v3M12 14v3'}]])
