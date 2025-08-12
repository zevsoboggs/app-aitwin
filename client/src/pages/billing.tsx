import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import PlanCard from "@/components/billing/plan-card";
import PaymentCard from "@/components/billing/payment-card";
import PaymentHistoryInfinite from "@/components/payment-history-infinite";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useMediaQuery } from "@/hooks/use-media-query";
import MobileBillingPage from "@/components/billing/mobile-billing-page";
import { Book, Sparkles, Check, Minus, Gift, Package, Phone, MessageSquare } from "lucide-react";
import BillingInstructionsDialog from "@/components/billing/billing-instructions-dialog";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Определение типов для платежа
interface Payment {
  id: number;
  userId: number;
  amount: number;
  status: string;
  description: string;
  completedAt?: string;
  createdAt: string;
  type: string;
  externalId?: string;
}

// Интерфейс для данных использования ресурсов
interface UsageData {
  noPlan?: boolean;
  messages: {
    used: number;
    limit: number;
    percentage: number;
  };
  knowledge: {
    used: number;
    limit: number;
    percentage: number;
  };
  callMinutes: {
    used: number;
    limit: number;
    percentage: number;
  };
  smsMessages: {
    used: number;
    limit: number;
    percentage: number;
  };
  users: {
    used: number;
    limit: number;
    percentage: number;
  };
  assistants: {
    used: number;
    limit: number;
    percentage: number;
  };
  channels: {
    used: number;
    limit: number;
    percentage: number;
  };
  apiCalls: {
    used: number;
    limit: number;
    percentage: number;
  };
  nextReset: string;
}

// Интерфейс для данных пользователя
interface UserData {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  plan?: string | null;
  balance?: number | null;
  referrerId?: number | null;
  managerId?: number | null;
  referralCode?: string | null;
  totalSpent?: number;
}

// Функция для правильного склонения слов в зависимости от числа
const getWordForm = (
  number: number,
  words: [string, string, string]
): string => {
  const cases = [2, 0, 1, 1, 1, 2];
  return words[
    number % 100 > 4 && number % 100 < 20 ? 2 : cases[Math.min(number % 10, 5)]
  ];
};

export default function Billing() {
  const [tabValue, setTabValue] = useState("plans");
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [instructionsDialogOpen, setInstructionsDialogOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"month" | "year">("month");
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Определяем, является ли устройство десктопным
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Проверяем мобильную версию и устанавливаем начальное значение для мобильных вкладок
  const [mobileActiveTab, setMobileActiveTab] = useState<string>("plans");

  // Получаем текущий тариф пользователя из объекта пользователя
  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: !!user?.id,
  });

  // Проверяем доступность пробного периода для пользователя
  const { data: trialAvailability, isLoading: isTrialCheckLoading } = useQuery({
    queryKey: ["/api/trial/available", user?.id],
    queryFn: async () => {
      if (!user?.id) return { available: false } as any;
      const response = await fetch(`/api/trial/available/${user.id}`);
      if (!response.ok) {
        throw new Error("Ошибка при проверке доступности пробного периода");
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Определяем текущий тариф из данных пользователя
  const isPlanLoading = isUserLoading || isTrialCheckLoading;

  // Устанавливаем текущий тариф при получении данных пользователя
  useEffect(() => {
    if (userData && typeof userData === "object" && "plan" in userData) {
      setCurrentPlan(userData.plan as string | null);
    }
  }, [userData]);

  // Синхронизируем мобильные и десктопные вкладки
  useEffect(() => {
    setMobileActiveTab(tabValue);
  }, [tabValue]);

  const handleMobileTabChange = (tab: string) => {
    setMobileActiveTab(tab);
    setTabValue(tab);
  };

  // При загрузке страницы и изменении URL проверяем параметры для выбора нужной вкладки
  useEffect(() => {
    // Функция для чтения параметров из URL
    const checkUrlParams = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get("tab");

      if (tab && ["plans", "usage", "payment"].includes(tab)) {
        setTabValue(tab);

        // Принудительно обновляем баланс при переходе на вкладку платежей
        if (tab === "payment" && user?.id) {
          queryClient.invalidateQueries({
            queryKey: ["/api/balance", user.id],
          });
        }
      }
    };

    // Проверяем при первой загрузке
    checkUrlParams();

    // Слушаем изменения в URL
    const handleUrlChange = () => {
      checkUrlParams();
    };

    window.addEventListener("popstate", handleUrlChange);

    // Очистка слушателя
    return () => {
      window.removeEventListener("popstate", handleUrlChange);
    };
  }, [user?.id, queryClient]); // Добавляем зависимости

  // Дополнительное обновление баланса при переключении на вкладку payment
  useEffect(() => {
    if (tabValue === "payment" && user?.id) {
      queryClient.invalidateQueries({ queryKey: ["/api/balance", user.id] });
    }
  }, [tabValue, user?.id, queryClient]);

  // Обработчик действий с тарифным планом
  const handlePlanAction = async (
    action: string,
    planName: string,
    planId: string
  ) => {
    try {
      // Этот обработчик вызывается из компонента PlanCard
      // когда пользователь нажимает кнопку "Подключить" в диалоговом окне
      // или кнопку "Текущий тариф"
      if (!user?.id) {
        toast({
          title: "Ошибка",
          description: "Необходимо авторизоваться для изменения тарифа",
          variant: "destructive",
        });
        return;
      }

      // Получаем цену тарифа из данных тарифов
      const selectedPlan = tariffData?.plans?.find(
        (plan) => plan.id === planId
      );
      if (!selectedPlan) {
        toast({
          title: "Ошибка",
          description: "Не удалось найти информацию о выбранном тарифе",
          variant: "destructive",
        });
        return;
      }

      // Отправляем запрос на сервер для изменения тарифа
      const response = await fetch("/api/user/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          planId: planId,
          amount: selectedPlan.price,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Ошибка при изменении тарифа");
      }

      // Устанавливаем тариф как текущий
      setCurrentPlan(planId);

      // Обновляем данные о пользователе, чтобы отразить изменение тарифа
      // (используем useQueryClient для инвалидации запроса к /api/auth/me)
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      // Обновляем данные об использовании
      queryClient.invalidateQueries({ queryKey: ["/api/usage", user.id] });

      // Обновляем историю платежей для обновления как на странице billing, так и на dashboard
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });

      // Сообщаем пользователю о результате действия
      toast({
        title: `${action} тарифа`,
        description: `Тариф "${planName}" ${
          action === "Продление" ? "продлен" : "выбран"
        } успешно`,
      });
    } catch (error) {
      console.error("Ошибка при изменении тарифа:", error);
      toast({
        title: "Ошибка",
        description:
          error instanceof Error ? error.message : "Не удалось изменить тариф",
        variant: "destructive",
      });
    }
  };

  const handlePaymentAction = () => {
    toast({
      title: "Оплата",
      description: "Функция оплаты будет доступна в следующем обновлении",
    });
  };

  // Обработчик активации пробного периода
  const handleTrialActivation = async (planId: string, planName: string) => {
    try {
      if (!user?.id) {
        toast({
          title: "Ошибка",
          description:
            "Необходимо авторизоваться для активации пробного периода",
          variant: "destructive",
        });
        return;
      }

      // Отправляем запрос на активацию пробного периода
      const response = await fetch("/api/trial/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Не удалось активировать пробный период"
        );
      }

      // Устанавливаем тариф как текущий
      setCurrentPlan(planId);

      // Обновляем данные пользователя и другие связанные запросы
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/usage", user.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/trial/available", user.id],
      });

      // Сообщаем пользователю об успешной активации
      toast({
        title: "Пробный период активирован",
        description: `Тариф "${planName}" активирован на 14 дней бесплатно`,
      });
    } catch (error) {
      console.error("Ошибка при активации пробного периода:", error);
      toast({
        title: "Ошибка",
        description:
          error instanceof Error
            ? error.message
            : "Не удалось активировать пробный период",
        variant: "destructive",
      });
    }
  };

  // Определим интерфейс для тарифных планов
  interface TariffPlan {
    id: string;
    name: string;
    price: number;
    period: string;
    messagesLimit: number;
    knowledgeLimit: number;
    callMinutesLimit: number;
    smsLimit: number;
    usersLimit: number;
    apiCallsLimit: number;
    assistantsLimit: number;
    channelsLimit: number;
    features: string[];
    isPopular: boolean;
    color: string;
    active: boolean;
  }

  // Функция для форматирования цены
  const formatPrice = (price: number): string => {
    return `${(price / 100).toLocaleString("ru-RU")} ₽`;
  };

  // Получаем список тарифных планов из API
  const { data: tariffData, isLoading: isTariffsLoading } = useQuery<{
    success: boolean;
    plans: TariffPlan[];
  }>({
    queryKey: ["/api/tariff-plans"],
    queryFn: async () => {
      const response = await fetch("/api/tariff-plans");
      if (!response.ok) {
        throw new Error("Не удалось получить список тарифных планов");
      }
      return response.json();
    },
  });

  // Преобразуем полученные данные в формат, подходящий для компонента PlanCard,
  // и сортируем их в нужном порядке: Базовый, Стандарт, Корпоративный
  const plans = tariffData?.plans
    ?.map((plan) => ({
      id: plan.id,
      name: plan.name,
      price: formatPrice(plan.price),
      period: plan.period,
      features: Array.isArray(plan.features) ? plan.features : [],
      isPopular: plan.isPopular,
      color:
        plan.color === "blue"
          ? "bg-white dark:bg-neutral-800"
          : plan.color === "indigo"
          ? "bg-primary-50 dark:bg-primary-900/20"
          : plan.color === "purple"
          ? "bg-purple-50 dark:bg-purple-900/20"
          : "bg-white dark:bg-neutral-800",
    }))
    .sort((a, b) => {
      // Определяем порядок тарифов: Базовый (1), Стандарт (2), Корпоративный (3)
      const order: { [key: string]: number } = {
        basic: 1,
        standart: 2,
        enterprise: 3,
      };
      return (order[a.id] || 99) - (order[b.id] || 99);
    }) || [];

  // Пересчет отображаемой цены для годовой оплаты (визуально -10%)
  const displayPlans = useMemo(() => {
    if (billingPeriod === "month") return plans;
    const priceById: Record<string, number> = {};
    (tariffData?.plans || []).forEach((p) => (priceById[p.id] = p.price));
    return plans.map((p) => {
      const basePrice = priceById[p.id];
      if (!basePrice) return p;
      const yearlyTotal = Math.round(basePrice * 12 * 0.9); // 10% скидка
      return { ...p, price: `${(yearlyTotal / 100).toLocaleString("ru-RU")} ₽` };
    });
  }, [plans, billingPeriod, tariffData?.plans]);

  // Получаем данные об использовании ресурсов
  const { data: usageData, isLoading: isUsageLoading } = useQuery<UsageData>({
    queryKey: ["/api/usage", user?.id],
    queryFn: async () => {
      if (!user?.id) return null as any;
      const response = await fetch(`/api/usage/${user.id}`);
      if (!response.ok) {
        throw new Error("Не удалось получить данные использования");
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 sm:items-center mb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="gap-1"><Sparkles className="h-4 w-4" /> Раздел обновлён</Badge>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Тарифы</h1>
            <Button variant="secondary" size="icon" onClick={() => setInstructionsDialogOpen(true)} title="Инструкция по тарифам и биллингу">
              <Book className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Управление подпиской, лимитами и платежами</p>
        </div>
      </div>

      {/* Billing period switch (desktop only) */}
      <div className="hidden md:flex items-center justify-between mt-4">
        <div className="flex items-center gap-3">
          <ToggleGroup type="single" value={billingPeriod} onValueChange={(v) => v && setBillingPeriod(v as any)}>
            <ToggleGroupItem value="month" aria-label="Месяц" className="px-4">Месяц</ToggleGroupItem>
            <ToggleGroupItem value="year" aria-label="Год" className="px-4">Год</ToggleGroupItem>
          </ToggleGroup>
          {billingPeriod === "year" && (
            <Badge variant="secondary">Экономия 10%</Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">Годовая оплата отображается для ознакомления</div>
      </div>

      {/* Mobile page retains existing layout */}
      <div className={isDesktop ? "hidden" : "block"}>
        <MobileBillingPage
          activeTab={tabValue}
          setParentActiveTab={setTabValue}
          plans={displayPlans}
          isTariffsLoading={isTariffsLoading}
          currentPlan={currentPlan}
          trialAvailability={trialAvailability}
          usageData={
            usageData || {
              noPlan: true,
              nextReset: "",
              messages: { used: 0, limit: 0, percentage: 0 },
              knowledge: { used: 0, limit: 0, percentage: 0 },
              callMinutes: { used: 0, limit: 0, percentage: 0 },
              smsMessages: { used: 0, limit: 0, percentage: 0 },
              users: { used: 0, limit: 0, percentage: 0 },
              assistants: { used: 0, limit: 0, percentage: 0 },
              channels: { used: 0, limit: 0, percentage: 0 },
            }
          }
          isUsageLoading={isUsageLoading}
          userId={user?.id}
          handlePlanAction={handlePlanAction}
          handleTrialActivation={handleTrialActivation}
          handlePaymentAction={handlePaymentAction}
          getWordForm={getWordForm}
        />
      </div>

      {/* Desktop tabs */}
      <div className={isDesktop ? "block" : "hidden"}>
        <Tabs value={tabValue} onValueChange={(value) => setTabValue(value)} className="mt-6">
          <TabsList className="mb-6">
            <TabsTrigger value="plans">Тарифные планы</TabsTrigger>
            <TabsTrigger value="usage">Использование</TabsTrigger>
            <TabsTrigger value="payment">История платежей</TabsTrigger>
          </TabsList>

          <TabsContent value="plans">
            {isPlanLoading || isTariffsLoading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
                <p className="mt-4 text-neutral-600 dark:text-neutral-400">Загрузка тарифных планов...</p>
              </div>
            ) : (
              <>
                {/* Pricing grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {displayPlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      isCurrentPlan={currentPlan === plan.id}
                      isTrialAvailable={trialAvailability?.available && plan.id === "basic"}
                      onSelect={() =>
                        handlePlanAction(
                          currentPlan === plan.id ? "Продление" : "Выбор",
                          plan.name,
                          plan.id
                        )
                      }
                      onTrialActivate={() => handleTrialActivation(plan.id, plan.name)}
                    />
                  ))}
                </div>

                {/* Feature comparison */}
                <Card className="mt-8">
                  <CardContent className="pt-6">
                    <h3 className="font-medium text-neutral-900 dark:text-white mb-4">Сравнение возможностей</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="py-2 pr-4">Функция</th>
                            {displayPlans.map((p) => (
                              <th key={p.id} className="py-2 pr-4">{p.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            "Ассистенты",
                            "Сообщения",
                            "Каналы",
                            "База знаний",
                            "Голосовые звонки",
                            "SMS",
                            "Поддержка",
                          ].map((featureName) => (
                            <tr key={featureName} className="border-t">
                              <td className="py-3 pr-4 font-medium">{featureName}</td>
                              {displayPlans.map((p) => (
                                <td key={`${p.id}-${featureName}`} className="py-3 pr-4">
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-500/15 text-green-600 dark:text-green-400">
                                    <Check className="h-3.5 w-3.5" />
                                  </span>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Add-ons */}
                <Card className="mt-6">
                  <CardContent className="pt-6">
                    <h3 className="font-medium text-neutral-900 dark:text-white mb-4">Дополнительные опции</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            <span className="font-medium">+1000 сообщений</span>
                          </div>
                          <span className="font-semibold">990 ₽</span>
                        </div>
                        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={handlePaymentAction}>Купить</Button>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            <span className="font-medium">+1 ГБ знаний</span>
                          </div>
                          <span className="font-semibold">490 ₽</span>
                        </div>
                        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={handlePaymentAction}>Купить</Button>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-primary" />
                            <span className="font-medium">+100 минут</span>
                          </div>
                          <span className="font-semibold">690 ₽</span>
                        </div>
                        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={handlePaymentAction}>Купить</Button>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Gift className="h-4 w-4 text-primary" />
                            <span className="font-medium">+1 пользователь</span>
                          </div>
                          <span className="font-semibold">590 ₽</span>
                        </div>
                        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={handlePaymentAction}>Купить</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* FAQ */}
                <Card className="mt-6">
                  <CardContent className="pt-6">
                    <h3 className="font-medium text-neutral-900 dark:text-white mb-4">Частые вопросы</h3>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="item-1">
                        <AccordionTrigger>Какой тариф выбрать?</AccordionTrigger>
                        <AccordionContent>Начните с Базового и масштабируйтесь по мере роста задач.</AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="item-2">
                        <AccordionTrigger>Можно ли оплатить за год?</AccordionTrigger>
                        <AccordionContent>Годовая оплата со скидкой скоро будет доступна. Сейчас доступна помесячная оплата.</AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="item-3">
                        <AccordionTrigger>Что входит в пробный период?</AccordionTrigger>
                        <AccordionContent>Доступ ко всем функциям Базового тарифа в течение 14 дней.</AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="usage">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium text-neutral-900 dark:text-white mb-4">Использование ресурсов</h3>
                {isUsageLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
                    <p className="mt-4 text-neutral-600 dark:text-neutral-400">Загрузка данных использования...</p>
                  </div>
                ) : !usageData ? (
                  <div className="text-center py-8">
                    <p className="text-neutral-600 dark:text-neutral-400">Не удалось получить данные использования</p>
                  </div>
                ) : usageData.noPlan ? (
                  <div className="text-center py-8">
                    <h4 className="text-lg font-medium text-neutral-700 dark:text-neutral-200 mb-2">Тариф не подключен</h4>
                    <p className="text-neutral-600 dark:text-neutral-400 mb-6">Для доступа к использованию ресурсов необходимо подключить тарифный план</p>
                    <Button onClick={() => setTabValue("plans")}>Выбрать тариф</Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          Сообщения
                        </h4>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          {usageData.messages.used.toLocaleString("ru-RU")} /{" "}
                          {usageData.messages.limit.toLocaleString("ru-RU")}
                        </p>
                      </div>
                      <div className="h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded-full">
                        <div
                          className="h-2.5 bg-red-500 rounded-full"
                          style={{ width: `${usageData.messages.percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Осталось{" "}
                        {(
                          usageData.messages.limit - usageData.messages.used
                        ).toLocaleString("ru-RU")}{" "}
                        сообщений до{" "}
                        {new Date(usageData.nextReset).toLocaleDateString(
                          "ru-RU"
                        )}
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          База знаний
                        </h4>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          {usageData.knowledge.used.toLocaleString("ru-RU")} ГБ
                          / {usageData.knowledge.limit.toLocaleString("ru-RU")}{" "}
                          ГБ
                        </p>
                      </div>
                      <div className="h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded-full">
                        <div
                          className="h-2.5 bg-green-500 rounded-full"
                          style={{
                            width: `${usageData.knowledge.percentage}%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Осталось{" "}
                        {(
                          usageData.knowledge.limit - usageData.knowledge.used
                        ).toLocaleString("ru-RU")}{" "}
                        ГБ свободного места
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          Виртуальные ассистенты
                        </h4>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          {usageData.assistants.used.toLocaleString("ru-RU")} /{" "}
                          {usageData.assistants.limit.toLocaleString("ru-RU")}
                        </p>
                      </div>
                      <div className="h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded-full">
                        <div
                          className="h-2.5 bg-blue-500 rounded-full"
                          style={{
                            width: `${usageData.assistants.percentage}%`,
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        {usageData.assistants.limit > usageData.assistants.used
                          ? `Осталось ${(
                              usageData.assistants.limit -
                              usageData.assistants.used
                            ).toLocaleString("ru-RU")} ${getWordForm(
                              usageData.assistants.limit -
                                usageData.assistants.used,
                              ["ассистент", "ассистента", "ассистентов"]
                            )}`
                          : "Достигнут лимит ассистентов"}
                      </p>
                    </div>

                    {/* Показываем голосовые звонки только если они доступны в тарифе или были использованы */}
                    {(usageData.callMinutes.limit > 0 ||
                      usageData.callMinutes.used > 0) && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            Голосовые звонки
                          </h4>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {usageData.callMinutes.used.toLocaleString("ru-RU")}{" "}
                            мин /{" "}
                            {usageData.callMinutes.limit.toLocaleString(
                              "ru-RU"
                            )}{" "}
                            мин
                          </p>
                        </div>
                        <div className="h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded-full">
                          <div
                            className="h-2.5 bg-amber-500 rounded-full"
                            style={{
                              width: `${usageData.callMinutes.percentage}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          {usageData.callMinutes.limit > 0
                            ? `Осталось ${(
                                usageData.callMinutes.limit -
                                usageData.callMinutes.used
                              ).toLocaleString("ru-RU")} минут до ${new Date(
                                usageData.nextReset
                              ).toLocaleDateString("ru-RU")}`
                            : "Голосовые звонки недоступны в вашем тарифе"}
                        </p>
                      </div>
                    )}

                    {/* Показываем SMS сообщения только если они доступны в тарифе или были использованы */}
                    {(usageData.smsMessages.limit > 0 ||
                      usageData.smsMessages.used > 0) && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            SMS сообщения
                          </h4>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {usageData.smsMessages.used.toLocaleString("ru-RU")}{" "}
                            /{" "}
                            {usageData.smsMessages.limit.toLocaleString(
                              "ru-RU"
                            )}{" "}
                            SMS
                          </p>
                        </div>
                        <div className="h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded-full">
                          <div
                            className="h-2.5 bg-cyan-500 rounded-full"
                            style={{
                              width: `${usageData.smsMessages.percentage}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          {usageData.smsMessages.limit > 0
                            ? `Осталось ${(
                                usageData.smsMessages.limit -
                                usageData.smsMessages.used
                              ).toLocaleString("ru-RU")} SMS до ${new Date(
                                usageData.nextReset
                              ).toLocaleDateString("ru-RU")}`
                            : "SMS сообщения недоступны в вашем тарифе"}
                        </p>
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          Каналы связи
                        </h4>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          {usageData.channels.used.toLocaleString("ru-RU")} /{" "}
                          {usageData.channels.limit.toLocaleString("ru-RU")}
                        </p>
                      </div>
                      <div className="h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded-full">
                        <div
                          className="h-2.5 bg-indigo-500 rounded-full"
                          style={{ width: `${usageData.channels.percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Осталось{" "}
                        {(
                          usageData.channels.limit - usageData.channels.used
                        ).toLocaleString("ru-RU")}{" "}
                        {getWordForm(
                          usageData.channels.limit - usageData.channels.used,
                          ["канал", "канала", "каналов"]
                        )}
                      </p>
                    </div>

                    {/* Показываем API-вызовы только если они доступны в тарифе или были использованы */}
                    {(usageData.apiCalls.limit > 0 ||
                      usageData.apiCalls.used > 0) && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            API-вызовы
                          </h4>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {usageData.apiCalls.used.toLocaleString("ru-RU")} /{" "}
                            {usageData.apiCalls.limit.toLocaleString("ru-RU")}
                          </p>
                        </div>
                        <div className="h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded-full">
                          <div
                            className="h-2.5 bg-pink-500 rounded-full"
                            style={{
                              width: `${usageData.apiCalls.percentage}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          {usageData.apiCalls.limit > 0
                            ? `Осталось ${(
                                usageData.apiCalls.limit -
                                usageData.apiCalls.used
                              ).toLocaleString("ru-RU")} вызовов до ${new Date(
                                usageData.nextReset
                              ).toLocaleDateString("ru-RU")}`
                            : "API-вызовы недоступны в вашем тарифе"}
                        </p>
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          Пользователи
                        </h4>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          {usageData.users.used.toLocaleString("ru-RU")} /{" "}
                          {usageData.users.limit.toLocaleString("ru-RU")}
                        </p>
                      </div>
                      <div className="h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded-full">
                        <div
                          className="h-2.5 bg-purple-500 rounded-full"
                          style={{ width: `${usageData.users.percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        {usageData.users.limit > usageData.users.used
                          ? `Осталось ${(
                              usageData.users.limit - usageData.users.used
                            ).toLocaleString("ru-RU")} ${getWordForm(
                              usageData.users.limit - usageData.users.used,
                              ["место", "места", "мест"]
                            )} для пользователей`
                          : "Достигнут лимит пользователей"}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="md:col-span-1"><PaymentCard /></div>
              <div className="md:col-span-2">
                {user?.id && (
                  <PaymentHistoryInfinite userId={user.id} variant="table" showExport={true} title="История платежей" />
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BillingInstructionsDialog open={instructionsDialogOpen} onOpenChange={setInstructionsDialogOpen} />
    </div>
  );
}
