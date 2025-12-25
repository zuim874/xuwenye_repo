CS2 Utility Guide - 用户内容管理系统

一个基于 Node.js + Express + MySQL 的 CS2 实用工具指南平台，提供用户管理、帖子发布、社区互动等功能。

🚀 项目特色

• 用户认证系统 - 安全的注册/登录/密码重置流程

• 内容管理 - 帖子发布、编辑、删除、点赞收藏

• 社区互动 - 评论系统、用户关注、在线状态

• 文件上传 - 支持头像、视频内容上传

• 安全防护 - 邮箱验证、权限控制、XSS防护

• 响应式设计 - 适配桌面和移动设备

📁 项目结构


xuwenye_repo/
├── config/                 # 配置文件
│   └── db.js              # 数据库配置
├── middleware/            # 中间件
│   ├── auth.js           # 认证中间件
│   └── upload.js         # 文件上传中间件
├── model/                 # 数据模型
│   ├── users.js          # 用户模型
│   └── posts.js          # 帖子模型
├── routes/               # 路由文件
│   ├── users.js          # 用户相关路由
│   └── posts.js          # 帖子相关路由
├── services/             # 业务逻辑
│   └── emailService.js   # 邮件服务
├── view/                 # 前端页面
│   ├── account/          # 账户相关页面
│   ├── community/        # 社区页面
│   └── myinfo/           # 个人中心
├── uploads/              # 上传文件目录
│   ├── avatar/           # 用户头像
│   └── videos/           # 帖子视频
├── app.js                # Express应用主文件
└── package.json          # 项目依赖


🛠️ 技术栈

后端技术

• Node.js - 运行时环境

• Express.js - Web应用框架

• MySQL - 关系型数据库

• bcrypt - 密码加密

• JWT - 身份认证

• Multer - 文件上传处理

• Nodemailer - 邮件服务

前端技术

• HTML5 - 页面结构

• CSS3 - 样式设计（响应式布局）

• JavaScript - 交互逻辑

• Fetch API - 前后端通信

📋 功能特性

用户管理

• ✅ 用户注册/登录/登出

• ✅ 邮箱验证系统

• ✅ 密码重置功能

• ✅ 个人资料编辑

• ✅ 头像上传设置

• ✅ 账户安全设置

内容管理

• ✅ 帖子发布（文字+视频）

• ✅ 帖子编辑/删除

• ✅ 内容标签分类

• ✅ 点赞/收藏系统

• ✅ 评论功能

• ✅ 内容搜索筛选

社区功能

• ✅ 用户关注系统

• ✅ 在线用户显示

• ✅ 消息通知

• ✅ 内容分享

• ✅ 热门内容推荐

🚀 快速开始

环境要求

• Node.js 14.0+

• MySQL 5.7+

• npm 或 yarn

安装步骤

1. 克隆项目
git clone https://github.com/zuim874/xuwenye_repo.git
cd xuwenye_repo


2. 安装依赖
npm install


3. 数据库配置
-- 创建数据库
CREATE DATABASE cs2_utility;

-- 导入数据表结构（详见 model/ 目录）


4. 环境变量配置
创建 .env 文件：
# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=cs2_utility

# 邮件服务配置
EMAIL_USER=your_email@qq.com
EMAIL_PASS=your_email_auth_code

# 应用配置
PORT=3000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret_key


5. 启动服务
# 开发模式
npm run dev

# 生产模式
npm start


6. 访问应用
打开浏览器访问：http://localhost:3000

📊 数据库设计

主要数据表

用户表 (users)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP,
    is_online BOOLEAN DEFAULT FALSE
);


帖子表 (posts)
CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    tags VARCHAR(100),
    video_url VARCHAR(500),
    view_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);


🔐 API 接口文档

用户相关接口

• POST /api/register - 用户注册

• POST /api/login - 用户登录  

• GET /api/users/:id - 获取用户信息

• PUT /api/users/:id - 更新用户信息

• POST /api/forgot-password - 忘记密码

帖子相关接口

• GET /api/posts - 获取帖子列表

• POST /api/posts - 创建新帖子

• GET /api/posts/:id - 获取帖子详情

• PUT /api/posts/:id - 更新帖子

• DELETE /api/posts/:id - 删除帖子

完整API文档

详见 ./docs/API.md

🎯 使用指南

用户注册

1. 访问注册页面，填写用户名、邮箱、密码
2. 接收邮箱验证码完成验证
3. 设置个人资料和头像

发布内容

1. 登录后点击"发布新帖子"
2. 填写标题、内容、选择标签
3. 可上传相关视频文件
4. 发布后可在个人中心管理

社区互动

1. 浏览其他用户发布的帖子
2. 点赞、收藏感兴趣的内容
3. 发表评论参与讨论
4. 关注优质内容创作者

🔧 开发指南

代码规范

• 使用 ESLint 进行代码检查

• 遵循 JavaScript Standard Style

• 提交信息使用约定式提交

分支管理

• main - 主分支，稳定版本

• develop - 开发分支

• feature/* - 功能开发分支

• hotfix/* - 紧急修复分支

部署说明

# 构建生产版本
npm run build

# 启动生产服务
npm start


🤝 贡献指南

我们欢迎任何形式的贡献！请阅读 ./CONTRIBUTING.md 了解如何参与项目开发。

报告问题

发现 bug 或有新功能建议？请 https://github.com/zuim874/xuwenye_repo/issues。

提交代码

1. Fork 本仓库
2. 创建功能分支 (git checkout -b feature/AmazingFeature)
3. 提交更改 (git commit -m 'Add some AmazingFeature')
4. 推送到分支 (git push origin feature/AmazingFeature)
5. 开启 Pull Request

📄 许可证

本项目采用 MIT 许可证 - 查看 LICENSE 文件了解详情。

👥 开发团队

• zuim874 - 项目发起者和主要开发者

• kkkuiu1215 - 后端开发

• YSF-YYDS - 前端开发  

• Hanzhinan - 测试和文档

🙏 致谢

感谢所有为这个项目做出贡献的开发者！

📞 联系我们

• 项目主页：https://github.com/zuim874/xuwenye_repo

• 问题反馈：https://github.com/zuim874/xuwenye_repo/issues

• 邮箱联系：zuim874@github.com

⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！