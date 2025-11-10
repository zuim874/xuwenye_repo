// server.js（项目入口）
const app = require('./app'); // 导入 app.js 配置好的 Express 应用
require('dotenv').config(); // 可选：加载环境变量（后续可用于存储敏感信息）

// 定义端口（优先使用环境变量，默认 3000）
const PORT = process.env.PORT || 3000;

// 启动服务器
app.listen(PORT, () => {
  console.log(`后端服务器已启动：http://localhost:${PORT}`);
});