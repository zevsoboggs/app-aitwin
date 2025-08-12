import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface PlanProps {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  isPopular: boolean;
  color: string;
}

interface PlanCardProps {
  plan: PlanProps;
  isCurrentPlan: boolean;
  onSelect: () => void;
  isTrialAvailable?: boolean;
  onTrialActivate?: () => void;
}

const extractPriceValue = (priceString: string): number => {
  const match = priceString.match(/\d+/g);
  if (match && match.length > 0) return parseInt(match.join(""), 10);
  return 0;
};

export default function PlanCard({
  plan,
  isCurrentPlan,
  onSelect,
  isTrialAvailable = false,
  onTrialActivate,
}: PlanCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useAuth();
  const userId = user?.id;

  const { data: balanceData, isLoading: isBalanceLoading } = useQuery({
    queryKey: ["/api/balance", userId],
    queryFn: async () => {
      if (!userId) return { balance: 0 } as any;
      const response = await fetch(`/api/balance/${userId}`);
      if (!response.ok) throw new Error("Ошибка получения баланса");
      return response.json();
    },
    enabled: !!userId,
  });

  const planPrice = extractPriceValue(plan.price);
  const currentBalanceInKopecks = balanceData?.balance || 0;
  const currentBalanceInRubles = Math.floor(currentBalanceInKopecks / 100);
  const hasEnoughFunds = currentBalanceInRubles >= planPrice;

  const calculateDailyPrice = (priceString: string): number => {
    const planPriceValue = extractPriceValue(priceString);
    return Math.round((planPriceValue * 100) / 30);
  };

  const handleOpenDialog = async () => {
    const newTariffDailyPrice = calculateDailyPrice(plan.price);
    let oldTariffDailyPrice = 0;

    if (user?.plan && user.plan !== "free" && user.plan !== plan.id) {
      try {
        const response = await fetch(`/api/tariff-plans/${user.plan}`);
        if (response.ok) {
          const currentPlanData = await response.json();
          if (currentPlanData.plan && currentPlanData.plan.price) {
            oldTariffDailyPrice = Math.floor(currentPlanData.plan.price / 30);
          }
        }
      } catch (error) {
        console.error("Ошибка при получении информации о текущем тарифе:", error);
      }
    }

    setDailyPriceInfo({ oldTariffDailyPrice, newTariffDailyPrice });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => setIsDialogOpen(false);

  const queryClient = useQueryClient();
  const [isSubscribing, setIsSubscribing] = useState(false);

  const [dailyPriceInfo, setDailyPriceInfo] = useState({
    oldTariffDailyPrice: 0,
    newTariffDailyPrice: 0,
  });

  const handleSubscribe = async () => {
    if (!userId || !hasEnoughFunds) return;
    try {
      setIsSubscribing(true);
      onSelect();
      await new Promise((resolve) => setTimeout(resolve, 500));
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
      toast({ title: `Тариф "${plan.name}" подключается...`, description: "Обновление информации..." });
      handleCloseDialog();
    } catch (error) {
      console.error("Ошибка при подключении тарифа:", error);
      toast({ title: "Ошибка при подключении тарифа", description: error instanceof Error ? error.message : "Произошла неизвестная ошибка", variant: "destructive" });
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleTopUpBalance = () => {
    window.location.href = "/billing?tab=payment";
    handleCloseDialog();
  };

  const formatNumber = (number: number): string => number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  return (
    <>
      <Card
        className={cn(
          "flex h-full flex-col rounded-lg border bg-card text-card-foreground shadow-sm",
          isCurrentPlan && "ring-1 ring-primary"
        )}
      >
        {/* Top row with badges */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-2">
            {plan.isPopular && (
              <Badge className="bg-primary text-primary-foreground">Популярный</Badge>
            )}
            {isCurrentPlan && (
              <Badge className="bg-green-600 text-white">Текущий</Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className={cn("px-6 pt-3", isCurrentPlan ? "bg-neutral-50 dark:bg-neutral-900/30" : "")}> 
          <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
          <div className="mt-1 mb-4 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-foreground">{plan.price}</span>
            <span className="text-sm text-muted-foreground">/ {plan.period}</span>
          </div>

          {/* Equalized features block height for straight bottoms */}
          <ul className="min-h-[140px] space-y-2.5">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-500/15 text-green-600 dark:text-green-400">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm text-foreground/90">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <CardContent className="mt-auto border-t p-6 pt-4">
          {plan.id === "basic" && isTrialAvailable && onTrialActivate && !isCurrentPlan ? (
            <div className="space-y-3">
              <Button onClick={onTrialActivate} className="w-full">Попробовать бесплатно</Button>
              <p className="text-center text-xs text-muted-foreground">14 дней бесплатно, затем {plan.price}/{plan.period}</p>
              <Button onClick={handleOpenDialog} className="w-full" variant="outline">Подключить сразу</Button>
            </div>
          ) : (
            <Button onClick={isCurrentPlan ? undefined : handleOpenDialog} className={cn("w-full", isCurrentPlan && "cursor-not-allowed bg-green-600 hover:bg-green-600 text-white")} variant={isCurrentPlan ? "default" : "outline"} disabled={isCurrentPlan}>
              {isCurrentPlan ? "Подключено" : "Подключить"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Subscribe dialog (clean, straight) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Подключение тарифа</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Тариф</span>
              <span className="font-semibold">{plan.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Стоимость</span>
              <span className="font-semibold text-primary">{plan.price} / {plan.period}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Текущий баланс</span>
              <span className="font-semibold">{isBalanceLoading ? "Загрузка..." : `${formatNumber(currentBalanceInRubles)} ₽`}</span>
            </div>

            {!isCurrentPlan && user?.plan && user.plan !== "free" && user.plan !== plan.id && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                <p className="font-semibold">Внимание! Смена тарифного плана</p>
                <p className="mt-1">При переходе на новый тариф метрики начнутся с нуля.</p>
                <p className="mt-1">День текущего тарифа: {(dailyPriceInfo.oldTariffDailyPrice / 100).toLocaleString("ru-RU")} ₽</p>
                <p className="mt-1">За неиспользованный период будет произведен возврат на баланс.</p>
              </div>
            )}

            {!(hasEnoughFunds) && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                Недостаточно средств для подключения тарифа. Пополните баланс.
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full" onClick={handleTopUpBalance}>Пополнить баланс</Button>
            <div className="flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCloseDialog}>Отмена</Button>
              <Button className="flex-1" disabled={!hasEnoughFunds || isBalanceLoading || isSubscribing} onClick={handleSubscribe}>{isSubscribing ? "Обработка..." : "Подключить"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
