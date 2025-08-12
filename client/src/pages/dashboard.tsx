import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/page-header";
import MetricsCard from "@/components/dashboard/metrics-card";
import ActivityItem from "@/components/dashboard/activity-item";
import { AssistantCard } from "@/components/dashboard/assistant-card";
import FileCard from "@/components/knowledge-base/file-card";
import BalanceCard from "@/components/dashboard/balance-card";
import PaymentHistory from "@/components/dashboard/payment-history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VideoDialog } from "@/components/ui/video-dialog";
import { generateDateLabels } from "@/lib/utils/charts";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { formatFileSize, KNOWLEDGE_FILE_TYPES } from "@/lib/constants";
import { RefreshCw, X, Plus, Upload, Book, BarChart3, Sparkles, Globe } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation } from "wouter";
import DashboardInstructionsDialog from "@/components/dashboard/dashboard-instructions-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface ActivityContentProps {
  action: string;
  details: any;
}

const ActivityContent = ({ action, details }: ActivityContentProps) => {
  switch (action) {
    case "processed_requests":
      return (
        <>
          <span className="font-medium">
            Ассистент {details.assistantName || "без имени"}
          </span>{" "}
          обработал{" "}
          <span className="font-medium">{details.count} новых сообщений</span>
        </>
      );
    case "added_team_member":
      return (
        <>
          <span className="font-medium">{details.name || "Пользователь"}</span>{" "}
          был добавлен в команду с ролью{" "}
          <span className="font-medium">{details.role || "участник"}</span>
        </>
      );
    case "sent_newsletter":
      return (
        <>
          Рассылка{" "}
          <span className="font-medium">{details.name || "без названия"}</span>{" "}
          была отправлена{" "}
          <span className="font-medium">
            {details.recipients || 0} пользователям
          </span>
        </>
      );
    case "connected_channel":
      return (
        <>
          Канал{" "}
          <span className="font-medium">{details.name || "без названия"}</span>{" "}
          был успешно подключен к системе
        </>
      );
    case "payment_received":
      return (
        <>
          Получен платеж на сумму{" "}
          <span className="font-medium">{details.amount || 0} руб.</span>
        </>
      );
    case "assistant_created":
      return (
        <>
          Создан новый ассистент{" "}
          <span className="font-medium">{details.name || "без имени"}</span>
        </>
      );
    case "knowledge_base_updated":
      return (
        <>
          Файл{" "}
          <span className="font-medium">
            {details.fileName || "без названия"}
          </span>{" "}
          добавлен в базу знаний
        </>
      );
    default:
      return <>{action}</>;
  }
};

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState("week");
  const [location] = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [instructionsDialogOpen, setInstructionsDialogOpen] = useState(false);

  // Эффект для определения мобильного устройства
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1500); // sm breakpoint в Tailwind
    };

    // Проверка при монтировании
    checkIsMobile();

    // Проверка при изменении размера окна
    window.addEventListener("resize", checkIsMobile);

    // Очистка при размонтировании
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // Получаем текущего пользователя
  const { data: userData, isLoading: isLoadingUser } = useQuery<{
    id: number;
    name: string | null;
    email: string;
    role: string;
  }>({
    queryKey: ["/api/auth/me"],
  });

  // Обработчик изменения периода времени
  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    // Ручную инвалидацию здесь делать не нужно,
    // так как запросы используют timeRange в качестве зависимости,
    // и React Query автоматически обновит данные
  };
  const [isUpdatingMetrics, setIsUpdatingMetrics] = useState(false);

  // Fetch active dialogs data
  const { data: activeDialogs, isLoading: isLoadingDialogs } = useQuery<
    { date: string; count: number }[]
  >({
    queryKey: ["/api/metrics/active-dialogs", timeRange],
    queryFn: () =>
      apiRequest({
        url: `/api/metrics/active-dialogs?period=${timeRange}`,
        method: "GET",
      }),
  });

  // Fetch metrics for the current period
  const { data: periodMetrics, isLoading: isLoadingPeriodMetrics } =
    useQuery<any>({
      queryKey: ["/api/metrics/period", timeRange],
      queryFn: () =>
        apiRequest({
          url: `/api/metrics/period?period=${timeRange}`,
          method: "GET",
        }),
    });

  // Fetch recent activity
  const { data: activityData, isLoading: isLoadingActivity } = useQuery<any[]>({
    queryKey: ["/api/activity"],
  });

  // Fetch assistants
  const { data: assistantsData, isLoading: isLoadingAssistants } = useQuery<
    any[]
  >({
    queryKey: ["/api/assistants"],
  });

  // Fetch knowledge base items
  const { data: knowledgeData, isLoading: isLoadingKnowledge } = useQuery<
    any[]
  >({
    queryKey: ["/api/knowledge"],
  });

  // Мутация для обновления метрик
  const updateMetricsMutation = useMutation({
    mutationFn: () =>
      apiRequest({ url: "/api/metrics/update", method: "POST" }),
    onSuccess: () => {
      // Инвалидируем кэш метрик и активных диалогов, чтобы получить обновленные данные
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/metrics/active-dialogs", timeRange],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/metrics/period", timeRange],
      });

      toast({
        title: "Метрики обновлены",
        description: "Данные аналитики успешно обновлены",
      });
      setIsUpdatingMetrics(false);
    },
    onError: (error) => {
      console.error("Ошибка при обновлении метрик:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить метрики",
        variant: "destructive",
      });
      setIsUpdatingMetrics(false);
    },
  });

  // Функция для обновления метрик
  const handleUpdateMetrics = () => {
    setIsUpdatingMetrics(true);
    updateMetricsMutation.mutate();
  };

  const handleCreateAssistant = () => {
    window.location.href = "/assistants";
  };

  const handleUploadFile = () => {
    window.location.href = "/knowledge-base";
  };

  const getFileTypeInfo = (fileType: string) => {
    const fileTypeInfo = KNOWLEDGE_FILE_TYPES.find(
      (type) => type.id === fileType
    );
    return fileTypeInfo || KNOWLEDGE_FILE_TYPES[0];
  };

  const dateLabels = generateDateLabels();

  const latestMetric = null; // Убираем использование глобальных метрик

  // Получаем соответствующие метрики за выбранный период
  const isLoadingAnyMetrics = isLoadingPeriodMetrics || isLoadingDialogs;

  // Строка для отображения периода в интерфейсе
  const periodLabel =
    {
      day: "за сегодня",
      week: "за неделю",
      month: "за месяц",
      year: "за год",
    }[timeRange] || "за неделю";

  return (
    <div id="dashboard-content" className="px-2 sm:px-4">
      {/* Gradient Welcome Banner */}
      <Card className="mb-6 overflow-hidden border-0 bg-gradient-to-r from-primary/15 via-purple-500/10 to-blue-500/10 shadow-sm">
        <CardContent className="px-4 py-5 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-primary">
                <Sparkles className="h-4 w-4" /> Добро пожаловать в AiTwin
              </div>
              <h2 className="text-2xl font-semibold leading-tight">Быстрый старт: подключите каналы, создайте ассистента и загрузите знания</h2>
              <p className="text-sm text-muted-foreground">Всё под рукой: действия ниже помогут запустить платформу за пару минут</p>
            </div>
            <div className="flex gap-2">
              <Button variant="default" onClick={() => (window.location.href = "/assistants")}>
                <Plus className="mr-2 h-4 w-4" /> Создать ассистента
              </Button>
              <Button variant="outline" onClick={() => (window.location.href = "/channels")}>
                <Globe className="mr-2 h-4 w-4" /> Подключить канал
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hero Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="gap-1"><Sparkles className="h-4 w-4" /> Панель обновлена</Badge>
          </div>
          <PageHeader
            title="Панель управления"
            description="Аналитика, метрики и ключевые показатели вашего аккаунта"
            className="mb-0"
          />
          <div className="mt-1">
            <VideoDialog
              buttonText="Смотреть презентацию"
              dialogTitle="Презентация платформы AiTwin"
              videoUrl="https://rutube.ru/play/embed/e2cce8090edb9b0943a3446724ecf7f9/"
              description="01:27 • Обзор возможностей"
            />
          </div>
        </div>
        <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Период" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">За день</SelectItem>
              <SelectItem value="week">За неделю</SelectItem>
              <SelectItem value="month">За месяц</SelectItem>
              <SelectItem value="year">За год</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpdateMetrics}
            disabled={isUpdatingMetrics || isLoadingAnyMetrics}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isUpdatingMetrics ? "animate-spin" : ""}`} />
            {isUpdatingMetrics ? "Обновление..." : "Обновить метрики"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setInstructionsDialogOpen(true)}
            className="flex items-center gap-2"
            title="Инструкция по панели управления"
          >
            <Book className="h-4 w-4" /> Инструкция
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Button onClick={() => (window.location.href = "/assistants")} className="group h-auto justify-start rounded-xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary group-hover:bg-primary/20"><Plus className="h-4 w-4" /></span>
            <div>
              <div className="text-[15px] font-medium text-foreground sm:text-base">Создать ассистента</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-300">С нуля или на основе шаблона</div>
            </div>
          </div>
        </Button>
        <Button onClick={() => (window.location.href = "/channels")} className="group h-auto justify-start rounded-xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary group-hover:bg-primary/20"><Globe className="h-4 w-4" /></span>
            <div>
              <div className="text-[15px] font-medium text-foreground sm:text-base">Подключить каналы</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-300">Веб‑чат, телефония, почта и др.</div>
            </div>
          </div>
        </Button>
        <Button onClick={() => (window.location.href = "/knowledge-base")} className="group h-auto justify-start rounded-xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary group-hover:bg-primary/20"><Upload className="h-4 w-4" /></span>
            <div>
              <div className="text-[15px] font-medium text-foreground sm:text-base">Загрузить знания</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-300">Документы и материалы для обучения</div>
            </div>
          </div>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 md:gap-4">
        {isLoadingAnyMetrics ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <MetricsCard title="Активных диалогов" value={periodMetrics?.totalConversations ?? 0} icon="forum" subtitle={periodLabel} isLoading={false} />
            <MetricsCard title="Всего сообщений" value={periodMetrics?.totalMessages ?? 0} icon="message" subtitle={periodLabel} iconColor="text-blue-500 dark:text-blue-400" isLoading={false} />
            <MetricsCard title="Среднее время ответа" value={`${periodMetrics?.avgResponseTime ? (periodMetrics.avgResponseTime / 1000).toFixed(1) : "0.0"} сек`} icon="schedule" iconColor="text-amber-500 dark:text-amber-400" isLoading={false} />
            <MetricsCard title="Успешных ответов" value={`${periodMetrics?.successRate ?? 0}%`} icon="check_circle" iconColor="text-green-500 dark:text-green-400" isLoading={false} />
          </>
        )}
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <Card className="col-span-1 md:col-span-2">
          <CardContent className="pt-4 sm:pt-6">
            <div className="mb-4 flex flex-col justify-between gap-2 xs:flex-row xs:items-center">
              <h3 className="font-medium text-neutral-900 dark:text-white">Активность диалогов {periodLabel}</h3>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {timeRange === "day" ? "По часам" : timeRange === "week" ? "По дням" : timeRange === "month" ? "По неделям" : "По месяцам"}
              </span>
            </div>
            <div className="flex h-56 items-end gap-1 overflow-hidden rounded-md border bg-gradient-to-b from-white to-neutral-50 p-2 shadow-inner dark:from-neutral-800 dark:to-neutral-900">
              {isLoadingDialogs ? (
                <div className="flex h-full w-full items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !activeDialogs || activeDialogs.length === 0 ? (
                <div className="flex h-full w-full items-center justify-center text-neutral-500">Данные появятся по мере использования</div>
              ) : (
                activeDialogs.map((item, idx) => {
                  const max = Math.max(...activeDialogs.map((d: any) => d.count));
                  const heightPercent = item.count > 0 ? (max > 0 ? 8 + Math.round((item.count / max) * 84) : 8) : 0;
                  const height = heightPercent > 0 ? `${heightPercent}%` : "0";
                  return (
                    <div
                      key={idx}
                      title={`${item.count}`}
                      className={`flex-1 rounded-t bg-primary/70 transition-[height] duration-300 ease-in-out dark:bg-primary/60 ${item.count === 0 ? "bg-transparent" : ""}`}
                      style={{ height, minHeight: item.count > 0 ? "8px" : 0 }}
                    />
                  );
                })
              )}
            </div>
            <div className="mt-2 grid h-4 grid-flow-col text-xs text-neutral-500 dark:text-neutral-400 sm:h-auto sm:flex sm:justify-between">
              {activeDialogs && Array.isArray(activeDialogs) ? (
                timeRange === "day" && isMobile ? (
                  ["00", "04", "08", "12", "16", "20"].map((hour) => (
                    <span key={hour} className="whitespace-nowrap text-center">{hour}:00</span>
                  ))
                ) : (
                  activeDialogs.map((item, index) => {
                    let displayDate = "";
                    if (timeRange === "day") {
                      const hourMatch = item.date.match(/^(\d+):00$/);
                      displayDate = hourMatch ? `${parseInt(hourMatch[1])}:00` : item.date;
                    } else if (timeRange === "week") {
                      displayDate = new Date(item.date).toLocaleDateString("ru-RU", { weekday: "short" });
                    } else if (timeRange === "month") {
                      const weekMatch = item.date.match(/^.*-W(\d+)$/);
                      displayDate = weekMatch ? `Нед ${weekMatch[1]}` : item.date;
                    } else {
                      const monthMatch = item.date.match(/^(\d{4})-(\d{2})$/);
                      displayDate = monthMatch
                        ? new Date(parseInt(monthMatch[1]), parseInt(monthMatch[2]) - 1, 1).toLocaleDateString("ru-RU", { month: "short" })
                        : item.date;
                    }
                    return (
                      <span
                        key={index}
                        className={`flex items-end justify-center text-center sm:block ${timeRange === "day" ? "min-w-[60px] sm:min-w-[24px]" : "min-w-[24px]"}`}
                      >
                        {displayDate}
                      </span>
                    );
                  })
                )
              ) : (
                <span className="w-full text-center">Нет данных</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Popular Topics */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-lg font-semibold text-neutral-800 dark:text-neutral-200">Популярные темы {periodLabel}</h3>
            {isLoadingAnyMetrics ? (
              <div className="flex justify-center py-6"><RefreshCw className="h-6 w-6 animate-spin text-neutral-400" /></div>
            ) : !periodMetrics?.topicData || Object.keys(periodMetrics.topicData).length === 0 ? (
              <p className="py-4 text-center text-neutral-500 dark:text-neutral-400">Данные появятся по мере общения</p>
            ) : (
              <ul className="space-y-3">
                {Object.entries(periodMetrics.topicData).map(([topic, percentage], index) => {
                  const palette = [
                    "bg-primary-600 dark:bg-primary-500",
                    "bg-secondary-500 dark:bg-secondary-400",
                    "bg-amber-500 dark:bg-amber-400",
                    "bg-red-500 dark:bg-red-400",
                    "bg-purple-500 dark:bg-purple-400",
                  ];
                  const color = palette[index % palette.length];
                  return (
                    <li key={topic} className="flex items-center">
                      <div className="h-2.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
                        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${percentage as number}%` }} />
                      </div>
                      <span className="ml-2 min-w-[50px] text-sm text-neutral-700 dark:text-neutral-300">{percentage as number}%</span>
                      <span className="ml-2 text-sm text-neutral-700 dark:text-neutral-300">{topic}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Balance and Payment History */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <div className="col-span-1">
          {userData ? (
            <BalanceCard userId={userData.id} userName={userData.name} userEmail={userData.email} />
          ) : (
            <Skeleton className="h-40 w-full rounded-xl" />
          )}
        </div>
        <div className="col-span-1 md:col-span-2">
          {userData ? <PaymentHistory userId={userData.id} /> : <Skeleton className="h-40 w-full rounded-xl" />}
        </div>
      </div>

      {/* Recent Assistants and Knowledge Base */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium text-neutral-900 dark:text-white">Недавние ассистенты</h3>
              <a href="/assistants" className="text-sm text-primary hover:underline">Все ассистенты</a>
            </div>
            <div className="space-y-3">
              {isLoadingAssistants ? (
                <>
                  <Skeleton className="h-16 w-full rounded-md" />
                  <Skeleton className="h-16 w-full rounded-md" />
                  <Skeleton className="h-16 w-full rounded-md" />
                </>
              ) : !assistantsData || assistantsData.length === 0 ? (
                <p className="py-4 text-center text-neutral-500 dark:text-neutral-400">Пока нет ассистентов</p>
              ) : (
                assistantsData?.slice(0, 3).map((assistant) => (
                  <AssistantCard
                    key={assistant.id}
                    icon={assistant.role === "sales" ? "support_agent" : assistant.role === "consultant" ? "school" : "support"}
                    iconBg={assistant.role === "sales" ? "bg-primary-100 dark:bg-primary-900" : assistant.role === "consultant" ? "bg-secondary-100 dark:bg-secondary-900" : "bg-amber-100 dark:bg-amber-900"}
                    iconColor={assistant.role === "sales" ? "text-primary-600 dark:text-primary-300" : assistant.role === "consultant" ? "text-secondary-600 dark:text-secondary-300" : "text-amber-600 dark:text-amber-300"}
                    name={assistant.name}
                    status={assistant.status as any}
                    lastUpdated={`Изменен ${new Date(assistant.lastUpdated).toLocaleDateString("ru-RU", { weekday: "long" })}`}
                  />
                ))
              )}
            </div>
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => (window.location.href = "/assistants")} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Создать ассистента
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium text-neutral-900 dark:text-white">База знаний</h3>
              <a href="/knowledge-base" className="text-sm text-primary hover:underline">Управление</a>
            </div>
            <div className="space-y-3">
              {isLoadingKnowledge ? (
                <>
                  <Skeleton className="h-16 w-full rounded-md" />
                  <Skeleton className="h-16 w-full rounded-md" />
                  <Skeleton className="h-16 w-full rounded-md" />
                </>
              ) : !knowledgeData || knowledgeData.length === 0 ? (
                <p className="py-4 text-center text-neutral-500 dark:text-neutral-400">База пуста</p>
              ) : (
                knowledgeData?.slice(0, 3).map((file) => {
                  const fileTypeInfo = getFileTypeInfo(file.fileType);
                  return (
                    <FileCard
                      key={file.id}
                      id={file.id}
                      icon={fileTypeInfo.icon}
                      iconBg={fileTypeInfo.bg}
                      iconColor={fileTypeInfo.color}
                      fileName={file.title}
                      fileSize={formatFileSize(file.fileSize)}
                      uploadDate={`Добавлен ${new Date(file.uploadedAt).toLocaleDateString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`}
                      onClick={() => (window.location.href = `/knowledge-base/${file.id}`)}
                    />
                  );
                })
              )}
            </div>
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => (window.location.href = "/knowledge-base")} className="w-full sm:w-auto">
                <Upload className="mr-2 h-4 w-4" /> Загрузить файл
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metrics Info */}
      <Card className="mt-6">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-lg font-medium">Статистика и аналитика</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="space-y-4">
            {isLoadingAnyMetrics ? (
              <>
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-24 w-full" />
              </>
            ) : (
              <>
                <div>
                  <h4 className="mb-2 text-sm font-medium">Последнее обновление метрик</h4>
                  <p className="break-words text-sm text-neutral-600 dark:text-neutral-400">
                    {periodMetrics && periodMetrics.date
                      ? new Date(periodMetrics.date).toLocaleString("ru-RU", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Метрики еще не собраны"}
                  </p>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-medium">Статистика {periodLabel}</h4>
                  <div className="grid grid-cols-1 gap-4 xs:grid-cols-2">
                    <div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Активных диалогов</p>
                      <div className="text-2xl font-bold">{periodMetrics?.totalConversations ?? 0}</div>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Ответов ассистентов</p>
                      <div className="text-2xl font-bold">{periodMetrics?.totalMessages ?? 0}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-medium">Производительность {periodLabel}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600 dark:text-neutral-400">Успешность ответов</span>
                      <span className="font-medium"><div className="text-2xl font-bold">{periodMetrics?.successRate ?? 0}%</div></span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700">
                      <div className="h-2 rounded-full bg-green-500" style={{ width: `${periodMetrics?.successRate ?? 0}%` }} />
                    </div>
                  </div>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600 dark:text-neutral-400">Среднее время ответа</span>
                      <span className="font-medium"><div className="text-2xl font-bold">{periodMetrics?.avgResponseTime ? (periodMetrics.avgResponseTime / 1000).toFixed(1) : "0.0"} сек</div></span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.min(((periodMetrics?.avgResponseTime || 0) / 5000) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="mb-6 mt-6">
        <CardContent className="pt-4 sm:pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium text-neutral-900 dark:text-white">Недавняя активность</h3>
          </div>
          <div className="space-y-4">
            {isLoadingActivity ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : !activityData || activityData.length === 0 ? (
              <p className="py-4 text-center text-neutral-500 dark:text-neutral-400">История появится по мере использования</p>
            ) : (
              activityData?.slice(0, 4).map((activity) => {
                let iconInfo = { icon: "info", bg: "bg-blue-100 dark:bg-blue-900", color: "text-blue-600 dark:text-blue-300" };
                switch (activity.action) {
                  case "processed_requests":
                    iconInfo = { icon: "chat", bg: "bg-primary-100 dark:bg-primary-900", color: "text-primary-600 dark:text-primary-300" };
                    break;
                  case "added_team_member":
                    iconInfo = { icon: "person_add", bg: "bg-green-100 dark:bg-green-900", color: "text-green-600 dark:text-green-300" };
                    break;
                  case "sent_newsletter":
                    iconInfo = { icon: "notifications", bg: "bg-amber-100 dark:bg-amber-900", color: "text-amber-600 dark:text-amber-300" };
                    break;
                  case "connected_channel":
                    iconInfo = { icon: "link", bg: "bg-blue-100 dark:bg-blue-900", color: "text-blue-600 dark:text-blue-300" };
                    break;
                  case "payment_received":
                    iconInfo = { icon: "payments", bg: "bg-green-100 dark:bg-green-900", color: "text-green-600 dark:text-green-300" };
                    break;
                  case "assistant_created":
                    iconInfo = { icon: "smart_toy", bg: "bg-purple-100 dark:bg-purple-900", color: "text-purple-600 dark:text-purple-300" };
                    break;
                  case "knowledge_base_updated":
                    iconInfo = { icon: "auto_stories", bg: "bg-teal-100 dark:bg-teal-900", color: "text-teal-600 dark:text-teal-300" };
                    break;
                }
                const timeAgo = new Date(activity.timestamp).toLocaleDateString("ru-RU", { weekday: "long", hour: "2-digit", minute: "2-digit" });
                return (
                  <ActivityItem
                    key={activity.id}
                    icon={iconInfo.icon}
                    iconBg={iconInfo.bg}
                    iconColor={iconInfo.color}
                    content={<ActivityContent action={activity.action} details={activity.details} />}
                    timestamp={timeAgo}
                  />
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <DashboardInstructionsDialog open={instructionsDialogOpen} onOpenChange={setInstructionsDialogOpen} />
    </div>
  );
}
