import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CHANNEL_TYPES } from "@/lib/constants";
import { VkChannelDialog } from "@/components/channels/vk-channel-dialog";
import { AvitoChannelDialog } from "@/components/channels/avito-channel-dialog";
import { WebChannelDialog } from "@/components/channels/web-channel-dialog";
import { EmailChannelDialog } from "@/components/channels/email-channel-dialog";
import { TelegramChannelDialog } from "@/components/channels/telegram-channel-dialog";
import { SmsChannelDialog } from "@/components/channels/sms-channel-dialog";
import ChannelsInstructionsDialog from "@/components/channels/channels-instructions-dialog";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { LoaderCircle, Settings, MessageSquare, AlertTriangle, Book, Sparkles, Filter, Search } from "lucide-react";
import { useTariffLimits } from "@/hooks/use-tariff-limits";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Тип для канала
interface Channel {
  id: number;
  name: string;
  type: string;
  status: string;
  settings?: Record<string, string>;
  createdAt?: string;
}

export default function Channels() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [vkDialogOpen, setVkDialogOpen] = useState(false);
  const [avitoDialogOpen, setAvitoDialogOpen] = useState(false);
  const [webDialogOpen, setWebDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [instructionsDialogOpen, setInstructionsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Получаем лимиты тарифного плана
  const {
    canCreateChannel,
    channelsLimit,
    channelsUsed,
    isBasicPlan,
    allowedChannelTypes,
  } = useTariffLimits();

  // Получаем данные о каналах
  const { data, isLoading } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
  });

  // Используем данные с проверкой типов
  const channels = data || [];

  // Derived
  const filteredConnected = useMemo(() => {
    return channels.filter((c) => {
      const bySearch = searchQuery.trim() ? (c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.type.toLowerCase().includes(searchQuery.toLowerCase())) : true;
      const byType = typeFilter === "all" ? true : c.type === typeFilter;
      const byStatus = statusFilter === "all" ? true : c.status === statusFilter;
      return bySearch && byType && byStatus;
    });
  }, [channels, searchQuery, typeFilter, statusFilter]);

  const filtersActive = searchQuery || typeFilter !== "all" || statusFilter !== "all";

  const handleConnect = (channel: { id: string; name: string }) => {
    // Проверяем, можем ли создать ещё один канал
    if (!canCreateChannel) {
      toast({
        title: "Ограничение тарифа",
        description: `Достигнут лимит каналов (${channelsUsed}/${channelsLimit}). Для добавления новых каналов необходимо перейти на тариф выше.`,
        variant: "destructive",
      });
      return;
    }

    // Проверяем, доступен ли этот тип канала для текущего тарифа
    if (isBasicPlan && !allowedChannelTypes.includes(channel.id)) {
      toast({
        title: "Ограничение тарифа",
        description: `Каналы типа ${channel.name} недоступны на тарифе Базовый. Для использования этого типа канала необходимо перейти на тариф выше.`,
        variant: "destructive",
      });
      return;
    }

    if (channel.id === "vk") {
      setVkDialogOpen(true);
    } else if (channel.id === "avito") {
      setAvitoDialogOpen(true);
    } else if (channel.id === "web") {
      setWebDialogOpen(true);
    } else if (channel.id === "email") {
      setEmailDialogOpen(true);
    } else if (channel.id === "telegram") {
      setTelegramDialogOpen(true);
    } else if (channel.id === "sms") {
      setSmsDialogOpen(true);
    } else {
      toast({
        title: `Подключение ${channel.name}`,
        description: `Подключение канала ${channel.name} будет доступно в следующем обновлении`,
      });
    }
  };

  // Переход на страницу детализации канала
  const handleChannelDetails = (channelId: number) => {
    setLocation(`/channels/${channelId}`);
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
            <h1 className="text-2xl font-bold">Каналы связи</h1>
            <Button variant="secondary" size="icon" onClick={() => setInstructionsDialogOpen(true)} title="Инструкция по работе с каналами связи">
              <Book className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Подключение и настройка каналов коммуникации</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Поиск по названию или типу..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Тип канала" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  {CHANNEL_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Статус" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Любой</SelectItem>
                  <SelectItem value="active">Активен</SelectItem>
                  <SelectItem value="inactive">Неактивен</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mini stats */}
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg border p-3 text-sm">
              Всего подключено: <span className="font-semibold">{channels.length}</span>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              Отфильтровано: <span className="font-semibold">{filteredConnected.length}</span>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              Лимит тарифа: <span className="font-semibold">{channelsLimit}</span>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              Занято мест: <span className="font-semibold">{channelsUsed}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading and content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="flex flex-col items-center gap-2">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Загрузка данных о каналах...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Connected channels (filtered) */}
          {filteredConnected.length > 0 && (
            <div>
              <h2 className="mb-4 text-xl font-semibold">Подключенные каналы</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredConnected.map((channel) => (
                  <Card key={channel.id}>
                    <CardContent className="flex flex-col items-center p-6 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <span className="material-icons text-3xl">
                          {channel.type === "telegram" ? "telegram" : channel.type === "whatsapp" ? "whatsapp" : channel.type === "vk" ? "public" : channel.type === "avito" ? "shopping_cart" : channel.type === "facebook" ? "facebook" : channel.type === "email" ? "email" : channel.type === "web" ? "language" : channel.type === "voice" ? "phone" : channel.type === "sms" ? "sms" : "chat"}
                        </span>
                      </div>
                      <h3 className="mb-3 text-lg font-medium text-foreground">{channel.name}</h3>
                      <div className="mb-2 flex items-center justify-center gap-2">
                        <Badge variant="outline" className={channel.status === "active" ? "border-green-200 bg-green-50 text-green-700" : "border-neutral-200 bg-neutral-50 text-neutral-700"}>{channel.status === "active" ? "Активен" : "Неактивен"}</Badge>
                        <Badge variant="secondary" className="border-blue-200 bg-blue-50 text-blue-700">{channel.type === "vk" ? "ВКонтакте" : channel.type === "telegram" ? "Telegram" : channel.type === "whatsapp" ? "WhatsApp" : channel.type === "avito" ? "Авито" : channel.type}</Badge>
                      </div>
                      <p className="mb-4 text-muted-foreground">Канал настроен и готов к работе</p>
                      <div className="mt-auto flex w-full gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => handleChannelDetails(channel.id)}><Settings className="mr-2 h-4 w-4" /> Настройки</Button>
                        {(channel.type === "vk" || channel.type === "avito") && (
                          <Button variant="default" className="flex-1" onClick={() => setLocation(`/channels/${channel.id}/${channel.type === "vk" ? "vk" : "avito"}-dialogs`)}><MessageSquare className="mr-2 h-4 w-4" /> Диалоги</Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Limits info */}
          {!canCreateChannel && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/30">
              <div className="flex items-start">
                <AlertTriangle className="mr-3 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <h4 className="font-medium text-amber-800 dark:text-amber-300">Достигнут лимит каналов</h4>
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">Вы используете {channelsUsed} из {channelsLimit}. Для создания дополнительных каналов перейдите на тариф выше.</p>
                  <Button asChild className="mt-3" variant="outline" size="sm"><Link href="/billing">Изменить тариф</Link></Button>
                </div>
              </div>
            </div>
          )}

          {/* Available channels */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">Доступные каналы</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {CHANNEL_TYPES.filter((channel) => channel.allowMultiple || !channels.some((c) => c.type === channel.id)).map((channel) => {
                const isChannelAvailable = !isBasicPlan || allowedChannelTypes.includes(channel.id);
                return (
                  <Card key={channel.id} className={!isChannelAvailable ? "opacity-60" : ""}>
                    <CardContent className="flex flex-col items-center p-6 text-center">
                      <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${!isChannelAvailable ? "bg-gray-200 text-gray-500" : "bg-primary/10 text-primary"}`}>
                        <span className="material-icons text-3xl">{channel.id === "telegram" ? "telegram" : channel.id === "whatsapp" ? "phone" : channel.id === "vk" ? "public" : channel.id === "avito" ? "shopping_cart" : channel.id === "facebook" ? "facebook" : channel.id === "email" ? "email" : channel.id === "web" ? "language" : channel.id === "voice" ? "phone" : channel.id === "sms" ? "sms" : "chat"}</span>
                      </div>
                      <h3 className={`mb-2 text-lg font-medium ${!isChannelAvailable ? "text-gray-500 dark:text-gray-400" : "text-foreground"}`}>{channel.name}</h3>
                      <p className={`${!isChannelAvailable ? "text-gray-400 dark:text-gray-500" : "text-muted-foreground"} mb-4`}>{!isChannelAvailable ? `Доступно на тарифе Стандарт и выше` : `Подключите ${channel.name} и начните общаться через этот канал.`}</p>
                      <Button variant={!isChannelAvailable ? "secondary" : "outline"} className="mt-auto w-full" onClick={() => handleConnect(channel)} disabled={!canCreateChannel || !isChannelAvailable}>
                        <span className="material-icons mr-1 text-[18px]">{!isChannelAvailable ? "lock" : "add_link"}</span>
                        <span>{!isChannelAvailable ? "Недоступно" : "Подключить"}</span>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <VkChannelDialog open={vkDialogOpen} onOpenChange={setVkDialogOpen} />
      <AvitoChannelDialog open={avitoDialogOpen} onOpenChange={setAvitoDialogOpen} />
      <WebChannelDialog open={webDialogOpen} onOpenChange={setWebDialogOpen} />
      <EmailChannelDialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen} />
      <TelegramChannelDialog open={telegramDialogOpen} onOpenChange={setTelegramDialogOpen} />
      <SmsChannelDialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen} />
      <ChannelsInstructionsDialog open={instructionsDialogOpen} onOpenChange={setInstructionsDialogOpen} />
    </div>
  );
}
