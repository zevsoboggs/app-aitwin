import { useEffect, useState } from "react";
import { Bell, User, Menu, ChevronDown, Search, Users as UsersIcon } from "lucide-react";
import { Button } from "./button";
import { Avatar, AvatarFallback } from "./avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "./input";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "./command";

interface HeaderProps {
  toggleMobileSidebar: () => void;
  pageTitle?: string;
}

export function Header({ toggleMobileSidebar, pageTitle }: HeaderProps) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [openCmd, setOpenCmd] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenCmd((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const determinePageTitle = () => {
    if (pageTitle) return pageTitle;
    const routeTitles: Record<string, string> = {
      "/dashboard": "Панель управления",
      "/assistants": "Ассистенты",
      "/knowledge-base": "База знаний",
      "/messages": "Сообщения",
      "/channels": "Каналы",
      "/telephony": "Телефония",
      "/notifications": "Рассылки",
      "/analytics": "Аналитика",
      "/team": "Команда",
      "/billing": "Тарифы",
    };
    return routeTitles[location] || "AiTwin";
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getUserInitials = () => {
    if (!user) return "АП";
    if (user.name) {
      if (user.name.startsWith("+7")) return <User className="h-5 w-5" />;
      const parts = user.name.split(" ");
      if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return user.name.substring(0, 2).toUpperCase();
    }
    if (user.email) return user.email.substring(0, 2).toUpperCase();
    return user.phone ? <User className="h-5 w-5" /> : "АП";
  };

  return (
    <header className="sticky top-0 z-20 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-3 px-3 md:h-16 md:px-6">
        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMobileSidebar} aria-label="Открыть меню">
          <Menu className="h-6 w-6" />
        </Button>

        {/* Brand */}
        <Link href="/">
          <div className="mr-1.5 flex cursor-pointer items-center rounded-md px-1 py-1 hover:bg-accent">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">A</div>
            <span className="ml-2 hidden text-base font-semibold md:block">AiTwin</span>
          </div>
        </Link>

        {/* Title and search */}
        <div className="flex flex-1 items-center gap-3">
          <h1 className="hidden truncate text-lg font-semibold md:block md:text-xl">{determinePageTitle()}</h1>
          <div className="relative ml-auto hidden w-full max-w-sm md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Поиск... (Ctrl/⌘+K)" className="pl-9" onFocus={() => setOpenCmd(true)} />
          </div>
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="icon" aria-label="Открыть палитру" onClick={() => setOpenCmd(true)}>
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Команда" onClick={() => navigate("/team")}>
            <UsersIcon className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Уведомления">
            <Bell className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 rounded-full px-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback>{typeof getUserInitials() === "string" ? getUserInitials() : getUserInitials()}</AvatarFallback>
                </Avatar>
                <ChevronDown className="ml-1.5 h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name || "Пользователь"}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>Профиль</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>Настройки</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Выйти</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Command Palette */}
      <CommandDialog open={openCmd} onOpenChange={setOpenCmd}>
        <CommandInput placeholder="Поиск по разделам и действиям..." />
        <CommandList>
          <CommandEmpty>Ничего не найдено</CommandEmpty>
          <CommandGroup heading="Навигация">
            <CommandItem onSelect={() => navigate("/dashboard")}>Панель управления</CommandItem>
            <CommandItem onSelect={() => navigate("/assistants")}>Ассистенты</CommandItem>
            <CommandItem onSelect={() => navigate("/knowledge-base")}>База знаний</CommandItem>
            <CommandItem onSelect={() => navigate("/communications")}>Сообщения</CommandItem>
            <CommandItem onSelect={() => navigate("/channels")}>Каналы</CommandItem>
            <CommandItem onSelect={() => navigate("/billing")}>Тарифы</CommandItem>
            <CommandItem onSelect={() => navigate("/analytics")}>Аналитика</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Действия">
            <CommandItem onSelect={() => navigate("/profile")}>Открыть профиль</CommandItem>
            <CommandItem onSelect={() => navigate("/settings")}>Открыть настройки</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
