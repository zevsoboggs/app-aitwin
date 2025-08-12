import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import FileCard from "@/components/knowledge-base/file-card";
import UploadFileDialog from "@/components/knowledge-base/upload-file-dialog";
import KnowledgeBaseInstructionsDialog from "@/components/knowledge-base/knowledge-base-instructions-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatFileSize, KNOWLEDGE_FILE_TYPES } from "@/lib/constants";
import { KnowledgeItem } from "@shared/schema";
import { Book, LayoutGrid, List, Search, Sparkles, Trash2, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [tabValue, setTabValue] = useState("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [instructionsDialogOpen, setInstructionsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortBy, setSortBy] = useState<"date" | "name" | "size">("date");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { toast } = useToast();

  const { data: knowledgeItems, isLoading } = useQuery<KnowledgeItem[]>({
    queryKey: ["/api/knowledge"],
  });

  const filteredItems = useMemo(() => {
    const list = (knowledgeItems || []).filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = tabValue === "all" || item.fileType === tabValue;
      return matchesSearch && matchesTab;
    });

    const sorted = [...list].sort((a, b) => {
      if (sortBy === "name") return a.title.localeCompare(b.title);
      if (sortBy === "size") return (a.fileSize || 0) - (b.fileSize || 0);
      // date
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });

    return sorted;
  }, [knowledgeItems, searchQuery, tabValue, sortBy]);

  const allSelectedOnPage = filteredItems.length > 0 && selectedIds.length === filteredItems.length;
  const toggleSelectAll = () => {
    setSelectedIds(allSelectedOnPage ? [] : filteredItems.map((f) => f.id));
  };

  const clearSelection = () => setSelectedIds([]);

  const handleToggleSelectOne = (id: number, next: boolean) => {
    setSelectedIds((prev) => (next ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)));
  };

  const handleMassDelete = async () => {
    if (selectedIds.length === 0) return;
    // Псевдо-массовое удаление последовательными запросами, чтоб не ломать API
    try {
      for (const id of selectedIds) {
        await fetch(`/api/knowledge/${id}`, { method: "DELETE", credentials: "include" });
      }
      toast({ title: "Готово", description: `Удалено файлов: ${selectedIds.length}` });
      setSelectedIds([]);
    } catch {
      toast({ title: "Ошибка", description: "Не удалось удалить часть файлов", variant: "destructive" });
    }
  };

  const handleUploadFile = () => setUploadDialogOpen(true);

  const handleFileClick = (file: KnowledgeItem) => {
    toast({ title: "Просмотр файла", description: `Просмотр файла "${file.title}" будет доступен в следующем обновлении` });
  };

  useEffect(() => {
    // При смене таба очищаем выбор
    setSelectedIds([]);
  }, [tabValue]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="gap-1"><Sparkles className="h-4 w-4" /> Раздел обновлён</Badge>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">База знаний</h1>
            <Button variant="secondary" size="icon" onClick={() => setInstructionsDialogOpen(true)} title="Инструкция по работе с базой знаний">
              <Book className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Управляйте файлами и материалами для обучения ассистентов</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleUploadFile}><Upload className="mr-2 h-4 w-4" /> Загрузить файл</Button>
        </div>
      </div>

      {/* Toolbar */}
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="text" placeholder="Поиск файлов..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Tabs defaultValue="all" value={tabValue} onValueChange={setTabValue}>
                <TabsList>
                  <TabsTrigger value="all">Все</TabsTrigger>
                  {KNOWLEDGE_FILE_TYPES.map((type) => (
                    <TabsTrigger key={type.id} value={type.id}>{type.name}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
                <List className="mr-2 h-4 w-4" /> Список
              </Button>
              <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
                <LayoutGrid className="mr-2 h-4 w-4" /> Сетка
              </Button>
              <div className="ml-2 flex items-center gap-2 text-sm text-muted-foreground">
                Найдено: <Badge variant="secondary">{filteredItems.length}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Сортировка" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">По дате</SelectItem>
                  <SelectItem value="name">По названию</SelectItem>
                  <SelectItem value="size">По размеру</SelectItem>
                </SelectContent>
              </Select>
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Выбрано: {selectedIds.length}</Badge>
                  <Button variant="destructive" size="sm" onClick={handleMassDelete}>
                    <Trash2 className="mr-2 h-4 w-4" /> Удалить
                  </Button>
                  <Button variant="outline" size="icon" onClick={clearSelection}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Mobile tabs retained below toolbar for small screens */}
          <div className="block md:hidden">
            <div className="no-scrollbar overflow-x-auto rounded border p-2">
              <div className="flex gap-2">
                <button type="button" className={`whitespace-nowrap rounded-md px-3 pb-1 transition-colors ${tabValue === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`} onClick={() => setTabValue("all")}>Все</button>
                {KNOWLEDGE_FILE_TYPES.map((type) => (
                  <button key={type.id} type="button" className={`whitespace-nowrap rounded-md px-3 pb-1 transition-colors ${tabValue === type.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`} onClick={() => setTabValue(type.id)}>{type.name}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className={viewMode === "grid" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
              {Array.from({ length: viewMode === "grid" ? 6 : 6 }).map((_, i) => (
                <Skeleton key={i} className={viewMode === "grid" ? "h-24 w-full" : "h-16 w-full"} />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">{searchQuery ? `Нет файлов по запросу "${searchQuery}"` : "База знаний пуста"}</div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((file) => {
                const typeInfo = KNOWLEDGE_FILE_TYPES.find((t) => t.id === file.fileType) || KNOWLEDGE_FILE_TYPES[0];
                return (
                  <Card key={file.id} className="hover:shadow-sm">
                    <CardHeader className="flex-row items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${typeInfo.bg}`}>
                          <span className={`material-icons ${typeInfo.color}`}>{typeInfo.icon}</span>
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="truncate text-base">{file.title}</CardTitle>
                          <CardDescription>{formatFileSize(file.fileSize)}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="checkbox" className="h-4 w-4" checked={selectedIds.includes(file.id)} onChange={(e) => handleToggleSelectOne(file.id, e.target.checked)} />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Добавлен {new Date(file.uploadedAt).toLocaleDateString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                        <Button variant="outline" size="sm" onClick={() => handleFileClick(file)}>Открыть</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="divide-y">
              {/* List mode with selectable rows */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Input type="checkbox" className="h-4 w-4" checked={allSelectedOnPage} onChange={toggleSelectAll} />
                  Выбрать всё на странице
                </div>
              </div>
              {filteredItems.map((file) => {
                const fileTypeInfo = KNOWLEDGE_FILE_TYPES.find((type) => type.id === file.fileType) || KNOWLEDGE_FILE_TYPES[0];
                return (
                  <FileCard
                    key={file.id}
                    icon={fileTypeInfo.icon}
                    iconBg={fileTypeInfo.bg}
                    iconColor={fileTypeInfo.color}
                    fileName={file.title}
                    fileSize={formatFileSize(file.fileSize)}
                    uploadDate={`Добавлен ${new Date(file.uploadedAt).toLocaleDateString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`}
                    onClick={() => handleFileClick(file)}
                    id={file.id}
                    selectable
                    selected={selectedIds.includes(file.id)}
                    onToggleSelect={handleToggleSelectOne}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <UploadFileDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />
      <KnowledgeBaseInstructionsDialog open={instructionsDialogOpen} onOpenChange={setInstructionsDialogOpen} />
    </div>
  );
}
