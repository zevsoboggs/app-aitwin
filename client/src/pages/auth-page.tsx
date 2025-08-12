import { useState, useEffect, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  Bot,
  MessageSquare,
  BookOpen,
  Link as LinkIcon,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function AuthPage() {
  const {
    user,
    isLoading,
    sendVerificationCode,
    sendSmsVerificationCode,
    verifyCode,
  } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const searchParams = useSearch();
  const query = new URLSearchParams(searchParams);
  const refCode = query.get("ref");

  const [step, setStep] = useState<"request" | "verify">("request");
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [referralCode, setReferralCode] = useState(refCode || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [referralInfo, setReferralInfo] = useState<{
    valid: boolean;
    referrer?: { id: number; name: string };
  } | null>(null);

  // Автопереход после успешной верификации
  useEffect(() => {
    if (user && step === "verify") {
      toast({
        title: "Добро пожаловать!",
        description: "Вход выполнен успешно",
      });
      navigate("/dashboard");
    }
  }, [user, navigate, step, toast]);

  // Проверяем реферальный код
  useEffect(() => {
    const checkReferralCode = async () => {
      if (!referralCode) {
        setReferralInfo(null);
        return;
      }
      try {
        const result = await apiRequest({ url: `/api/referral-code/${referralCode}`, method: "GET" });
        setReferralInfo(result);
      } catch (error) {
        setReferralInfo({ valid: false });
      }
    };
    if (referralCode) checkReferralCode();
  }, [referralCode]);

  // Таймер повторной отправки кода
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const canResend = resendIn <= 0;

  const isEmailValid = useMemo(() => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, [email]);

  const isPhoneValid = useMemo(() => /^\+7\d{10}$/.test(phone), [phone]);

  // Запрос кода
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      if (authMethod === "email") {
        if (!isEmailValid) {
          toast({ title: "Ошибочный email", description: "Проверьте формат email", variant: "destructive" });
          return;
        }
        await sendVerificationCode(email);
        toast({ title: "Код отправлен", description: `Мы отправили код на ${email}` });
      } else {
        if (!isPhoneValid) {
          toast({ title: "Ошибочный номер", description: "Формат: +7XXXXXXXXXX", variant: "destructive" });
          return;
        }
        await sendSmsVerificationCode(phone);
        toast({ title: "Код отправлен", description: `Мы отправили SMS-код на ${phone}` });
      }
      setResendIn(30);
      setStep("verify");
    } catch (error) {
      toast({
        title: "Не удалось отправить код",
        description: error instanceof Error ? error.message : "Попробуйте позже",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Подтверждение кода
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 4) {
      toast({ title: "Введите код", description: "Минимум 4 символа", variant: "destructive" });
      return;
    }
    try {
      setIsSubmitting(true);
      const validReferralCode = referralInfo?.valid ? referralCode : undefined;
      const identifier = authMethod === "email" ? email : phone;
      const isPhone = authMethod === "phone";
      await verifyCode(identifier, code, validReferralCode, isPhone);
      // успех обработается в useEffect выше
    } catch (error) {
      toast({
        title: "Неверный код",
        description: error instanceof Error ? error.message : "Проверьте код и попробуйте снова",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Скелет загрузки
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-50 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      {/* Декоративные градиенты */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-400/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-purple-400/30 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
        {/* Левая колонка: бренд/преимущества */}
        <div className="hidden flex-1 items-center justify-center p-8 md:flex">
          <div className="max-w-xl space-y-8">
            <Badge className="gap-1 text-sm"><Sparkles className="h-4 w-4" /> Новая версия платформы</Badge>
            <h1 className="text-4xl font-bold tracking-tight">AiTwin — быстрый вход по коду</h1>
            <p className="text-lg text-muted-foreground">
              Один код — и вы внутри. Аккаунт создаётся автоматически при первом входе по email или телефону.
            </p>

            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="mb-2 text-primary"><Bot className="h-6 w-6" /></div>
                <div className="font-semibold">AI-ассистенты</div>
                <div className="text-sm text-muted-foreground">Обучение на ваших данных и интеграции под задачи</div>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="mb-2 text-primary"><MessageSquare className="h-6 w-6" /></div>
                <div className="font-semibold">Каналы коммуникаций</div>
                <div className="text-sm text-muted-foreground">Веб-чат, телефония, email и многое другое</div>
              </div>
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="mb-2 text-primary"><BookOpen className="h-6 w-6" /></div>
                <div className="font-semibold">База знаний</div>
                <div className="text-sm text-muted-foreground">Управляйте информацией и метриками эффективности</div>
              </div>
            </div>
          </div>
        </div>

        {/* Правая колонка: форма */}
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md">
            <Card className="border backdrop-blur supports-[backdrop-filter]:bg-background/70">
              <CardHeader className="space-y-2 text-center">
                <CardTitle className="text-2xl">Вход или регистрация</CardTitle>
                <CardDescription>Получите код и подтвердите — это займёт меньше минуты</CardDescription>
              </CardHeader>

              <CardContent>
                {step === "request" ? (
                  <div className="space-y-4">
                    <Tabs
                      defaultValue="email"
                      value={authMethod}
                      onValueChange={(value) => setAuthMethod(value as "email" | "phone")}
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="email" className="flex items-center justify-center">
                          <Mail className="mr-2 h-4 w-4" /> Email
                        </TabsTrigger>
                        <TabsTrigger value="phone" className="flex items-center justify-center">
                          <Phone className="mr-2 h-4 w-4" /> Телефон
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="email" className="space-y-4 pt-4">
                        <form onSubmit={handleRequestSubmit} className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">Email</div>
                              <Badge variant={isEmailValid ? "default" : "secondary"}>{isEmailValid ? "Ок" : "Проверка"}</Badge>
                            </div>
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                            />
                          </div>

                          {referralCode && referralInfo?.valid && (
                            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                              <div className="flex items-center">
                                <LinkIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                По приглашению от <strong className="ml-1">{referralInfo.referrer?.name || "партнёра"}</strong>
                              </div>
                            </div>
                          )}

                          <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Отправка…</>) : ("Получить код на email")}
                          </Button>
                        </form>
                      </TabsContent>

                      <TabsContent value="phone" className="space-y-4 pt-4">
                        <form onSubmit={handleRequestSubmit} className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">Телефон</div>
                              <Badge variant={isPhoneValid ? "default" : "secondary"}>{isPhoneValid ? "Ок" : "+7XXXXXXXXXX"}</Badge>
                            </div>
                            <Input
                              type="tel"
                              placeholder="+7XXXXXXXXXX"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                            />
                          </div>

                          {referralCode && referralInfo?.valid && (
                            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                              <div className="flex items-center">
                                <LinkIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                По приглашению от <strong className="ml-1">{referralInfo.referrer?.name || "партнёра"}</strong>
                              </div>
                            </div>
                          )}

                          <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Отправка…</>) : ("Получить код по SMS")}
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>

                    <Separator />
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Вход защищён. Мы не передаём ваши данные третьим лицам.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">
                        {authMethod === "email" ? (
                          <>Мы отправили код на <strong>{email}</strong></>
                        ) : (
                          <>Мы отправили SMS-код на <strong>{phone}</strong></>
                        )}
                      </div>
                    </div>

                    <form onSubmit={handleVerifySubmit} className="space-y-6">
                      <div className="space-y-2">
                        <div className="font-medium text-center">Код подтверждения</div>
                        <div className="flex justify-center">
                          <InputOTP maxLength={6} value={code} onChange={setCode}>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="text-muted-foreground">
                          {canResend ? "Можно отправить код снова" : `Повторная отправка через ${resendIn} сек`}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={!canResend || isSubmitting}
                          onClick={handleRequestSubmit}
                        >
                          Отправить снова
                        </Button>
                      </div>

                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Проверяем…</>) : ("Подтвердить")}
                      </Button>
                    </form>

                    <div className="text-center text-xs text-muted-foreground">
                      Вводя код, вы соглашаетесь с политикой конфиденциальности
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                <div className="text-center text-sm text-muted-foreground">
                  Нет аккаунта? Он будет создан автоматически при первом входе
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
