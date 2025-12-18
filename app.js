// app.js（合并后，作为项目入口）
require('dotenv').config(); // 加载环境变量

const express = require('express');
const morgan = require('morgan');
const path = require('path');
const cors = require('cors');
const registerRouter = require('./routes/register');
const loginRouter = require('./routes/login');
const userRouter = require('./routes/user');
const { errorHandler } = require('./middleware/errorHandler');
const logoutRouter = require('./routes/logout');
const postRoutes = require('./routes/postRoutes');
const statsRoutes = require('./routes/statsRoutes');

// 创建 Express 实例
const app = express();

// 解析JSON请求体并保留原始body
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

// 记录原始body（调试用，排查后可删除）
app.use((req, res, next) => {
  if (req.rawBody !== undefined) {
    console.log('[RAW BODY]', req.method, req.originalUrl, req.rawBody);
  }
  next();
});

// 日志中间件
app.use(morgan('dev'));

// JSON解析错误处理
app.use((err, req, res, next) => {
  if (err && err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON parse error:', err.message);
    return res.status(400).json({ message: 'Invalid JSON body' });
  }
  next(err);
});

// 静态文件托管
app.use(express.static(path.join(__dirname, 'view')));
app.use('/assets', express.static(path.join(__dirname, 'assets'))); // 去重保留规范路径版本
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CORS配置
app.use(cors({
  origin: true,
  credentials: true
}));

// 业务路由注册
app.use('/api/register', registerRouter);
app.use('/api/login', loginRouter);
app.use('/api/users', userRouter);
app.use('/api/logout', logoutRouter);
app.use('/api/posts', postRoutes);
app.use('/api/stats', statsRoutes);

// 临时测试路由
app.post('/api/login-test', (req, res) => {
  console.log('[TEST] /api/login-test body:', req.body);
  res.status(200).json({ ok: true, received: req.body });
});

// 全局错误处理中间件
app.use(errorHandler);

// 定义端口并启动服务器（整合自server.js）
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`后端服务器已启动：http://localhost:${PORT}`);
});

// 导出app实例（供可能的测试或其他用途）
module.exports = app;