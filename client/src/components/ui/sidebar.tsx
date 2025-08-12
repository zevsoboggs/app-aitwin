"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  MessageSquare,
  Database,
  Phone,
  Send,
  Users,
  CreditCard,
  Bot,
  X,
  Moon,
  Sun,
  Globe,
  Home,
  Share2,
  Settings,
} from "lucide-react";
import { Button } from "./button";
import { useTheme } from "../../contexts/ThemeContext";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./sheet";
import { ScrollArea } from "./scroll-area";

interface SidebarProps {
  isMobileSidebarOpen?: boolean;
  toggleMobileSidebar?: () => void;
}

export function Sidebar({ isMobileSidebarOpen, toggleMobileSidebar }: SidebarProps) {
  const [internalMobileSidebarOpen, setInternalMobileSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();

  const mobileSidebarOpen = isMobileSidebarOpen !== undefined ? isMobileSidebarOpen : internalMobileSidebarOpen;

  useEffect(() => {
    document.body.style.overflow = mobileSidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileSidebarOpen]);

  const handleToggleMobileSidebar = () => {
    if (toggleMobileSidebar) toggleMobileSidebar();
    else setInternalMobileSidebarOpen(!internalMobileSidebarOpen);
  };

  const navItems = [
    { icon: <Home className="h-5 w-5" />, text: "Панель управления", href: "/dashboard" },
    { icon: <Bot className="h-5 w-5" />, text: "Ассистенты", href: "/assistants" },
    { icon: <Database className="h-5 w-5" />, text: "База знаний", href: "/knowledge-base" },
    { icon: <MessageSquare className="h-5 w-5" />, text: "Сообщения", href: "/communications" },
    { icon: <Globe className="h-5 w-5" />, text: "Каналы", href: "/channels" },
    { icon: <Phone className="h-5 w-5" />, text: "Телефония", href: "/telephony" },
    { icon: <Send className="h-5 w-5" />, text: "Рассылки", href: "/notifications" },
    { icon: <BarChart3 className="h-5 w-5" />, text: "Аналитика", href: "/analytics" },
    { icon: <Users className="h-5 w-5" />, text: "Команда", href: "/team" },
    { icon: <Share2 className="h-5 w-5" />, text: "Кабинет партнёра", href: "/referrals" },
    { icon: <CreditCard className="h-5 w-5" />, text: "Тарифы", href: "/billing" },
    { icon: <Settings className="h-5 w-5" />, text: "Настройки", href: "/settings" },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 border-r bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 md:block">
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="flex h-16 items-center border-b px-4">
            <Link href="/">
              <div className="flex cursor-pointer items-center rounded-lg px-2 py-1 hover:bg-accent">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <Bot className="h-5 w-5" />
                </div>
                <span className="ml-2 text-lg font-semibold">AiTwin</span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1">
            <nav className="no-scrollbar px-3 py-3">
              <ul className="space-y-1.5">
                {navItems.map((item) => {
                  const active = location === item.href || (item.href === "/dashboard" && location === "/");
                  return (
                    <li key={item.href}>
                      <Link href={item.href} className="block">
                        <div className={cnItem(active)}>
                          <span className={cnIcon(active)}>{item.icon}</span>
                          <span className="truncate">{item.text}</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6 border-t pt-3" />
              <div className="px-2 pb-3">
                <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? (
                    <>
                      <Sun className="mr-2 h-4 w-4" /> Светлая тема
                    </>
                  ) : (
                    <>
                      <Moon className="mr-2 h-4 w-4" /> Тёмная тема
                    </>
                  )}
                </Button>
              </div>
            </nav>
          </ScrollArea>
        </div>
      </aside>

      {/* Mobile drawer via Sheet */}
      <Sheet open={mobileSidebarOpen} onOpenChange={handleToggleMobileSidebar}>
        <SheetContent side="left" className="w-3/4 max-w-xs p-0 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="flex h-14 items-center justify-between border-b px-4 md:h-16">
            <div className="flex items-center">
              <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold">AiTwin</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleToggleMobileSidebar} aria-label="Закрыть">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-56px)] md:h-[calc(100vh-64px)]">
            <nav className="no-scrollbar px-4 py-4">
              <ul className="space-y-1.5">
                {navItems.map((item) => {
                  const active = location === item.href || (item.href === "/dashboard" && location === "/");
                  return (
                    <li key={item.href}>
                      <div
                        className={cnItem(active, true)}
                        onClick={() => {
                          handleToggleMobileSidebar();
                          setTimeout(() => (window.location.href = item.href), 0);
                        }}
                      >
                        <span className={cnIcon(active)}>{item.icon}</span>
                        <span>{item.text}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 border-t pt-4">
                <Button variant="outline" className="w-full justify-start rounded-xl" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? (
                    <>
                      <Sun className="mr-2 h-4 w-4" /> Светлая тема
                    </>
                  ) : (
                    <>
                      <Moon className="mr-2 h-4 w-4" /> Тёмная тема
                    </>
                  )}
                </Button>
              </div>
            </nav>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

function cnItem(active: boolean, isMobile = false) {
  return `relative flex items-center rounded-xl px-3 py-2 transition-colors ${
    active ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "hover:bg-muted/60"
  } ${isMobile ? "border" : ""}`;
}
function cnIcon(active: boolean) {
  return `mr-2 flex h-8 w-8 items-center justify-center rounded-lg ${active ? "bg-primary/15 text-primary" : "bg-muted/60"}`;
}

// SidebarItem оставлен для совместимости экспорта
export type SidebarItemProps = never;
export function SidebarItem(_: SidebarItemProps) { return null; }
