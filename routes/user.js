const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt'); // 需引入bcrypt（密码加密）

// GET /api/users（查询所有注册用户）
router.get('/', async (req, res) => {
  try {
    // 1. 数据库查询：仅返回 id 和 username（排除 password_hash 敏感字段）
    const [users] = await pool.execute(
      'SELECT id, username FROM users ORDER BY id DESC' // 按 id 倒序，最新注册的在前
    );

    // 2. 返回成功响应（包含用户列表）
    return res.status(200).json({
      message: '查询所有用户成功',
      total: users.length, // 总用户数
      users: users // 用户列表（数组格式）
    });

  } catch (err) {
    // 3. 错误处理（与现有接口一致）
    console.error('查询用户列表错误:', err);
    return res.status(500).json({
      message: '服务器内部错误，查询用户失败',
      errorCode: err.code,
      errorMessage: err.message
    });
  }
});

// 新增：删除指定用户名的用户（DELETE /api/users/:username）
router.delete('/:username', async (req, res) => {
  try {
    // 1. 获取路径参数中的用户名（trim 去除空格）
    const username = req.params.username.trim();

    // 2. 校验用户名是否为空
    if (!username) {
      return res.status(400).json({ message: '用户名不能为空' });
    }

    // 3. 先查询用户是否存在（避免删除不存在的用户）
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [username]
    );
    if (existingUsers.length === 0) {
      return res.status(404).json({ message: `用户名 "${username}" 不存在，删除失败` });
    }

    // 4. 执行删除操作（参数化查询，防 SQL 注入）
    await pool.execute(
      'DELETE FROM users WHERE username = ?',
      [username]
    );

    // 5. 返回成功响应
    return res.status(200).json({ message: `用户名 "${username}" 已成功删除` });

  } catch (err) {
    // 6. 错误处理（与现有接口一致）
    console.error('删除用户错误:', err);
    return res.status(500).json({
      message: '服务器内部错误，删除用户失败',
      errorCode: err.code,
      errorMessage: err.message
    });
  }
});

router.put('/:username/password', async (req, res) => {
  try {
    // 1. 获取参数：路径参数（用户名）+ 请求体（新密码）
    const username = req.params.username.trim();
    const { newPassword } = req.body || {};

    // 2. 基础校验
    if (!username) {
      return res.status(400).json({ message: '用户名不能为空' });
    }
    if (!newPassword) {
      return res.status(400).json({ message: '新密码不能为空' });
    }

    // 3. 新密码格式校验（与注册一致：至少6位数字）
    const passwordReg = /^\d{6,}$/;
    if (!passwordReg.test(newPassword)) {
      return res.status(400).json({ message: '新密码必须至少6位数字' });
    }

    // 4. 校验用户是否存在
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [username]
    );
    if (existingUsers.length === 0) {
      return res.status(404).json({ message: `用户名 "${username}" 不存在，修改失败` });
    }

    // 5. 新密码 bcrypt 加密（与注册/登录加密规则一致）
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // 6. 执行密码更新（参数化查询，防SQL注入）
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE username = ?',
      [newPasswordHash, username] // 加密后的新密码 + 目标用户名
    );

    // 7. 返回成功响应
    return res.status(200).json({ message: `用户名 "${username}" 的密码已成功修改` });

  } catch (err) {
    // 8. 错误处理
    console.error('修改密码错误:', err);
    return res.status(500).json({
      message: '服务器内部错误，修改密码失败',
      errorCode: err.code,
      errorMessage: err.message
    });
  }
});

// 1. 心跳接口：POST /api/users/heartbeat（前端定时调用）
router.post('/heartbeat', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ code: 400, message: '缺少用户名参数' });
    }

    // 更新用户最后活跃时间为当前时间
    await pool.execute(
      'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE username = ?',
      [username]
    );

    res.status(200).json({ code: 200, message: '心跳成功' });
  } catch (err) {
    console.error('心跳接口错误:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 2. 在线用户查询接口：GET /api/users/online_users（查询时自动更新is_online）
router.get('/online_users', async (req, res) => {
  try {
    // 第一步：先批量更新is_online状态（核心简化逻辑）
    // 1. 超时用户（1分钟无活跃）→ is_online=0
    // 2. 未超时用户（1分钟内有活跃）→ is_online=1
    await pool.execute(`
      UPDATE users 
      SET is_online = CASE 
        WHEN last_active > DATE_SUB(NOW(), INTERVAL 1 MINUTE) THEN 1  -- 未超时→在线
        ELSE 0  -- 超时→离线
      END
      -- 只更新状态变化的用户（避免全表重复更新，提升效率）
      WHERE is_online != CASE 
        WHEN last_active > DATE_SUB(NOW(), INTERVAL 1 MINUTE) THEN 1 
        ELSE 0 
      END
    `);

    // 第二步：直接查询is_online=1的用户（状态已同步，无需再过滤时间）
    const [onlineUsers] = await pool.execute(
      `SELECT username, last_login, last_active 
       FROM users 
       WHERE is_online = 1 
       ORDER BY last_active DESC`, // 按最近活跃时间倒序
      []
    );

    res.status(200).json({
      code: 200,
      message: '查询成功（已自动同步在线状态）',
      data: {
        onlineUsers: onlineUsers || [],
        onlineCount: onlineUsers.length // 在线人数统计
      }
    });
  } catch (err) {
    console.error('在线用户查询/状态更新错误:', err);
    res.status(500).json({ code: 500, message: '查询在线用户失败' });
  }
});

module.exports = router;