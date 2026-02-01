// AI聊天悬浮组件
class AIChatWidget {
  constructor() {
    this.chatContainer = null;
    this.chatButton = null;
    this.chatMessages = null;
    this.chatInput = null;
    this.sendButton = null;
    this.isOpen = false;
    this.init();
  }

  init() {
    this.createChatWidget();
    this.bindEvents();
  }

  createChatWidget() {
    // 创建聊天容器
    this.chatContainer = document.createElement('div');
    this.chatContainer.id = 'ai-chat-container';
    this.chatContainer.className = 'ai-chat-container';
    
    // 创建聊天按钮
    this.chatButton = document.createElement('button');
    this.chatButton.id = 'ai-chat-button';
    this.chatButton.className = 'ai-chat-button';
    this.chatButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    
    // 创建聊天窗口
    const chatWindow = document.createElement('div');
    chatWindow.id = 'ai-chat-window';
    chatWindow.className = 'ai-chat-window';
    
    // 创建聊天头部
    const chatHeader = document.createElement('div');
    chatHeader.className = 'ai-chat-header';
    chatHeader.innerHTML = '<h3>AI 助手</h3><button id="ai-chat-close" class="ai-chat-close">&times;</button>';
    
    // 创建聊天消息区域
    this.chatMessages = document.createElement('div');
    this.chatMessages.className = 'ai-chat-messages';
    
    // 创建欢迎消息
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'ai-chat-message ai-message';
    welcomeMessage.innerHTML = '<div class="ai-chat-avatar">🤖</div><div class="ai-chat-content">你好！我是AI助手，有什么可以帮助你的吗？</div>';
    this.chatMessages.appendChild(welcomeMessage);
    
    // 创建聊天输入区域
    const chatInputArea = document.createElement('div');
    chatInputArea.className = 'ai-chat-input-area';
    
    this.chatInput = document.createElement('input');
    this.chatInput.id = 'ai-chat-input';
    this.chatInput.className = 'ai-chat-input';
    this.chatInput.type = 'text';
    this.chatInput.placeholder = '输入你的问题...';
    
    this.sendButton = document.createElement('button');
    this.sendButton.id = 'ai-chat-send';
    this.sendButton.className = 'ai-chat-send';
    this.sendButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
    
    chatInputArea.appendChild(this.chatInput);
    chatInputArea.appendChild(this.sendButton);
    
    // 组装聊天窗口
    chatWindow.appendChild(chatHeader);
    chatWindow.appendChild(this.chatMessages);
    chatWindow.appendChild(chatInputArea);
    
    // 组装聊天容器
    this.chatContainer.appendChild(this.chatButton);
    this.chatContainer.appendChild(chatWindow);
    
    // 添加到页面
    document.body.appendChild(this.chatContainer);
    
    // 添加CSS样式
    this.addStyles();
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* AI聊天悬浮组件样式 */
      .ai-chat-container {
        position: fixed;
        bottom: 30px;
        right: 30px;
        z-index: 9999;
      }
      
      .ai-chat-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: #4CAF50;
        color: white;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }
      
      .ai-chat-button:hover {
        background-color: #45a049;
        transform: scale(1.1);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
      }
      
      .ai-chat-window {
        position: absolute;
        bottom: 70px;
        right: 0;
        width: 350px;
        height: 450px;
        background-color: white;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        display: none;
        flex-direction: column;
        overflow: hidden;
      }
      
      .ai-chat-window.open {
        display: flex;
      }
      
      .ai-chat-header {
        background-color: #4CAF50;
        color: white;
        padding: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .ai-chat-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      .ai-chat-close {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .ai-chat-messages {
        flex: 1;
        padding: 15px;
        overflow-y: auto;
        background-color: #f9f9f9;
      }
      
      .ai-chat-message {
        margin-bottom: 15px;
        display: flex;
        align-items: flex-start;
      }
      
      .ai-chat-avatar {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background-color: #e0e0e0;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 10px;
        font-size: 16px;
      }
      
      .user-message .ai-chat-avatar {
        background-color: #4CAF50;
        color: white;
        order: 2;
        margin-right: 0;
        margin-left: 10px;
      }
      
      .ai-chat-content {
        flex: 1;
        background-color: white;
        color: #333333;
        padding: 10px 15px;
        border-radius: 18px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        max-width: 80%;
      }
      
      .user-message .ai-chat-content {
        background-color: #4CAF50;
        color: white;
        order: 1;
        align-self: flex-end;
      }
      
      .ai-chat-input-area {
        display: flex;
        padding: 10px;
        border-top: 1px solid #e0e0e0;
        background-color: white;
      }
      
      .ai-chat-input {
        flex: 1;
        padding: 10px 15px;
        border: 1px solid #e0e0e0;
        border-radius: 20px;
        margin-right: 10px;
        outline: none;
        font-size: 14px;
      }
      
      .ai-chat-input:focus {
        border-color: #4CAF50;
      }
      
      .ai-chat-send {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: #4CAF50;
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .ai-chat-send:hover {
        background-color: #45a049;
      }
      
      .ai-chat-send:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
      }
      
      /* 滚动条样式 */
      .ai-chat-messages::-webkit-scrollbar {
        width: 6px;
      }
      
      .ai-chat-messages::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }
      
      .ai-chat-messages::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
      }
      
      .ai-chat-messages::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }
    `;
    document.head.appendChild(style);
  }

  bindEvents() {
    // 打开/关闭聊天窗口
    this.chatButton.addEventListener('click', () => {
      this.toggleChatWindow();
    });
    
    // 关闭按钮
    const closeButton = document.getElementById('ai-chat-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.closeChatWindow();
      });
    }
    
    // 发送按钮
    this.sendButton.addEventListener('click', () => {
      this.sendMessage();
    });
    
    // 输入框回车发送
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });
  }

  toggleChatWindow() {
    const chatWindow = document.getElementById('ai-chat-window');
    if (chatWindow) {
      if (this.isOpen) {
        this.closeChatWindow();
      } else {
        this.openChatWindow();
      }
    }
  }

  openChatWindow() {
    const chatWindow = document.getElementById('ai-chat-window');
    if (chatWindow) {
      chatWindow.classList.add('open');
      this.isOpen = true;
      // 滚动到底部
      this.scrollToBottom();
    }
  }

  closeChatWindow() {
    const chatWindow = document.getElementById('ai-chat-window');
    if (chatWindow) {
      chatWindow.classList.remove('open');
      this.isOpen = false;
    }
  }

  sendMessage() {
    const message = this.chatInput.value.trim();
    if (message) {
      // 添加用户消息到聊天窗口
      this.addMessage('user', message);
      
      // 清空输入框
      this.chatInput.value = '';
      
      // 禁用发送按钮和输入框
      this.sendButton.disabled = true;
      this.chatInput.disabled = true;
      
      // 显示正在输入状态
      this.showTypingIndicator();
      
      // 发送消息到AI API
      this.fetchAIResponse(message);
    }
  }

  addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-chat-message ${role === 'user' ? 'user-message' : 'ai-message'}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'ai-chat-avatar';
    avatar.textContent = role === 'user' ? '👤' : '🤖';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'ai-chat-content';
    messageContent.textContent = content;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    this.chatMessages.appendChild(messageDiv);
    
    // 滚动到底部
    this.scrollToBottom();
  }

  showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.id = 'ai-chat-typing';
    typingDiv.className = 'ai-chat-message ai-message';
    typingDiv.innerHTML = '<div class="ai-chat-avatar">🤖</div><div class="ai-chat-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>';
    
    // 添加打字动画样式
    const style = document.createElement('style');
    style.textContent = `
      .typing-indicator {
        display: flex;
        align-items: center;
      }
      
      .typing-indicator span {
        width: 8px;
        height: 8px;
        background-color: #4CAF50;
        border-radius: 50%;
        margin: 0 2px;
        animation: typing 1.4s infinite ease-in-out both;
      }
      
      .typing-indicator span:nth-child(1) {
        animation-delay: -0.32s;
      }
      
      .typing-indicator span:nth-child(2) {
        animation-delay: -0.16s;
      }
      
      @keyframes typing {
        0%, 80%, 100% {
          transform: scale(0);
        }
        40% {
          transform: scale(1);
        }
      }
    `;
    document.head.appendChild(style);
    
    this.chatMessages.appendChild(typingDiv);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    const typingDiv = document.getElementById('ai-chat-typing');
    if (typingDiv) {
      typingDiv.remove();
    }
  }

  async fetchAIResponse(message) {
    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gemma3',
          messages: [
            {
              role: 'system',
              content: '你是一个专门为Node.js Web应用设计的AI助手。这个应用是一个基于Express.js的CS:GO论坛系统，详细信息如下：\n\n**技术栈：**\n- Node.js + Express.js 5.1.0\n- MySQL数据库 (mysql2)\n- 认证：bcrypt + JSON Web Token\n- 文件上传：multer (支持视频和头像上传)\n- 邮件服务：nodemailer\n- 其他：cors, dotenv, morgan\n\n**主要功能：**\n1. **用户管理**：\n   - 注册/登录/登出\n   - 头像上传\n   - 用户信息管理\n   - 在线用户统计\n\n2. **帖子管理**：\n   - 视频上传（支持MP4、WebM格式，最大50MB）\n   - 帖子创建、编辑、删除\n   - 帖子列表和详情\n\n3. **地图信息**：\n   - CS:GO地图信息管理\n   - 地图图片和视频\n\n4. **位置信息**：\n   - 游戏位置标记和管理\n\n5. **搜索功能**：\n   - 帖子和用户搜索\n\n6. **管理员功能**：\n   - 帖子审核\n   - 用户管理\n   - 系统管理\n\n**API端点：**\n- /api/register - 用户注册\n- /api/login - 用户登录\n- /api/users - 用户相关操作\n- /api/logout - 用户登出\n- /api/posts - 帖子相关操作\n- /api/stats - 统计信息\n- /api/mapinfo - 地图信息\n- /api/position - 位置信息\n- /api/search - 搜索功能\n- /api/manager - 管理员功能\n\n**项目结构：**\n- routes/ - 路由文件\n- config/ - 配置文件（如数据库连接）\n- middleware/ - 中间件（如错误处理）\n- model/ - 数据模型和SQL文件\n- services/ - 服务（如邮件服务）\n- view/ - 视图文件（HTML）\n- uploads/ - 上传文件（视频、头像）\n- assets/ - 静态资源（JS、图片、地图）\n\n**访问链接：** http://localhost:3000\n\n请根据这些详细信息回答用户的问题，帮助用户了解和使用这个CS:GO论坛应用。'
            },
            {
              role: 'user',
              content: message
            }
          ]
        })
      });
      
      if (!response.ok) {
        throw new Error('API请求失败');
      }
      
      // 读取响应作为文本（ndjson格式）
      const text = await response.text();
      
      // 隐藏正在输入状态
      this.hideTypingIndicator();
      
      // 按行分割并解析JSON
      const lines = text.trim().split('\n');
      let fullContent = '';
      
      for (const line of lines) {
        if (line) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message && parsed.message.content) {
              fullContent += parsed.message.content;
            }
          } catch (e) {
            console.error('解析JSON行失败:', e);
          }
        }
      }
      
      // 添加AI回复到聊天窗口
      if (fullContent) {
        this.addMessage('ai', fullContent);
      } else {
        this.addMessage('ai', '抱歉，我无法理解你的问题，请尝试重新表述。');
      }
    } catch (error) {
      console.error('AI聊天错误:', error);
      
      // 隐藏正在输入状态
      this.hideTypingIndicator();
      
      // 显示错误消息
      this.addMessage('ai', '抱歉，AI服务暂时不可用，请稍后再试。');
    } finally {
      // 启用发送按钮和输入框
      this.sendButton.disabled = false;
      this.chatInput.disabled = false;
      // 聚焦输入框
      this.chatInput.focus();
    }
  }

  scrollToBottom() {
    if (this.chatMessages) {
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
  }
}

// 初始化AI聊天组件
document.addEventListener('DOMContentLoaded', () => {
  new AIChatWidget();
});