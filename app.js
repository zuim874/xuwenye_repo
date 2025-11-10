// app.js
require('dotenv').config(); // 新增：从 .env 读取配置

const express = require('express');
const cors = require('cors');
const expressJson = require('express').json; // 解析JSON请求体
const registerRouter = require('./routes/register'); // 注册路由（后续创建）
const loginRouter = require('./routes/login'); // 登录路由（后续创建）
const { errorHandler } = require('./middleware/errorHandler'); // 全局错误处理（后续创建）
const path = require('path');
// 1. 创建 Express 实例
const app = express();

// 2. 注册全局中间件（所有请求都会经过）
app.use(cors()); // 允许跨域（前端能调用后端接口）
app.use(expressJson()); // 解析前端传递的 JSON 数据（如注册时的用户名/密码）
app.use(express.urlencoded({ extended: true })); // 兼容表单提交（可选，防止漏解析）
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 静态文件托管：把 view 目录作为静态资源目录，浏览器可直接访问 html/css/js
app.use(express.static(path.join(__dirname, 'view')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

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

// 4. 全局错误处理中间件（统一捕获所有接口的错误）
app.use(errorHandler);

// 5. 导出 app 实例（供 server.js 启动服务器）
module.exports = app;