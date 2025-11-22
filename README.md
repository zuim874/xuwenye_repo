本机测试项目：
需使用my sql作为数据库软件
修改config/db.js中的配置文件
    password: process.env.DB_PASSWORD || '884560',
将' '中的密码改成自己数据库的密码
在项目文件夹地址栏输入cmd打开终端，输入node app.js打开服务
win+r输入services.msc找到MYSQL..字样打开服务即可（确保数据库'cs2_utility'存在，数据表存于model）

20251024

20251110
    server.js：仅负责「启动服务器」（监听端口、数据库连接初始化），是项目入口；
    app.js：负责「业务核心配置」（中间件、路由注册、全局错误处理），是 Express 应用的核心。

1. 新增用户（前端→后端→数据库）
前端用户输入用户名、密码、年龄，点击「提交」；
前端通过 Axios 发送 POST 请求，传递 JSON 格式的 UserAddDTO；
后端 Controller 用 @RequestBody 将 JSON 转为 UserAddDTO 对象，通过 @Valid 校验参数合法性；
Controller 调用 Service，传递 UserAddDTO；
Service 将 UserAddDTO 转换为 UserEntity（补充数据库需要的字段），调用 Dao；
Dao 将 UserEntity 映射为 SQL 语句，插入 MySQL 数据库；
后端返回统一响应 Result，包含新增用户 ID。
2. 查询用户（数据库→后端→前端）
前端输入用户 ID，点击「查询」；
前端发送 GET 请求，传递路径参数 id；
Controller 接收 id，调用 Service；
Service 调用 Dao，查询数据库得到 UserEntity；
Service 将 UserEntity 转换为 UserRespDTO（格式化日期、屏蔽密码）；
Controller 返回 Result<UserRespDTO>，自动转为 JSON 响应；
前端接收 JSON，渲染用户信息（状态显示为「正常」而非 1）。

Node.js + Express + MySQL
    前端验证：用户提交表单时，先通过 JavaScript 验证用户名、密码格式（已在原代码实现）。
    数据发送：验证通过后，前端通过 fetch 发送 JSON 格式数据到后端 /api/register 接口。
    后端处理：
    检查用户名是否已存在（数据库查询）。
    对密码进行加密（使用 bcrypt，防止明文泄露）。
    将加密后的密码和用户名存入数据库。
    结果反馈：后端返回成功 / 失败信息，前端根据结果提示用户或跳转至登录页。

npm install morgan --save
const morgan = require('morgan'); // 引入 morgan

npm install multer --save
const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../db/config'); // 你的数据库连接配置（和 login.js 一致）
const path = require('path');
const fs = require('fs');

npm install jsonwebtoken mysql2 express

