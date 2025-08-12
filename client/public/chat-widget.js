/**
 * AiTwin Chat Widget
 * Version: 1.0.0
 * Lightweight chat widget for website integration
 */

// Базовый URL для API запросов
let baseUrl = "";

// Автоматически определяем базовый URL, либо используем текущий домен
(function () {
  baseUrl = "https://asissto.ru"; // не забудь поменять на https://asissto.ru
})();

(function () {
  "use strict";

  class AstistoChat {
    constructor(channelId, config = {}) {
      this.channelId = channelId;
      this.config = {
        position: "bottom-right",
        primaryColor: "#3B82F6",
        headerText: "Онлайн-чат",
        fontSize: "14px",
        ...config,
      };

      this.messages = [];
      this.visitorId = this.getVisitorId();
      this.isOpen = false;
      this.isEmojiPickerOpen = false;
      this.unreadCount = 0;
      this.page = 1;
      this.hasMoreMessages = true;
      this.isLoadingMessages = false;
      this.isTyping = false;
      this.messageQueue = [];
      this.lastMessageId = null;
      this.chatElement = null;
      this.chatContainer = null;
      this.messagesContainer = null;
      this.timeoutId = null;

      // Защита от флуда
      this.lastMessageTime = 0;
      this.messageCount = 0;
      this.messageRateLimit = 5; // макс. 5 сообщений
      this.rateLimitPeriod = 60000; // за 60 секунд

      this.init();

      // Проверяем параметр chat-widget в URL
      this.checkUrlParameter();
    }

    // Новый метод для проверки параметра в URL
    checkUrlParameter() {
      try {
        // Получаем параметры из URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlChannelId = urlParams.get("chat-widget");

        if (urlChannelId) {
          // Преобразуем channelId к строке для корректного сравнения
          const currentChannelId = String(this.channelId);
          const paramChannelId = String(urlChannelId);

          // Создаем стили для уведомления
          if (!document.getElementById("AiTwin-notification-styles")) {
            const notificationStyles = document.createElement("style");
            notificationStyles.id = "AiTwin-notification-styles";
            notificationStyles.textContent = `
              .AiTwin-notification {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                width: 80%;
                max-width: 1200px;
                padding: 20px 30px;
                border-radius: 12px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 18px;
                font-weight: 600;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
                z-index: 10000;
                animation: slideDown 0.5s ease-out;
                cursor: pointer;
                text-align: center;
                border: 3px solid rgba(255, 255, 255, 0.3);
              }
              
              .AiTwin-notification.success {
                background: linear-gradient(135deg, #10B981, #059669);
                color: white;
              }
              
              .AiTwin-notification.error {
                background: linear-gradient(135deg, #EF4444, #DC2626);
                color: white;
              }
              
              .AiTwin-notification-info {
                font-size: 14px;
                margin-top: 8px;
                opacity: 0.95;
                font-weight: 400;
              }
              
              .AiTwin-notification-close {
                position: absolute;
                top: 8px;
                right: 15px;
                font-size: 24px;
                font-weight: bold;
                opacity: 0.8;
                transition: opacity 0.2s;
              }
              
              .AiTwin-notification-close:hover {
                opacity: 1;
              }
              
              @keyframes slideDown {
                from {
                  transform: translateX(-50%) translateY(-100px);
                  opacity: 0;
                }
                to {
                  transform: translateX(-50%) translateY(0);
                  opacity: 1;
                }
              }
              
              @keyframes fadeOut {
                from {
                  opacity: 1;
                }
                to {
                  opacity: 0;
                  transform: translateX(-50%) translateY(-30px);
                }
              }
              
              @media (max-width: 768px) {
                .AiTwin-notification {
                  width: 95%;
                  padding: 15px 20px;
                  font-size: 16px;
                }
              }
            `;
            document.head.appendChild(notificationStyles);
          }

          // Создаем уведомление
          const notification = document.createElement("div");
          notification.className = "AiTwin-notification";

          if (currentChannelId === paramChannelId) {
            notification.classList.add("success");
            notification.innerHTML = `
              <div class="AiTwin-notification-close">×</div>
              ✓ Чат подключен успешно!
            `;
            console.log(`[AiTwin WIDGET] Чат успешно подключен.`);
          } else {
            notification.classList.add("error");
            notification.innerHTML = `
              <div class="AiTwin-notification-close">×</div>
              ✗ Чат не подключен - неверный Channel ID
              <div class="AiTwin-notification-info">
                Запрошен: ${paramChannelId} | Текущий: ${currentChannelId}
              </div>
            `;
            console.log(
              `[AiTwin WIDGET] Чат НЕ подключен. Запрошенный ID: ${paramChannelId}, Текущий ID: ${currentChannelId}`
            );
          }

          // Добавляем уведомление на страницу
          document.body.appendChild(notification);

          // Удаляем уведомление только при клике на крестик или на само уведомление
          notification.addEventListener("click", () => {
            notification.style.animation = "fadeOut 0.4s ease-out";
            setTimeout(() => {
              notification.remove();
            }, 400);
          });

          // Убираем автоматическое удаление - уведомление остается постоянно
          // setTimeout(() => {
          //   if (notification.parentNode) {
          //     notification.style.animation = 'fadeOut 0.3s ease-out';
          //     setTimeout(() => {
          //       notification.remove();
          //     }, 300);
          //   }
          // }, 5000);
        }
      } catch (error) {
        console.error(
          "[AiTwin WIDGET] Ошибка при проверке URL параметра:",
          error
        );
      }
    }

    init() {
      // Create the chat widget DOM elements
      this.createWidget();

      // Add event listeners
      this.addEventListeners();

      // Load existing messages
      this.loadMessages();

      // Check unread messages every 30 seconds
      setInterval(() => {
        this.checkUnreadMessages();
      }, 30000);
    }

    createWidget() {
      // Create main container
      this.chatElement = document.createElement("div");
      this.chatElement.id = "AiTwin-chat-widget";
      this.chatElement.classList.add("AiTwin-chat");
      this.chatElement.classList.add(this.config.position || "bottom-right");

      // Apply custom styles
      const mainStyles = document.createElement("style");
      mainStyles.textContent = `
        .AiTwin-chat {
          position: fixed;
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
          font-size: ${this.config.fontSize || "14px"};
          transition: all 0.3s ease;
          line-height: 1.4;
          color: #111827;
        }
        .AiTwin-chat.bottom-right {
          bottom: 120px;
          right: 20px;
        }
        .AiTwin-chat.bottom-left {
          bottom: 20px;
          left: 20px;
        }
        .AiTwin-chat.top-right {
          top: 20px;
          right: 20px;
        }
        .AiTwin-chat.top-left {
          top: 20px;
          left: 20px;
        }
        .AiTwin-chat.bottom-center {
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
        }
        .AiTwin-chat.left-center {
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
        }
        .AiTwin-chat.right-center {
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
        }
        .AiTwin-chat-button {
          width: 60px;
          height: 60px;
          border-radius: 30px;
          background-color: ${this.config.primaryColor || "#3B82F6"};
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          position: relative;
          transition: all 0.2s ease;
        }
        .AiTwin-chat-button:hover {
          transform: scale(1.05);
        }
        .AiTwin-chat-button-icon {
          width: 24px;
          height: 24px;
        }
        .AiTwin-chat-button-icon.icon-close {
          display: none;
        }
        .AiTwin-chat-button.open .icon-chat {
          display: none;
        }
        .AiTwin-chat-button.open .icon-close {
          display: block;
        }
        .AiTwin-chat-button-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background-color: #EF4444;
          color: white;
          border-radius: 10px;
          min-width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          padding: 0 6px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .AiTwin-chat-button-badge.has-unread {
          opacity: 1;
        }
        .AiTwin-chat-container {
          position: absolute;
          width: 350px;
          height: 500px;
          max-height: 80vh;
          bottom: 80px;
          background-color: white;
          border-radius: 10px;
          box-shadow: 0 5px 25px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          opacity: 0;
          visibility: hidden;
          transform: translateY(10px);
          transition: all 0.3s ease;
        }
        .AiTwin-chat.bottom-right .AiTwin-chat-container {
          right: 0;
        }
        .AiTwin-chat.bottom-left .AiTwin-chat-container {
          left: 0;
        }
        .AiTwin-chat.top-right .AiTwin-chat-container {
          right: 0;
          bottom: auto;
          top: 80px;
        }
        .AiTwin-chat.top-left .AiTwin-chat-container {
          left: 0;
          bottom: auto;
          top: 80px;
        }
        .AiTwin-chat.bottom-center .AiTwin-chat-container {
          left: 50%;
          transform: translateX(-50%);
          bottom: 80px;
        }
        .AiTwin-chat.left-center .AiTwin-chat-container {
          left: 0;
          top: 50%;
          transform: translateY(-50%);
        }
        .AiTwin-chat.right-center .AiTwin-chat-container {
          right: 0;
          top: 50%;
          transform: translateY(-50%);
        }
        .AiTwin-chat-container.open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        .AiTwin-chat-header {
          background-color: ${this.config.primaryColor || "#3B82F6"};
          color: white;
          padding: 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .AiTwin-chat-title {
          font-weight: bold;
          font-size: 16px;
        }
        .AiTwin-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
          display: flex;
          flex-direction: column;
        }
        .AiTwin-chat-messages-content {
          display: flex;
          flex-direction: column;
          margin-top: auto;
        }
        .AiTwin-chat-message {
          max-width: 80%;
          margin-bottom: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          position: relative;
          word-break: break-word;
        }
        .AiTwin-chat-message-user {
          align-self: flex-end;
          background-color: ${this.config.primaryColor || "#3B82F6"};
          color: white;
          border-bottom-right-radius: 3px;
        }
        .AiTwin-chat-message-operator {
          align-self: flex-start;
          background-color: #F3F4F6;
          color: #111827;
          border-bottom-left-radius: 3px;
        }
        .AiTwin-chat-message-time {
          font-size: 11px;
          margin-top: 5px;
          opacity: 0.8;
          display: block;
          text-align: right;
        }
        .AiTwin-chat-input-container {
          border-top: 1px solid #E5E7EB;
          padding: 15px;
          display: flex;
          align-items: center;
          background-color: white;
        }
        .AiTwin-chat-input {
          flex: 1;
          border: 1px solid #E5E7EB;
          border-radius: 20px;
          padding: 8px 12px;
          outline: none;
          resize: none;
          max-height: 100px;
          overflow-y: auto;
        }
        .AiTwin-chat-input:focus {
          border-color: ${this.config.primaryColor || "#3B82F6"};
        }
        .AiTwin-chat-send {
          background-color: transparent;
          border: none;
          cursor: pointer;
          margin-left: 10px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 17px;
          transition: background-color 0.2s ease;
        }
        .AiTwin-chat-send:hover {
          background-color: #F3F4F6;
        }
        .AiTwin-chat-emoji-btn {
          background-color: transparent;
          border: none;
          cursor: pointer;
          margin-right: 5px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 17px;
          transition: background-color 0.2s ease;
        }
        .AiTwin-chat-emoji-btn:hover {
          background-color: #F3F4F6;
        }
        .AiTwin-chat-emoji-picker {
          position: absolute;
          bottom: 75px;
          left: 15px;
          background-color: white;
          border-radius: 10px;
          box-shadow: 0 5px 25px rgba(0, 0, 0, 0.15);
          padding: 10px;
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 5px;
          z-index: 2;
          max-height: 200px;
          overflow-y: auto;
          width: 320px;
          display: none;
        }
        .AiTwin-chat-emoji-picker.open {
          display: grid;
        }
        .AiTwin-emoji {
          cursor: pointer;
          font-size: 18px;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 5px;
          transition: background-color 0.2s ease;
        }
        .AiTwin-emoji:hover {
          background-color: #F3F4F6;
        }
        .AiTwin-chat-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: #6B7280;
        }
        .AiTwin-chat-typing {
          align-self: flex-start;
          color: #6B7280;
          font-size: 12px;
          margin-top: 5px;
          display: none;
        }
        .AiTwin-chat-typing.visible {
          display: block;
        }
        .AiTwin-chat-load-more {
          align-self: center;
          color: ${this.config.primaryColor || "#3B82F6"};
          background: none;
          border: none;
          cursor: pointer;
          padding: 5px 10px;
          margin: 10px 0;
          font-size: 12px;
          display: none;
        }
        .AiTwin-chat-load-more.visible {
          display: block;
        }
        .AiTwin-chat-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .AiTwin-chat-scrollbar::-webkit-scrollbar-track {
          background: #F3F4F6;
        }
        .AiTwin-chat-scrollbar::-webkit-scrollbar-thumb {
          background-color: #D1D5DB;
          border-radius: 3px;
        }
        .AiTwin-bounce {
          animation: AiTwin-bounce 0.5s;
        }
        @keyframes AiTwin-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @media (max-width: 425px) {
          .AiTwin-chat-container {
            width: calc(100vw - 40px);
            height: calc(100vh - 140px);
            bottom: 70px;
          }
        }
      `;
      document.head.appendChild(mainStyles);

      // Chat button with badge
      let buttonHtml = "";

      // Если указана пользовательская иконка, используем её
      if (this.config.iconUrl) {
        buttonHtml = `
          <div class="AiTwin-chat-button">
            <span class="AiTwin-chat-button-badge">0</span>
            <img src="${this.config.iconUrl}" class="AiTwin-chat-button-icon icon-chat" alt="Chat" style="width: 40px; height: 40px; border-radius: 50%;">
            <svg class="AiTwin-chat-button-icon icon-close" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        `;
      } else {
        // Используем стандартную SVG иконку
        buttonHtml = `
          <div class="AiTwin-chat-button">
            <span class="AiTwin-chat-button-badge">0</span>
            <svg class="AiTwin-chat-button-icon icon-chat" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12C21 16.9706 16.9706 21 12 21C10.8896 21 9.82379 20.8067 8.83838 20.4494C8.36362 20.2965 8.12628 20.22 7.83212 20.2195C7.5077 20.2191 7.31595 20.2751 6.99832 20.3817L5.17812 20.9396C4.63079 21.1137 4.35712 21.2008 4.14862 21.1397C3.96625 21.0868 3.81281 20.9617 3.72207 20.7939C3.61719 20.6006 3.65328 20.3163 3.72546 19.7478L3.86858 18.6336C3.97159 17.8334 4.0231 17.4332 3.94615 17.0778C3.87593 16.7532 3.73065 16.4511 3.52261 16.1963C3.28662 15.9084 2.93845 15.6954 2.24212 15.2694C1.22498 14.6344 0.5 13.3682 0.5 12C0.5 7.02944 4.52944 3 9.5 3H12C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg class="AiTwin-chat-button-icon icon-close" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        `;
      }

      // Chat container
      const containerHtml = `
        <div class="AiTwin-chat-container">
          <div class="AiTwin-chat-header">
            <div class="AiTwin-chat-title">${
              this.config.headerText || "Онлайн-чат"
            }</div>
          </div>
          <div class="AiTwin-chat-messages AiTwin-chat-scrollbar">
            <div class="AiTwin-chat-messages-content"></div>
            <button class="AiTwin-chat-load-more">Загрузить больше</button>
          </div>
          <div class="AiTwin-chat-typing">Оператор печатает...</div>
          <div class="AiTwin-chat-emoji-picker AiTwin-chat-scrollbar">
            ${this.generateEmojis()}
          </div>
          <div class="AiTwin-chat-input-container">
            <button class="AiTwin-chat-emoji-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.5 11C8.5 11.2761 8.27614 11.5 8 11.5C7.72386 11.5 7.5 11.2761 7.5 11C7.5 10.7239 7.72386 10.5 8 10.5C8.27614 10.5 8.5 10.7239 8.5 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16.5 11C16.5 11.2761 16.2761 11.5 16 11.5C15.7239 11.5 15.5 11.2761 15.5 11C15.5 10.7239 15.7239 10.5 16 10.5C16.2761 10.5 16.5 10.7239 16.5 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M7.5 16C8.16304 16.6303 8.96911 17.1282 9.85952 17.4615C10.7499 17.7948 11.7001 17.9558 12.658 17.9329C13.6159 17.91 14.5548 17.7039 15.4262 17.3287C16.2976 16.9535 17.0782 16.4169 17.714 15.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <textarea
              class="AiTwin-chat-input"
              placeholder="Введите сообщение..."
              rows="1"
            ></textarea>
            <button class="AiTwin-chat-send">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      `;

      // Combine all HTML
      this.chatElement.innerHTML = buttonHtml + containerHtml;

      // Add to document
      document.body.appendChild(this.chatElement);

      // Store references to DOM elements for later use
      this.chatButton = this.chatElement.querySelector(".AiTwin-chat-button");
      this.messageBadge = this.chatElement.querySelector(
        ".AiTwin-chat-button-badge"
      );
      this.chatContainer = this.chatElement.querySelector(
        ".AiTwin-chat-container"
      );
      this.messagesContainer = this.chatElement.querySelector(
        ".AiTwin-chat-messages-content"
      );
      this.messagesWrapper = this.chatElement.querySelector(
        ".AiTwin-chat-messages"
      );
      this.messageInput = this.chatElement.querySelector(".AiTwin-chat-input");
      this.sendButton = this.chatElement.querySelector(".AiTwin-chat-send");
      this.emojiButton = this.chatElement.querySelector(
        ".AiTwin-chat-emoji-btn"
      );
      this.emojiPicker = this.chatElement.querySelector(
        ".AiTwin-chat-emoji-picker"
      );
      this.loadMoreButton = this.chatElement.querySelector(
        ".AiTwin-chat-load-more"
      );
      this.typingIndicator = this.chatElement.querySelector(
        ".AiTwin-chat-typing"
      );
    }

    generateEmojis() {
      // Popular emojis to use in chat
      const emojis = [
        "😊",
        "😃",
        "😄",
        "😁",
        "😆",
        "😅",
        "😂",
        "🤣",
        "🥲",
        "😉",
        "😍",
        "🥰",
        "😘",
        "😚",
        "😙",
        "😗",
        "😋",
        "😛",
        "😝",
        "😜",
        "🤪",
        "🤗",
        "🤭",
        "🤔",
        "🤫",
        "🤐",
        "🤨",
        "😐",
        "😑",
        "😶",
        "😏",
        "😒",
        "🙄",
        "😬",
        "😮",
        "😯",
        "😲",
        "😳",
        "🥺",
        "😦",
        "👍",
        "👎",
        "👏",
        "🙌",
        "🫶",
        "💪",
        "🤝",
        "👊",
        "✌️",
        "🤞",
        "❤️",
        "💔",
        "💯",
        "✅",
        "❌",
        "❓",
        "❗",
        "⭐",
        "🔥",
        "👋",
      ];

      return emojis
        .map((emoji) => `<div class="AiTwin-emoji">${emoji}</div>`)
        .join("");
    }

    addEventListeners() {
      // Toggle chat open/close when button is clicked
      this.chatButton.addEventListener("click", () => this.toggleChat());

      // Send message on button click
      this.sendButton.addEventListener("click", () => this.sendMessage());

      // Send message on Enter key (but allow Shift+Enter for new line)
      this.messageInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      // Toggle emoji picker
      this.emojiButton.addEventListener("click", () =>
        this.toggleEmojiPicker()
      );

      // Insert emoji to input
      this.emojiPicker.addEventListener("click", (e) => {
        if (e.target.classList.contains("AiTwin-emoji")) {
          this.insertEmoji(e.target.textContent);
        }
      });

      // Load more messages button
      this.loadMoreButton.addEventListener("click", () =>
        this.loadMoreMessages()
      );

      // Auto-resize textarea
      this.messageInput.addEventListener("input", () => {
        this.messageInput.style.height = "auto";
        this.messageInput.style.height =
          Math.min(this.messageInput.scrollHeight, 100) + "px";
      });

      // Close emoji picker when clicking outside
      document.addEventListener("click", (e) => {
        if (
          this.isEmojiPickerOpen &&
          !this.emojiPicker.contains(e.target) &&
          !this.emojiButton.contains(e.target)
        ) {
          this.toggleEmojiPicker(false);
        }
      });

      // When chat is open, reset unread count
      this.messagesWrapper.addEventListener("scroll", () => {
        if (this.isOpen && this.unreadCount > 0) {
          this.unreadCount = 0;
          this.updateUnreadBadge();
        }
      });
    }

    toggleChat(force) {
      const newState = force !== undefined ? force : !this.isOpen;
      this.isOpen = newState;

      if (this.isOpen) {
        this.chatContainer.classList.add("open");
        this.chatButton.classList.add("open");

        // Reset unread count when chat is opened
        this.unreadCount = 0;
        this.updateUnreadBadge();

        // Close emoji picker when chat opens
        this.toggleEmojiPicker(false);

        // Scroll to bottom of chat
        this.scrollToBottom();

        // Focus input
        setTimeout(() => {
          this.messageInput.focus();
        }, 300);
      } else {
        this.chatContainer.classList.remove("open");
        this.chatButton.classList.remove("open");
      }
    }

    toggleEmojiPicker(force) {
      const newState = force !== undefined ? force : !this.isEmojiPickerOpen;
      this.isEmojiPickerOpen = newState;

      if (this.isEmojiPickerOpen) {
        this.emojiPicker.classList.add("open");
      } else {
        this.emojiPicker.classList.remove("open");
      }
    }

    insertEmoji(emoji) {
      const startPos = this.messageInput.selectionStart;
      const endPos = this.messageInput.selectionEnd;
      const text = this.messageInput.value;
      const newText =
        text.substring(0, startPos) + emoji + text.substring(endPos);
      this.messageInput.value = newText;
      this.messageInput.focus();
      this.messageInput.selectionStart = startPos + emoji.length;
      this.messageInput.selectionEnd = startPos + emoji.length;

      // Trigger input event for auto-resize
      const event = new Event("input", { bubbles: true });
      this.messageInput.dispatchEvent(event);
    }

    async sendMessage() {
      const content = this.messageInput.value.trim();
      if (!content) return;

      // Проверка ограничения частоты сообщений
      const now = Date.now();
      if (now - this.lastMessageTime < this.rateLimitPeriod) {
        this.messageCount++;
        if (this.messageCount > this.messageRateLimit) {
          // Показываем сообщение об ошибке
          // Рассчитываем, когда закончится ограничение
          const restrictionEndTime = new Date(
            this.lastMessageTime + this.rateLimitPeriod
          );
          const timeString = restrictionEndTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          this.addMessage({
            senderType: "system",
            content: `Превышен лимит сообщений в минуту (5 сообщений). Вы сможете отправить следующее сообщение после ${timeString}.`,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      } else {
        // Сбрасываем счетчик после истечения периода
        this.messageCount = 1;
        this.lastMessageTime = now;
      }

      // Reset input
      this.messageInput.value = "";
      this.messageInput.style.height = "auto";
      this.messageInput.focus();

      // Безопасная санитизация контента
      const sanitizedContent = this.sanitizeContent(content);

      // Create message object
      const timestamp = new Date().toISOString();
      const messageObj = {
        senderType: "user",
        content: sanitizedContent,
        timestamp: timestamp,
      };

      // Add message to UI immediately
      this.addMessage(messageObj);

      try {
        // Send message to server
        const response = await fetch(
          `${baseUrl}/api/channels/${this.channelId}/widget/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              visitorId: this.visitorId,
              content: sanitizedContent,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to send message: ${response.status} ${response.statusText}`
          );
        }

        // Fetch new messages (to get any automatic replies)
        setTimeout(() => {
          this.loadMessages();
        }, 1000);
      } catch (error) {
        console.error("Error sending message:", error);
        // Add error message to UI
        this.addMessage({
          senderType: "system",
          content:
            "Не удалось отправить сообщение. Пожалуйста, попробуйте еще раз.",
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Функция для безопасной санитизации контента
    sanitizeContent(content) {
      // Ограничиваем длину сообщения до 1000 символов
      if (content.length > 1000) {
        content = content.substring(0, 1000);
      }

      // Всегда экранируем HTML-теги для отображения как обычный текст
      return content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    async loadMessages() {
      if (this.isLoadingMessages) return;

      try {
        this.isLoadingMessages = true;

        const url = `${baseUrl}/api/channels/${this.channelId}/widget/messages?visitorId=${this.visitorId}&limit=50`;
        const response = await fetch(url);
        let data;

        if (!response.ok) {
          console.error(
            `[WIDGET LOAD] Ошибка при загрузке сообщений: ${response.status} ${response.statusText}`
          );

          // Если возникла ошибка, попробуем загрузить через диалоги (fallback)
          console.log(
            `[WIDGET LOAD] Попытка загрузки через API диалогов (fallback)`
          );
          try {
            // Пытаемся получить сообщения через альтернативный API
            const backupUrl = `${baseUrl}/api/channels/${this.channelId}/dialogs/${this.visitorId}/messages`;
            const backupResponse = await fetch(backupUrl);

            if (backupResponse.ok) {
              const backupData = await backupResponse.json();
              // Используем данные из резервного источника
              this.messages = backupData || [];
              this.hasMoreMessages = false;

              // Обновляем UI
              this.renderMessages(this.messages, false);
              return;
            } else {
              throw new Error(
                `Ошибка при загрузке через резервный API: ${backupResponse.status}`
              );
            }
          } catch (backupError) {
            console.error(
              `[WIDGET LOAD] Ошибка при получении сообщений через API диалогов:`,
              backupError
            );
          }
        } else {
          data = await response.json();
        }

        // Обрабатываем данные из основного источника
        if (data && data.messages) {
          this.messages = data.messages || [];
          this.hasMoreMessages = data.hasMore || false;
          // Update UI
          this.renderMessages(this.messages, false);

          // Check if we need to show the "load more" button
          if (this.hasMoreMessages) {
            this.loadMoreButton.classList.add("visible");
          } else {
            this.loadMoreButton.classList.remove("visible");
          }

          // Reset page counter
          this.page = 1;
        } else {
          console.log(
            `[WIDGET LOAD] Не удалось получить сообщения из основного источника`
          );
          this.messages = [];
          this.hasMoreMessages = false;
          this.loadMoreButton.classList.remove("visible");
          this.page = 1;
        }
      } catch (error) {
        console.error("[WIDGET LOAD] Ошибка при загрузке сообщений:", error);
        this.messages = [];
        this.hasMoreMessages = false;
        this.loadMoreButton.classList.remove("visible");
      } finally {
        this.isLoadingMessages = false;
      }
    }

    async loadMoreMessages() {
      if (this.isLoadingMessages || !this.hasMoreMessages) return;

      try {
        this.isLoadingMessages = true;
        this.loadMoreButton.textContent = "Загрузка...";

        const nextPage = this.page + 1;
        const response = await fetch(
          `${baseUrl}/api/channels/${this.channelId}/widget/messages?visitorId=${this.visitorId}&page=${nextPage}&limit=20`
        );

        if (!response.ok) {
          console.error(
            `[WIDGET LOAD MORE] Ошибка при загрузке сообщений: ${response.status} ${response.statusText}`
          );
          throw new Error("Не удалось загрузить дополнительные сообщения");
        }

        const data = await response.json();
        const oldMessages = data.messages || [];
        this.hasMoreMessages = data.hasMore || false;

        console.log(
          `[WIDGET LOAD MORE] Получено ${oldMessages.length} сообщений, hasMore=${this.hasMoreMessages}`
        );

        if (oldMessages.length > 0) {
          // Сначала сортируем по времени, чтобы добавить в правильном порядке
          const sortedOldMessages = [...oldMessages].sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeA - timeB;
          });

          // Добавляем сообщения в текущий список
          this.messages = [...sortedOldMessages, ...this.messages];

          // Update UI - заново отрисовываем все сообщения для сохранения правильного порядка
          this.renderMessages(this.messages, false);
        }

        // Check if we need to show the "load more" button
        if (this.hasMoreMessages) {
          this.loadMoreButton.classList.add("visible");
          this.loadMoreButton.textContent = "Загрузить больше";
        } else {
          this.loadMoreButton.classList.remove("visible");
        }

        // Increment page counter
        this.page = nextPage;
      } catch (error) {
        console.error(
          "[WIDGET LOAD MORE] Ошибка при загрузке сообщений:",
          error
        );
        this.loadMoreButton.textContent = "Попробовать снова";
      } finally {
        this.isLoadingMessages = false;
      }
    }

    renderMessages(messages, append = true) {
      if (!append) {
        this.messagesContainer.innerHTML = "";
      }

      const fragment = document.createDocumentFragment();

      // Сортируем по timestamp, чтобы вывести сообщения в хронологическом порядке
      const sortedMessages = [...messages].sort((a, b) => {
        // Проверка на валидность timestamp
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeA - timeB;
      });

      sortedMessages.forEach((message) => {
        const isUser = message.senderType === "user";
        const isAssistant = message.senderType === "assistant";
        const isOperator =
          message.senderType === "operator" || message.senderType === "system";

        // Format the timestamp
        const date = new Date(message.timestamp);
        const timeString = date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const dateString = date.toLocaleDateString();

        // Безопасное содержимое сообщения
        const safeContent =
          typeof message.content === "string"
            ? this.sanitizeContent(message.content)
            : "";

        const messageElement = document.createElement("div");
        messageElement.classList.add("AiTwin-chat-message");
        messageElement.classList.add(
          isUser ? "AiTwin-chat-message-user" : "AiTwin-chat-message-operator"
        );
        messageElement.innerHTML = `
          ${safeContent}
          <span class="AiTwin-chat-message-time">${timeString}, ${dateString}</span>
        `;

        fragment.appendChild(messageElement);
      });

      if (append) {
        // Для загрузки старых сообщений или начальной загрузки - добавляем в контейнер
        this.messagesContainer.appendChild(fragment);
      } else {
        // Для новых сообщений - заменяем весь контент
        this.messagesContainer.innerHTML = "";
        this.messagesContainer.appendChild(fragment);
      }

      // Прокручиваем к последнему сообщению после загрузки
      this.scrollToBottom();
    }

    addMessage(message, shouldScroll = true) {
      // Format the timestamp
      const date = new Date(message.timestamp);
      const timeString = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const dateString = date.toLocaleDateString();

      const isUser = message.senderType === "user";

      // Убедимся, что содержимое сообщения безопасно
      const safeContent =
        typeof message.content === "string"
          ? this.sanitizeContent(message.content)
          : "";

      const messageElement = document.createElement("div");
      messageElement.classList.add("AiTwin-chat-message");
      messageElement.classList.add(
        isUser ? "AiTwin-chat-message-user" : "AiTwin-chat-message-operator"
      );
      messageElement.innerHTML = `
        ${safeContent}
        <span class="AiTwin-chat-message-time">${timeString}, ${dateString}</span>
      `;

      // Добавляем сообщение в конец контейнера (хронологический порядок)
      this.messagesContainer.appendChild(messageElement);

      // Scroll to bottom if needed
      if (shouldScroll) {
        this.scrollToBottom();
      }

      // If it's a new message from the operator and the chat is not open, increment unread count
      if (!isUser && !this.isOpen) {
        this.unreadCount++;
        this.updateUnreadBadge();

        // Animate the chat button
        this.chatButton.classList.add("AiTwin-bounce");
        setTimeout(() => {
          this.chatButton.classList.remove("AiTwin-bounce");
        }, 500);
      }
    }

    scrollToBottom() {
      // Прокрутка вниз к последнему сообщению
      const messagesWrapper = this.chatElement.querySelector(
        ".AiTwin-chat-messages"
      );
      messagesWrapper.scrollTop = messagesWrapper.scrollHeight;
    }

    getVisitorId() {
      // Check if we already have a visitor ID stored
      let visitorId = localStorage.getItem("AiTwin-visitor-id");

      console.log(
        `[WIDGET INIT] Проверка ID посетителя в localStorage: ${
          visitorId ? "найден" : "не найден"
        }`
      );

      // If not, generate a new one
      if (!visitorId) {
        visitorId = this.generateUUID();
        localStorage.setItem("AiTwin-visitor-id", visitorId);
        console.log(`[WIDGET INIT] Создан новый ID посетителя: ${visitorId}`);
      } else {
        console.log(
          `[WIDGET INIT] Использую существующий ID посетителя: ${visitorId}`
        );
      }

      return visitorId;
    }

    generateUUID() {
      // Simple UUID v4 generator
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }
      );
    }

    updateUnreadBadge() {
      if (this.unreadCount > 0) {
        this.messageBadge.textContent =
          this.unreadCount > 99 ? "99+" : this.unreadCount;
        this.messageBadge.classList.add("has-unread");
      } else {
        this.messageBadge.classList.remove("has-unread");
      }
    }

    async checkUnreadMessages() {
      try {
        const response = await fetch(
          `${baseUrl}/api/channels/${this.channelId}/widget/unread?visitorId=${this.visitorId}`
        );

        if (!response.ok) {
          throw new Error("Failed to check unread messages");
        }

        const data = await response.json();
        const unreadCount = data.count || 0;

        // If there are new messages since our last check, load all messages
        if (unreadCount > 0) {
          this.unreadCount = unreadCount;
          this.updateUnreadBadge();

          // Animate the chat button only if chat is closed
          if (!this.isOpen) {
            this.chatButton.classList.add("AiTwin-bounce");
            setTimeout(() => {
              this.chatButton.classList.remove("AiTwin-bounce");
            }, 500);
          }

          // Reload messages in the background
          this.loadMessages();
        }
      } catch (error) {
        console.error("Error checking unread messages:", error);
      }
    }
  }

  // Expose the main function to global scope
  window.chatInit = function (channelId, config = {}) {
    return new AstistoChat(channelId, config);
  };
})();
