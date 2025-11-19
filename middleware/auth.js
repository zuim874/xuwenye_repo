// middleware/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your-secret-key'; // 与登录接口的密钥保持一致！

// 验证 token 中间件
const authenticateToken = (req, res, next) => {
  // 从请求头获取 token
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // 格式：Bearer <token>

  if (!token) {
    return res.status(401).json({ code: 401, message: '未登录，无访问权限' });
  }

  // 验证 token
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ code: 403, message: 'token 无效或已过期' });
    }
    req.user = user; // 将用户信息（如 userId）存入请求对象
    next();
  });
};

module.exports = { authenticateToken };