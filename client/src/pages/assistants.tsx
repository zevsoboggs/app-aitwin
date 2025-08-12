import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useMemo } from "react";
import * as React from "react";
import {
  Bot,
  Plus,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  AlertTriangle,
  Book,
  Sparkles,
  LayoutGrid,
  List as ListIcon,
  ArrowUpDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import AssistantCard from "@/components/assistants/assistant-card";
import CreateAssistantDialog from "@/components/assistants/create-assistant-dialog";
import EditAssistantDialog from "@/components/assistants/edit-assistant-dialog-new";
import AssistantFilesDialog from "@/components/assistants/assistant-files-dialog";
import AssistantChatDialog from "@/components/assistants/assistant-chat-dialog";
import AssistantTestDialog from "@/components/assistants/assistant-test-dialog";
import KnowledgeFilesDialog from "@/components/assistants/knowledge-files-dialog";
import AssistantsInstructionsDialog from "@/components/assistants/assistants-instructions-dialog";
import { DeleteAssistantDialog } from "@/components/assistants/delete-assistant-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTariffLimits } from "@/hooks/use-tariff-limits";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Определение типа для ассистента
interface Assistant {
  id: number;
  name: string;
  description?: string;
  status?: string;
  role?: string;
  openaiAssistantId?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  [key: string]: any; // Для других возможных полей
}

// Определение типа для статуса OpenAI
interface OpenAIStatus {
  status: string;
  [key: string]: any;
}

export default function Assistants() {
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [filesDialogOpen, setFilesDialogOpen] = useState(false);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [knowledgeFilesDialogOpen, setKnowledgeFilesDialogOpen] =
    useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [instructionsDialogOpen, setInstructionsDialogOpen] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(
    null
  );
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("updated_desc");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(9);

  // Получаем информацию о лимитах тарифа
  const {
    canCreateAssistant,
    assistantsLimit,
    assistantsUsed,
    isLoading: isLimitsLoading,
    isPlanLimited,
  } = useTariffLimits();

  // Fetch assistants data
  const {
    data: assistants = [],
    isLoading,
    isError,
  } = useQuery<Assistant[]>({
    queryKey: ["/api/assistants"],
    // Отключаем кеширование для получения актуальных данных
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Проверка состояния OpenAI API
  const { data: openaiStatus, isLoading: isCheckingOpenAI } =
    useQuery<OpenAIStatus>({
      queryKey: ["/api/openai/status"],
      retry: 1,
    });

  // Уникальные роли и статусы из данных
  const uniqueRoles = useMemo(() => {
    const set = new Set<string>();
    assistants?.forEach((a: any) => a?.role && set.add(a.role));
    return ["all", ...Array.from(set)];
  }, [assistants]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>();
    assistants?.forEach((a: any) => a?.status && set.add(a.status));
    return ["all", ...Array.from(set)];
  }, [assistants]);

  // Фильтрация, сортировка, пагинация
  const processedAssistants = useMemo(() => {
    const bySearch = (assistant: any) =>
      searchQuery === "" ||
      assistant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assistant.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const byRole = (assistant: any) => roleFilter === "all" || assistant.role === roleFilter;
    const byStatus = (assistant: any) => statusFilter === "all" || assistant.status === statusFilter;

    let arr = (assistants || []).filter((a: any) => bySearch(a) && byRole(a) && byStatus(a));

    arr.sort((a: any, b: any) => {
      switch (sortBy) {
        case "name_asc":
          return (a.name || "").localeCompare(b.name || "");
        case "name_desc":
          return (b.name || "").localeCompare(a.name || "");
        case "updated_asc":
          return new Date(a.updatedAt || a.lastUpdated || 0).getTime() - new Date(b.updatedAt || b.lastUpdated || 0).getTime();
        case "updated_desc":
        default:
          return new Date(b.updatedAt || b.lastUpdated || 0).getTime() - new Date(a.updatedAt || a.lastUpdated || 0).getTime();
      }
    });

    return arr;
  }, [assistants, searchQuery, roleFilter, statusFilter, sortBy]);

  const total = processedAssistants.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedAssistants.slice(start, start + pageSize);
  }, [processedAssistants, currentPage, pageSize]);

  const filteredAssistants = assistants?.filter((assistant: any) => {
    // Filter by search query
    return (
      searchQuery === "" ||
      assistant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assistant.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Получение каналов ассистента (демо)
  const getAssistantChannels = (assistant: any) => {
    if (assistant.role === "sales_manager") {
      return ["Telegram", "WhatsApp", "Сайт"];
    } else if (assistant.role === "support") {
      return ["Telegram", "Email", "Телефон"];
    } else if (assistant.role === "consultant") {
      return ["WhatsApp", "VK", "Сайт"];
    } else {
      return ["Телефон"];
    }
  };

  // Получаем queryClient для ручного обновления данных
  const queryClient = useQueryClient();

  // Принудительное обновление данных
  const refreshData = useCallback(() => {
    // Обновляем список ассистентов
    queryClient.invalidateQueries({ queryKey: ["/api/assistants"] });

    // Обновляем данные использования
    const userData = queryClient.getQueryData<{
      id: number;
      name: string;
      email: string;
      plan: string;
    }>(["/api/auth/me"]);
    if (userData?.id) {
      queryClient.invalidateQueries({ queryKey: ["/api/usage", userData.id] });
    }
  }, [queryClient]);

  const handleCreateAssistant = () => {
    // Проверяем статус OpenAI перед созданием
    if (openaiStatus?.status !== "connected") {
      toast({
        title: "Ошибка соединения",
        description:
          "Невозможно создать ассистента: нет соединения с OpenAI API",
        variant: "destructive",
      });
      return;
    }

    // Проверяем ограничения тарифного плана
    if (!canCreateAssistant) {
      toast({
        title: "Ограничение тарифа",
        description: `Достигнут лимит ассистентов (${assistantsUsed}/${assistantsLimit}). Для добавления новых ассистентов необходимо перейти на тариф выше.`,
        variant: "destructive",
      });
      return;
    }

    setCreateDialogOpen(true);
  };

  const handleAssistantSettingsClick = (assistant: any) => {
    setSelectedAssistant(assistant);
    setEditDialogOpen(true);
  };

  const handleAssistantDialogsClick = (assistant: any) => {
    // Проверяем возможность открытия чата
    if (!assistant.openaiAssistantId) {
      toast({
        title: "Ошибка",
        description:
          "Этот ассистент не синхронизирован с OpenAI. Необходимо настроить ассистента для синхронизации.",
        variant: "destructive",
      });
      return;
    }
    setSelectedAssistant(assistant);
    setChatDialogOpen(true);
  };

  const handleKnowledgeClick = (assistant: any) => {
    // Проверяем возможность открытия диалога базы знаний
    if (!assistant.openaiAssistantId) {
      toast({
        title: "Ошибка",
        description:
          "Этот ассистент не синхронизирован с OpenAI. Отредактируйте его данные для синхронизации.",
        variant: "destructive",
      });
      return;
    }
    setSelectedAssistant(assistant);
    setKnowledgeFilesDialogOpen(true);
  };

  const handleFilesClick = (assistant: any) => {
    setSelectedAssistant(assistant);
    setFilesDialogOpen(true);
  };

  const handleTestClick = (assistant: any) => {
    // Проверяем возможность открытия тестового диалога
    if (!assistant.openaiAssistantId) {
      toast({
        title: "Ошибка",
        description:
          "Этот ассистент не синхронизирован с OpenAI. Необходимо настроить ассистента для синхронизации.",
        variant: "destructive",
      });
      return;
    }
    setSelectedAssistant(assistant);
    setTestDialogOpen(true);
  };

  // Обработчик кнопки "Удалить"
  const handleDeleteClick = (assistant: any) => {
    setSelectedAssistant(assistant);
    setDeleteDialogOpen(true);
  };

  // Отображение статуса OpenAI
  const renderOpenAIStatus = () => {
    if (isCheckingOpenAI) {
      return (
        <div className="flex items-center text-xs md:text-sm text-neutral-500">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Проверка соединения...
        </div>
      );
    }

    if (openaiStatus?.status === "connected") {
      return (
        <div className="flex items-center text-xs md:text-sm text-green-600">
          <CheckCircle className="w-4 h-4 mr-2" />
          Соединение установлено
        </div>
      );
    }

    return (
      <div className="flex items-center text-sm text-red-600">
        <AlertCircle className="w-4 h-4 mr-2" />
        Нет соединения
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="gap-1"><Sparkles className="h-4 w-4" /> Раздел обновлён</Badge>
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Ваши ассистенты</h2>
            <Button variant="secondary" size="icon" onClick={() => setInstructionsDialogOpen(true)} title="Инструкция по работе с ассистентами">
              <Book className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Создавайте, обучайте и подключайте ассистентов к каналам</p>
        </div>
        <div className="flex items-center gap-2">
          {renderOpenAIStatus()}
          <Button onClick={handleCreateAssistant} disabled={openaiStatus?.status !== "connected" || !canCreateAssistant} title={!canCreateAssistant ? `Достигнут лимит ассистентов (${assistantsUsed}/${assistantsLimit})` : undefined}>
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:block">Создать ассистента</span>
          </Button>
        </div>
      </div>

      {/* Toolbar: search, filters, sorting, view */}
      {assistants && assistants.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Поиск ассистентов..." className="pl-10" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} />
            </div>
            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Роль" /></SelectTrigger>
                <SelectContent>
                  {uniqueRoles.map((r) => (
                    <SelectItem key={r} value={r}>{r === "all" ? "Любая роль" : r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Статус" /></SelectTrigger>
                <SelectContent>
                  {uniqueStatuses.map((s) => (
                    <SelectItem key={s} value={s}>{s === "all" ? "Любой статус" : s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Сортировка" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_desc"><span className="inline-flex items-center gap-2"><ArrowUpDown className="h-4 w-4" /> По обновлению ↓</span></SelectItem>
                <SelectItem value="updated_asc">По обновлению ↑</SelectItem>
                <SelectItem value="name_asc">По имени A→Z</SelectItem>
                <SelectItem value="name_desc">По имени Z→A</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-1 inline-flex rounded-md border bg-card p-1">
              <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" onClick={() => setViewMode("grid")} title="Сетка">
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" onClick={() => setViewMode("list")} title="Список">
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {assistants && assistants.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Всего: <Badge variant="secondary">{total}</Badge></span>
          {roleFilter !== "all" && <span>Роль: <Badge variant="outline">{roleFilter}</Badge></span>}
          {statusFilter !== "all" && <span>Статус: <Badge variant="outline">{statusFilter}</Badge></span>}
          {searchQuery && <span>Поиск: <Badge variant="outline">{searchQuery}</Badge></span>}
        </div>
      )}

      {/* Content states */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex h-[320px] flex-col items-center justify-center">
          <AlertCircle className="mb-4 h-6 w-6 text-destructive" />
          <p className="text-destructive">Ошибка при загрузке ассистентов</p>
        </div>
      ) : processedAssistants.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground">Ничего не найдено по заданным условиям</p>
        </div>
      ) : (
        <>
          <div className={`grid gap-4 ${viewMode === "grid" ? "md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
            {pageItems.map((assistant: any) => (
              <AssistantCard
                key={assistant.id}
                id={assistant.id}
                name={assistant.name}
                status={assistant.status as any}
                channels={getAssistantChannels(assistant)}
                onSettingsClick={() => handleAssistantSettingsClick(assistant)}
                onDialogsClick={() => handleAssistantDialogsClick(assistant)}
                onTestClick={() => handleTestClick(assistant)}
                onDeleteClick={() => handleDeleteClick(assistant)}
                onClick={() => handleAssistantSettingsClick(assistant)}
              />
            ))}

            {/* Create card */}
            <Card className="border-dashed bg-muted/50">
              <CardContent className="flex items-center justify-center py-12">
                <Button variant="outline" onClick={handleCreateAssistant} disabled={!canCreateAssistant} title={!canCreateAssistant ? `Достигнут лимит ассистентов (${assistantsUsed}/${assistantsLimit})` : undefined}>
                  <Plus className="mr-2 h-4 w-4" /> Создать ассистента
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                Страница <Badge variant="secondary">{currentPage}</Badge> из <Badge variant="secondary">{totalPages}</Badge>
                <span className="ml-3">На странице:</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[6, 9, 12, 18].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Назад</Button>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Вперёд</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Existing banners, dialogs remain below */}
      {!isLimitsLoading && !assistantsLimit && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/30">
          <div className="flex items-start">
            <AlertTriangle className="mr-3 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-300">Необходимо активировать тариф</h4>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">Для создания ассистентов требуется активный тарифный план.{" "}{!isPlanLimited && <span>Доступен бесплатный пробный период.</span>}</p>
              <div className="mt-3 flex gap-3">
                <Button asChild variant="default" size="sm"><Link href="/billing">{!isPlanLimited ? "Активировать пробный период" : "Подключить тариф"}</Link></Button>
                <Button asChild variant="outline" size="sm"><Link href="/pricing">Сравнить тарифы</Link></Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {processedAssistants.length > 0 && !canCreateAssistant && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/30">
          <div className="flex items-start">
            <AlertTriangle className="mr-3 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-300">Достигнут лимит ассистентов</h4>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">Вы используете {assistantsUsed} из {assistantsLimit}. Для создания дополнительных ассистентов перейдите на тариф выше.</p>
              <Button asChild className="mt-3" variant="outline" size="sm"><Link href="/billing">Изменить тариф</Link></Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateAssistantDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) refreshData();
        }}
      />
      <EditAssistantDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} assistant={selectedAssistant as any} />
      <AssistantFilesDialog open={filesDialogOpen} onOpenChange={setFilesDialogOpen} assistant={selectedAssistant} />
      <AssistantChatDialog open={chatDialogOpen} onOpenChange={setChatDialogOpen} assistant={selectedAssistant as any} />
      <KnowledgeFilesDialog open={knowledgeFilesDialogOpen} onOpenChange={setKnowledgeFilesDialogOpen} assistantId={selectedAssistant?.id || 0} />
      <AssistantTestDialog open={testDialogOpen} onOpenChange={setTestDialogOpen} assistant={selectedAssistant as any} />
      <AssistantsInstructionsDialog open={instructionsDialogOpen} onOpenChange={setInstructionsDialogOpen} />
      <DeleteAssistantDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) refreshData();
        }}
        assistantId={selectedAssistant?.id}
        assistantName={selectedAssistant?.name}
      />
    </div>
  );
}

