import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Book, Sparkles, X } from "lucide-react";

interface InstructionsFeatureNotificationProps {
  onOpenInstructions?: () => void;
  pageName?: string;
  userId?: number;
}

export default function InstructionsFeatureNotification({
  onOpenInstructions,
  pageName = "этой страницы",
  userId,
}: InstructionsFeatureNotificationProps) {
  const [isOpen, setIsOpen] = useState(false);

  const storageKey = `instructionsNotificationShown_${userId || "guest"}`;

  useEffect(() => {
    const hasShown = localStorage.getItem(storageKey);
    if (!hasShown && userId) {
      const timer = setTimeout(() => setIsOpen(true), 700);
      return () => clearTimeout(timer);
    }
  }, [storageKey, userId]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem(storageKey, "true");
  };

  const handleTryInstructions = () => {
    onOpenInstructions?.();
    handleClose();
  };

  if (!userId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md overflow-hidden border-0 p-0 backdrop-blur-md bg-white/80 dark:bg-neutral-900/80 shadow-xl">
        {/* Decorative gradient header */}
        <div className="relative h-28 w-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-blue-600 opacity-90" />
          <div className="absolute -bottom-6 right-6 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -top-4 -left-4 h-16 w-16 rounded-full bg-white/20 blur-xl" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-white">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider">Новая функция</span>
          </div>
        </div>

        <DialogHeader className="px-6 pt-4 pb-0">
          <DialogTitle className="text-xl font-bold">Книга с инструкциями на каждой странице</DialogTitle>
          <DialogDescription className="mt-1 text-sm">Подробные руководства, советы и лучшие практики прямо там, где они нужны</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <div className="rounded-xl border bg-purple-50/60 p-3 dark:border-purple-900/40 dark:bg-purple-950/30">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600/90 text-white">
                <Book className="h-4 w-4" />
              </div>
              <p className="font-medium text-purple-900 dark:text-purple-200">Что внутри</p>
              <Badge variant="secondary" className="ml-auto">NEW</Badge>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-purple-800 dark:text-purple-300">
              <li>📊 Инструкции по аналитике</li>
              <li>📡 Настройка каналов</li>
              <li>📚 Работа с базой знаний</li>
              <li>💡 Лучшие практики</li>
            </ul>
          </div>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Ищите кнопку с иконкой книги рядом с заголовком каждой страницы
          </p>
        </div>

        <DialogFooter className="gap-2 px-6 pb-6">
          {onOpenInstructions ? (
            <>
              <Button variant="outline" onClick={handleClose} className="flex-1">
                <X className="mr-2 h-4 w-4" /> Понятно
              </Button>
              <Button onClick={handleTryInstructions} className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Book className="mr-2 h-4 w-4" /> Открыть инструкции {pageName}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Book className="mr-2 h-4 w-4" /> Понятно
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
