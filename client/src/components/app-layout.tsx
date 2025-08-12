import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./ui/sidebar";
import { Header } from "./ui/header";
import InstructionsFeatureNotification from "./shared/instructions-feature-notification";
import { useAuth } from "@/contexts/AuthContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getPageName = (path: string) => {
    if (path.includes("/analytics")) return "аналитики";
    if (path.includes("/channels")) return "каналов";
    if (path.includes("/knowledge-base")) return "базы знаний";
    if (path.includes("/assistants")) return "ассистентов";
    if (path.includes("/messages")) return "сообщений";
    if (path.includes("/notifications")) return "уведомлений";
    if (path.includes("/billing")) return "тарифов";
    if (path.includes("/settings")) return "настроек";
    if (path.includes("/dashboard")) return "панели управления";
    return "платформы";
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        isMobileSidebarOpen={isMobileSidebarOpen}
        toggleMobileSidebar={toggleMobileSidebar}
      />

      <div className="flex min-h-screen flex-1 flex-col md:ml-64">
        <Header toggleMobileSidebar={toggleMobileSidebar} />
        <main className="no-scrollbar flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>

      <InstructionsFeatureNotification
        userId={user?.id}
        pageName={getPageName(location)}
      />
    </div>
  );
}
