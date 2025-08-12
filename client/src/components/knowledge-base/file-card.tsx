import { Trash2 } from "lucide-react";
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";

interface FileCardProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  onClick: () => void;
  id: number;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: number, next: boolean) => void;
}

export default function FileCard({
  icon,
  iconBg,
  iconColor,
  fileName,
  fileSize,
  uploadDate,
  onClick,
  id,
  selectable = false,
  selected = false,
  onToggleSelect,
}: FileCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const deleteFile = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/knowledge/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Ошибка при удалении файла");
      }

      await response.json();

      toast({
        title: "Успех",
        description: "Фаил успешно удалён",
        variant: "default",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] });
    } catch (error) {
      console.error("Ошибка при удалении файла:", error);
      toast({
        title: "Ошибка",
        description: `Не удалось удалить фаил: ${
          error instanceof Error ? error.message : String(error)
        }`,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const confirmDelete = () => {
    deleteFile();
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(false);
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-2 py-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/30 sm:gap-4 sm:px-4 sm:py-3"
      onClick={onClick}
    >
      {selectable && (
        <div className="mr-1">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => {
              if (onToggleSelect) onToggleSelect(id, Boolean(checked));
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label={selected ? "Снять выбор" : "Выбрать"}
          />
        </div>
      )}

      <div className={`mr-2 flex h-8 w-8 items-center justify-center rounded-lg sm:mr-4 sm:h-10 sm:w-10 ${iconBg}`}>
        <span className={`material-icons ${iconColor}`}>{icon}</span>
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-medium text-foreground sm:text-base">{fileName}</h4>
        <div className="text-xs text-muted-foreground sm:flex sm:items-center sm:text-sm">
          <span className="flex-shrink-0">{fileSize}</span>
          <span className="mx-1.5 hidden sm:block">•</span>
          <span>{uploadDate}</span>
        </div>
      </div>

      <div className="ml-2 flex flex-wrap items-center gap-1 sm:ml-4 sm:gap-2">
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 sm:h-8 sm:w-8"
          aria-label="Просмотреть файл"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <span className="material-icons text-[18px] text-muted-foreground sm:text-[20px]">visibility</span>
        </button>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 sm:h-8 sm:w-8"
          aria-label="Удаление файла"
          onClick={handleDeleteClick}
        >
          <Trash2 className="h-4 w-4 text-red-500 sm:h-5 sm:w-5" />
        </button>
      </div>

      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={cancelDelete}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-medium">Подтверждение удаления</h3>
            <p className="mb-6">Вы уверены, что хотите удалить файл "{fileName}"? Это действие нельзя отменить.</p>
            <div className="flex justify-end space-x-3">
              <button className="rounded bg-gray-200 px-4 py-2 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600" onClick={cancelDelete} disabled={isDeleting}>
                Отмена
              </button>
              <button className="rounded bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? "Удаление..." : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
