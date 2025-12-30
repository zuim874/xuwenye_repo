# CS2 Utility Guide - 用户内容管理系统

一个基于 Node.js + Express + MySQL 的 CS2（Counter-Strike 2）实用工具指南平台，提供用户管理、帖子发布、社区互动和地图点位管理等功能。

## 🚀 项目特色

- **用户认证系统** - 安全的注册/登录/密码重置流程
- **内容管理** - 帖子发布、编辑、删除、视频上传功能
- **内容审核机制** - 帖子需经审核通过（status=1）才能对外展示
- **社区互动** - 点赞、收藏、评论系统
- **个人中心** - 用户资料管理、发布内容统计
- **地图点位管理** - CS2 游戏地图点位展示与筛选
- **文件上传** - 支持头像和视频内容上传
- **响应式设计** - 适配桌面和移动设备

## 📁 项目结构

```
xuwenye_repo/
├── assets/                 # 静态资源
│   ├── map_view/          # 地图视图图片
│   ├── maps/              # 地图素材
│   └── videos/            # 用户上传视频
├── routes/                # 路由文件
│   ├── login.js           # 登录路由
│   ├── logout.js          # 登出路由
│   ├── manager.js         # 管理功能路由
│   ├── mapinfo.js         # 地图信息路由
│   ├── position.js        # 点位管理路由
│   ├── postRoutes.js      # 帖子相关路由
│   ├── register.js        # 注册路由
│   ├── search.js          # 搜索路由
│   ├── statsRoutes.js     # 统计数据路由
│   └── user.js            # 用户相关路由
├── uploads/               # 上传文件目录
│   ├── avatar/            # 用户头像
│   └── videos/            # 帖子视频
├── config/                # 配置文件
│   └── db.js              # 数据库配置
├── model/                 # 数据模型相关
│   ├── database_initialization.sql # 数据库初始化脚本
│   ├── post.sql           # 帖子表结构
│   ├── user.sql           # 用户表结构
│   └── ...                # 其他表结构文件
├── view/                  # 前端页面
├── .env                   # 环境变量配置
├── app.js                 # Express 应用主文件
├── package.json           # 项目依赖
└── README.md              # 项目说明文档
```

## 🛠️ 技术栈

### 后端技术
- **Node.js** - 运行时环境
- **Express.js** - Web 应用框架
- **MySQL** - 关系型数据库
- **MySQL2** - MySQL 客户端，支持 Promise
- **Multer** - 文件上传处理
- **bcrypt** - 密码加密
- **jsonwebtoken** - 身份认证
- **morgan** - 请求日志中间件
- **cors** - 跨域资源共享
- **dotenv** - 环境变量管理

### 前端技术
- **HTML5** - 页面结构
- **CSS3** - 样式设计（响应式布局）
- **JavaScript** - 交互逻辑
- **Fetch API** - 前后端通信

## 📋 核心功能

### 用户管理
- ✅ 用户注册与登录
- ✅ 邮箱验证系统
- ✅ 密码重置功能
- ✅ 个人资料编辑
- ✅ 头像上传设置
- ✅ 账户注销功能

### 内容管理
- ✅ 帖子发布（支持文字+视频）
- ✅ 帖子编辑与删除
- ✅ 内容标签分类
- ✅ 内容审核机制（status字段控制）
- ✅ 仅展示审核通过的帖子（status=1）

### 社区功能
- ✅ 点赞系统
- ✅ 收藏功能
- ✅ 评论系统
- ✅ 用户内容统计（仅统计审核通过的帖子）

### 地图点位
- ✅ 游戏地图点位展示
- ✅ 点位类型筛选（高爆手雷、闪光弹等）
- ✅ 点位详细信息查看

## 🚀 快速开始

### 环境要求
- Node.js 14.0+
- MySQL 5.7+
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/zuim874/xuwenye_repo.git
cd xuwenye_repo
```

2. **安装依赖**
```bash
npm install
```

3. **数据库配置**
   - 创建数据库
   ```sql
   CREATE DATABASE IF NOT EXISTS `cs2_utility` 
   DEFAULT CHARACTER SET utf8mb4 
   COLLATE utf8mb4_unicode_ci;
   ```
   - 执行初始化脚本
   ```bash
   # 使用MySQL命令行执行初始化脚本
   mysql -u root -p cs2_utility < model/database_initialization.sql
   ```

4. **环境变量配置**
创建 `.env` 文件：
```env
# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=cs2_utility
DB_CONN_LIMIT=20

# 应用配置
PORT=3000
JWT_SECRET=your_jwt_secret_key
```

5. **启动服务**
```bash
# 开发模式
node app.js

# 或使用 nodemon
nodemon app.js
```

6. **访问应用**
打开浏览器访问：`http://localhost:3000`

## 📊 数据模型

### 用户表 (users)
| 字段 | 类型 | 描述 |
|------|------|------|
| id | INT UNSIGNED | 用户ID |
| username | VARCHAR(20) | 用户名 |
| email | VARCHAR(255) | 邮箱 |
| password_hash | VARCHAR(100) | 密码哈希 |
| avatar | VARCHAR(255) | 头像URL |
| user_power | TINYINT(1) | 用户权限（0:管理员, 1:普通用户, 2:封禁用户） |
| is_online | TINYINT(1) | 是否在线 |
| last_login | TIMESTAMP | 最后登录时间 |
| last_active | TIMESTAMP | 最后活跃时间 |
| created_at | TIMESTAMP | 创建时间 |

### 帖子表 (posts)
| 字段 | 类型 | 描述 |
|------|------|------|
| id | INT UNSIGNED | 帖子ID |
| user_id | INT UNSIGNED | 作者ID |
| title | VARCHAR(255) | 标题 |
| content | TEXT | 内容 |
| tags | VARCHAR(100) | 标签 |
| video_url | VARCHAR(255) | 视频URL |
| like_count | INT UNSIGNED | 点赞数 |
| comment_count | INT UNSIGNED | 评论数 |
| view_count | INT UNSIGNED | 浏览量 |
| status | TINYINT | 状态（0:待审核, 1:已通过, 2:已拒绝） |
| is_deleted | TINYINT | 是否已删除 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 其他表
- **post_likes**: 点赞记录
- **post_favorites**: 收藏记录
- **comments**: 评论表
- **nade_spots**: 道具点位表
- **maps**: 地图基础表
- **daily_views**: 每日浏览量统计表

## 🔐 API 接口文档

### 用户相关接口
- **POST /api/register** - 用户注册
- **POST /api/login** - 用户登录
- **POST /api/logout** - 用户登出
- **GET /api/users/:id** - 获取用户信息
- **PUT /api/users/:id** - 更新用户信息
- **GET /api/users/online_users** - 获取在线用户列表
- **POST /api/users/:id/send-delete-verification** - 发送注销账户验证码
- **POST /api/users/:id/verify-and-delete** - 验证注销验证码并执行注销
- **GET /api/users/:id/posts** - 获取用户发布的帖子（仅审核通过）
- **GET /api/users/:id/public-posts** - 获取用户公开帖子（仅审核通过）

### 帖子相关接口
- **GET /api/posts** - 获取帖子列表（仅审核通过）
- **POST /api/posts/create** - 创建新帖子
- **GET /api/posts/:id** - 获取帖子详情
- **POST /api/posts/:id/like** - 点赞/取消点赞帖子
- **POST /api/posts/:id/favorite** - 收藏/取消收藏帖子
- **POST /api/posts/:id/view** - 增加帖子浏览量
- **GET /api/posts/:id/comments** - 获取帖子评论
- **POST /api/posts/:id/comments** - 发表评论
- **DELETE /api/posts/:postId/comments/:commentId** - 删除评论

### 地图点位接口
- **GET /api/position/spots** - 获取点位列表
- **POST /api/position/spots** - 创建点位
- **GET /api/mapinfo** - 获取地图信息

### 管理相关接口
- **GET /api/manager/posts** - 获取管理后台帖子列表
- **PUT /api/manager/posts/:id/status** - 更新帖子状态

## 🎯 使用指南

### 用户注册
1. 访问注册页面，填写用户名、邮箱、密码
2. 接收邮箱验证码完成验证
3. 设置个人资料和头像

### 发布内容
1. 登录后点击"发布新帖子"
2. 填写标题、内容、选择标签
3. 可上传相关视频文件（MP4、WebM格式，最大50MB）
4. 发布后等待审核通过（status=1）

### 社区互动
1. 浏览其他用户发布的已审核帖子
2. 点赞、收藏感兴趣的内容
3. 发表评论参与讨论
4. 查看用户个人资料和统计数据（仅包含审核通过的帖子）

### 地图点位
1. 浏览CS2游戏地图
2. 选择不同类型的点位（高爆手雷、闪光弹等）
3. 查看点位详细信息和视频演示

## 🔧 开发说明

### 代码规范
- 使用标准的JavaScript语法
- 遵循RESTful API设计规范
- 数据库操作使用参数化查询防止SQL注入
- 密码使用bcrypt进行加密存储
- 所有API接口返回统一的JSON格式

### 安全措施
- 实现JWT身份认证
- 防止XSS攻击
- 密码加密存储
- 邮箱验证机制
- 内容审核系统
- 权限验证（用户只能操作自己的内容）

### 文件上传配置
- 头像上传：最大5MB，支持JPG、PNG、GIF、WebP格式
- 视频上传：最大50MB，支持MP4、WebM格式

## 📁 关键目录说明

### routes/
包含所有API路由实现，按功能模块划分：
- `user.js`: 用户管理相关接口
- `postRoutes.js`: 帖子管理相关接口
- `position.js`: 地图点位相关接口
- `mapinfo.js`: 地图信息相关接口
- `login.js`, `register.js`: 认证相关接口

### assets/
存放静态资源文件：
- `map_view/`: 地图视图图片
- `maps/`: 地图素材
- `videos/`: 示例视频文件

### uploads/
存放用户上传的文件：
- `avatar/`: 用户头像文件
- `videos/`: 用户上传的帖子视频

### view/
存放前端HTML页面文件，按功能模块组织：
- `account/`: 用户账户相关页面
- `manager/`: 管理后台页面
- 根目录下为主要功能页面

## 🤝 贡献指南

我们欢迎任何形式的贡献！

### 提交问题
发现bug或有新功能建议，请在GitHub Issues中提交。

### 提交代码
1. Fork本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 LICENSE 文件了解详情。

## 👥 开发团队

- **zuim874** - 项目发起者和主要开发者
- **kkkuiu1215** - 后端开发
- **YSF-YYDS** - 前端开发
- **Hanzhinan** - 测试和文档

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

## 📞 联系我们

- 项目主页：https://github.com/zuim874/xuwenye_repo
- 问题反馈：https://github.com/zuim874/xuwenye_repo/issues
- 邮箱联系：zuim874@github.com

⭐ 如果这个项目对你有帮助，请给个Star支持一下！