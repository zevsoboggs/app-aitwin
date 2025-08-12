import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ChatInterface from "@/components/communications/ChatInterface";
import MessageTrainingDialog from "@/components/communications/MessageTrainingDialog";
import CommunicationsInstructionsDialog from "@/components/communications/communications-instructions-dialog";
import ChannelSelector from "@/components/communications/ChannelSelector";
import ChannelDialogsList from "@/components/communications/ChannelDialogsList";
import VkMessageViewer from "@/components/communications/VkMessageViewer";
import AvitoChatInterface from "@/components/communications/AvitoChatInterface";
import WebChatInterface from "@/components/communications/WebChatInterface";
import MobileCommunicationsLayout from "@/components/communications/Mobile-communications-layout";
import { Message, Conversation } from "@/types/messages";
import { Bot, Book, BookOpen, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Badge } from "@/components/ui/badge";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import ConversationList from "@/components/communications/ConversationList";

// Тип для данных канала
interface ChannelData {
  id: number;
  name: string;
  type: string;
  status: string;
  unreadCount?: number;
}

export default function Communications() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<
    number | null
  >(null);
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isEditingMessage, setIsEditingMessage] = useState<boolean>(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [previousUserMessage, setPreviousUserMessage] = useState<Message | null>(null);
  const [instructionsDialogOpen, setInstructionsDialogOpen] = useState(false);
  const [channelsSearchQuery, setChannelsSearchQuery] = useState("");

  // Состояние для работы с каналами и диалогами
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [selectedChannelType, setSelectedChannelType] = useState<string | null>(null);
  const [selectedDialogId, setSelectedDialogId] = useState<number | string | null>(null);
  const [selectedDialogType, setSelectedDialogType] = useState<string | null>(null);

  // Определяем текущий брейкпоинт для адаптивности
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Запрос данных о выбранном канале
  const { data: channelData } = useQuery<ChannelData>({
    queryKey: [`/api/channels/${selectedChannelId}`],
    enabled: !!selectedChannelId,
  });

  // При изменении выбранного канала
  useEffect(() => {
    if (selectedChannelId && channelData) {
      setSelectedChannelType(channelData.type);
      setSelectedDialogId(null);
      setSelectedDialogType(null);
    } else {
      setSelectedChannelType(null);
    }
  }, [selectedChannelId, channelData]);

  // Запрос данных о диалогах
  const { data: conversationsData } = useQuery({
    queryKey: ["/api/conversations"],
  });

  // Запрос данных о каналах
  const { data: channelsData } = useQuery<ChannelData[]>({
    queryKey: ["/api/channels"],
  });

  // Реальные данные без демо-фолбеков
  const channels: ChannelData[] = Array.isArray(channelsData) ? channelsData : [];
  const conversations: Conversation[] = Array.isArray(conversationsData) ? (conversationsData as Conversation[]) : [];

  // Фильтрация каналов по поисковому запросу
  const filteredChannels = channelsSearchQuery.trim()
    ? channels.filter((channel) =>
        channel.name.toLowerCase().includes(channelsSearchQuery.toLowerCase())
      )
    : channels;

  // Запрос сообщений выбранной беседы
  const { data: messagesData, refetch: refetchMessages } = useQuery({
    queryKey: [selectedConversationId ? `/api/conversations/${selectedConversationId}/messages` : ""],
    enabled: !!selectedConversationId,
  });

  // При изменении выбранной беседы
  useEffect(() => {
    if (selectedConversationId) {
      if (messagesData) {
        setMessages(messagesData as Message[]);
      } else {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [selectedConversationId, messagesData]);

  // Мутация для отправки сообщения
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversationId) return;
      return await apiRequest({
        method: "POST",
        url: `/api/conversations/${selectedConversationId}/messages`,
        body: { content },
      });
    },
    onSuccess: () => {
      refetchMessages();
      toast({ title: "Сообщение отправлено" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось отправить сообщение", variant: "destructive" });
    },
  });

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now(),
      content,
      senderType: "user",
      timestamp: new Date().toLocaleString(),
      conversationId: selectedConversationId || 0,
    };
    setMessages((prev) => [...prev, newMessage]);
    sendMessageMutation.mutate(content);
  };

  const handleNewChat = () => {
    toast({ title: "Новый диалог", description: "Функция создания нового диалога будет добавлена в следующем обновлении" });
  };

  const handleEditMessage = (message: Message) => {
    if (message.senderType !== "assistant") return;
    const messageIndex = messages.findIndex((m) => m.id === message.id);
    if (messageIndex <= 0) return;

    let userMessage: Message | null = null;
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].senderType === "user") {
        userMessage = messages[i];
        break;
      }
    }

    if (!userMessage) {
      toast({ title: "Предупреждение", description: "Не найден предшествующий запрос пользователя", variant: "destructive" });
      return;
    }

    setSelectedMessage(message);
    setPreviousUserMessage(userMessage);
    setIsEditingMessage(true);
  };

  const getSelectedConversationName = () => {
    if (!selectedConversationId) return "";
    const conversation = conversations.find((c) => c.id === selectedConversationId);
    return conversation ? conversation.name : "";
  };

  const getSelectedConversationChannel = () => {
    if (!selectedConversationId) return "";
    const conversation = conversations.find((c) => c.id === selectedConversationId);
    return conversation ? conversation.channel : "";
  };

  const handleDialogSelect = (dialogId: number | string, dialogType: string) => {
    setSelectedDialogId(dialogId);
    setSelectedDialogType(dialogType);
  };

  useEffect(() => {
    setSelectedDialogId(null);
    setSelectedDialogType(null);
  }, [selectedChannelId]);

  return (
    <div className="h-[calc(100vh-6rem)] space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="gap-1"><Sparkles className="h-4 w-4" /> Раздел обновлён</Badge>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Коммуникации</h1>
            <Button variant="secondary" size="icon" onClick={() => setInstructionsDialogOpen(true)} title="Инструкция по работе с коммуникациями">
              <Book className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Управление диалогами с клиентами и пользователями</p>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden h-[calc(100vh-12rem)]">
        <MobileCommunicationsLayout
          selectedChannelId={selectedChannelId}
          setSelectedChannelId={setSelectedChannelId}
          selectedDialogId={selectedDialogId}
          setSelectedDialogId={setSelectedDialogId}
          selectedDialogType={selectedDialogType}
          setSelectedDialogType={setSelectedDialogType}
          channelsData={channels}
          selectedConversationId={selectedConversationId}
          setSelectedConversationId={setSelectedConversationId}
          messages={messages}
          handleSendMessage={handleSendMessage}
          handleEditMessage={handleEditMessage}
          getSelectedConversationName={getSelectedConversationName}
          getSelectedConversationChannel={getSelectedConversationChannel}
          handleDialogSelect={handleDialogSelect}
        />
      </div>

      {/* Desktop resizable layout */}
      <div className="hidden h-[calc(100vh-16rem)] lg:block">
        <ResizablePanelGroup direction="horizontal">
          {/* Left: Channels/Dialogs Tabs */}
          <ResizablePanel defaultSize={22} minSize={18} maxSize={35} className="rounded-md border overflow-hidden">
            <Tabs defaultValue="chats" className="flex h-full flex-col">
              <div className="border-b">
                <TabsList className="w-full">
                  <TabsTrigger value="chats" className="flex-1">Диалоги</TabsTrigger>
                  <TabsTrigger value="memory" className="flex-1">Память</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="chats" className="flex-1 overflow-hidden">
                {selectedChannelId ? (
                  <ChannelDialogsList
                    channelId={selectedChannelId}
                    channelType={selectedChannelType}
                    onSelectDialog={handleDialogSelect}
                    selectedDialogId={selectedDialogId}
                  />
                ) : (
                  <div className="flex h-full flex-col">
                    <div className="border-b p-3">
                      <Input placeholder="Поиск каналов..." className="w-full" value={channelsSearchQuery} onChange={(e) => setChannelsSearchQuery(e.target.value)} />
                    </div>
                    <ScrollArea className="no-scrollbar h-full">
                      <div className="px-3 py-2">
                        {channels.map((channel) => (
                          <div key={channel.id} onClick={() => { setSelectedTab("channels"); setSelectedChannelId(channel.id); }} className="flex cursor-pointer items-center rounded-md px-1 py-2 transition-colors hover:bg-accent">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                              <span className="material-icons text-lg text-foreground">{channel.type === "vk" ? "chat" : "mail"}</span>
                            </div>
                            <div className="ml-3 min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{channel.name}</p>
                            </div>
                          </div>
                        ))}
                        {channels.length === 0 && (
                          <div className="py-4 text-center text-sm text-muted-foreground">Нет доступных каналов</div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="memory" className="flex-1 p-4">
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-medium">База памяти</h3>
                  <p className="max-w-xs text-sm text-muted-foreground">Здесь будут храниться все исправления и обучающие примеры для ваших ассистентов.</p>
                </div>
              </TabsContent>
            </Tabs>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Middle: Conversation list */}
          <ResizablePanel defaultSize={28} minSize={20} maxSize={40} className="rounded-md border overflow-hidden">
            <ConversationList
              conversations={conversations}
              onSelectConversation={setSelectedConversationId}
              selectedConversationId={selectedConversationId}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right: Chat */}
          <ResizablePanel defaultSize={50} minSize={35} className="rounded-md border overflow-hidden">
            {selectedChannelId && selectedDialogId && channelsData ? (
              channelsData.find((c) => c.id === selectedChannelId)?.type === selectedDialogType ? (
                selectedDialogType === "vk" ? (
                  <VkMessageViewer channelId={selectedChannelId} peerId={selectedDialogId} />
                ) : selectedDialogType === "avito" ? (
                  <AvitoChatInterface channelId={selectedChannelId} chatId={selectedDialogId.toString()} />
                ) : selectedDialogType === "web" ? (
                  <WebChatInterface channelId={selectedChannelId} dialogId={selectedDialogId.toString()} />
                ) : null
              ) : null
            ) : selectedConversationId ? (
              <ChatInterface
                conversationId={selectedConversationId}
                conversationName={getSelectedConversationName()}
                channelType={getSelectedConversationChannel()}
                messages={messages}
                onSendMessage={handleSendMessage}
                onEditMessage={handleEditMessage}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                <Bot className="mb-4 h-16 w-16 text-muted-foreground" />
                <h3 className="mb-2 text-xl font-medium text-foreground">Выберите диалог</h3>
                <p className="mb-6 max-w-md text-muted-foreground">{selectedChannelId ? "Выберите диалог из списка слева, чтобы начать общение." : "Выберите канал или диалог слева, затем начните общение."}</p>
                {!selectedChannelId && channels.length > 0 && (
                  <Button onClick={() => setSelectedChannelId(channels[0].id)}>Быстрый старт</Button>
                )}
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <MessageTrainingDialog open={isEditingMessage} onOpenChange={setIsEditingMessage} message={selectedMessage} previousUserMessage={previousUserMessage} assistantName="Ассистент" onSuccess={() => { toast({ title: "Успешно", description: "Исправление сохранено в базе памяти ассистента" }); }} />
      <CommunicationsInstructionsDialog open={instructionsDialogOpen} onOpenChange={setInstructionsDialogOpen} />
    </div>
  );
}
