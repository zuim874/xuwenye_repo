// app.js
require('dotenv').config(); // 新增：从 .env 读取配置

const express = require('express');
const morgan = require('morgan'); // 引入 morgan
const path = require('path');
const cors = require('cors');
const expressJson = require('express').json; // 解析JSON请求体
const registerRouter = require('./routes/register'); // 注册路由（后续创建）
const loginRouter = require('./routes/login'); // 登录路由（后续创建）
const userRouter = require('./routes/user'); // 用户查询路由（后续创建）
const { errorHandler } = require('./middleware/errorHandler'); // 全局错误处理（后续创建）
const logoutRouter = require('./routes/logout'); // 注销路由
const postRoutes = require('./routes/postRoutes'); // 帖子相关路由
// 1. 创建 Express 实例
const app = express();

app.use(express.json({
  verify: (req, res, buf, encoding) => {
    try {
      req.rawBody = buf.toString(encoding || 'utf8');
    } catch (e) {
      req.rawBody = '<unreadable>';
    }
  }
}));
app.use(express.urlencoded({ extended: false }));

// 记录原始 body（调试用，排查后可删除）
app.use((req, res, next) => {
  if (req.rawBody !== undefined) {
    console.log('[RAW BODY]', req.method, req.originalUrl, req.rawBody);
  }
  next();
});

app.use(morgan('dev'));

// 捕获 JSON parse 错误，优先返回 400，便于调试
app.use((err, req, res, next) => {
  if (err && err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON parse error:', err.message);
    return res.status(400).json({ message: 'Invalid JSON body' });
  }
  next(err);
});

// 静态文件托管：把 view 目录作为静态资源目录，浏览器可直接访问 html/css/js
app.use(express.static(path.join(__dirname, 'view')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// 可选：启用 CORS（当前后端不同端口时需要）
app.use(cors({
  origin: true, // 或填写前端地址如 'http://localhost:8080'
  credentials: true
}));

// 示例：把数据库配置改为从环境变量读取（config/db.js 也应使用 process.env）
/*
process.env.DB_HOST
process.env.DB_USER
process.env.DB_PASSWORD
process.env.DB_NAME
*/

// 3. 注册业务路由（按功能拆分，便于维护）
app.use('/api/register', registerRouter); // 注册接口：/api/register
app.use('/api/login', loginRouter); // 登录接口：/api/login
app.use('/api/users', userRouter); // 查询所有用户接口：GET /api/users
app.use('/api/logout', logoutRouter); // 注销接口：/api/logout
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // 静态托管上传文件目录
app.use('/api/posts', postRoutes); // 帖子相关接口：/api/posts

// 临时测试路由：确认 POST 能被接收
app.post('/api/login-test', (req, res) => {
  console.log('[TEST] /api/login-test body:', req.body);
  res.status(200).json({ ok: true, received: req.body });
});

// 4. 全局错误处理中间件（统一捕获所有接口的错误）
app.use(errorHandler);

// 如果你没有 app.listen，确保添加监听（或检查 server.js）
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));

// 5. 导出 app 实例（供 server.js 启动服务器）
module.exports = app;