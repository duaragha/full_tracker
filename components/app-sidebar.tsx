"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Gamepad2, BookOpen, Home, Tv, Film, Package, Zap } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar"

const navItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "PHEV KMs",
    url: "/phev",
    icon: Zap,
  },
  {
    title: "Games",
    url: "/games",
    icon: Gamepad2,
  },
  {
    title: "Books",
    url: "/books",
    icon: BookOpen,
  },
  {
    title: "TV Shows",
    url: "/tvshows",
    icon: Tv,
  },
  {
    title: "Movies",
    url: "/movies",
    icon: Film,
  },
  {
    title: "Inventory",
    url: "/inventory",
    icon: Package,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar {...props} style={{ width: '180px' } as React.CSSProperties}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2 sm:py-3">
          <BarChart3 className="size-6 sm:size-5" />
          <div className="flex flex-col">
            <span className="font-semibold text-base sm:text-sm">Full Tracker</span>
            <span className="text-xs text-muted-foreground">Track everything</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs px-2 text-muted-foreground">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} className="px-3 h-11 sm:px-2 sm:h-9">
                    <Link href={item.url} className="text-base sm:text-sm">
                      <item.icon className="size-5 sm:size-4 mr-3 sm:mr-2" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
