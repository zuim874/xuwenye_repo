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

router.get('/id', async (req, res) => {
  try {
    // 1. 获取查询参数中的 username（前端通过 ?username=xxx 传入）
    const { username } = req.query;

    // 2. 校验参数：username 不能为空
    if (!username || username.trim() === '') {
      return res.status(400).json({
        code: 400,
        message: '参数错误：username 不能为空',
        data: null
      });
    }

    // 3. 数据库查询：根据 username 查找对应的 id（参数化查询防 SQL 注入）
    const [rows] = await pool.execute(
      'SELECT id FROM users WHERE username = ? LIMIT 1', // 只查1条匹配记录
      [username.trim()] // 传入参数（自动转义，避免注入）
    );

    // 4. 处理查询结果
    if (rows.length > 0) {
      // 找到用户：返回 id
      return res.status(200).json({
        code: 200,
        message: '查询成功',
        data: {
          username: username.trim(),
          userId: rows[0].id // 返回查询到的用户 id
        }
      });
    } else {
      // 未找到用户：返回 404
      return res.status(404).json({
        code: 404,
        message: `未找到用户名 ${username.trim()} 对应的用户`,
        data: null
      });
    }

  } catch (err) {
    // 5. 捕获数据库/服务器错误
    console.error('查询用户 id 接口错误：', err);
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误，查询失败',
      error: err.message // 生产环境可删除此字段，避免泄露敏感信息
    });
  }
});

// 接口 1：GET /api/users/:id → 查询用户详情（仅本人或管理员可访问）
router.get('/:id', async (req, res) => {
  const userId = req.params.id;
  // 关键修改：从请求头获取前端传递的「登录用户ID」（替代原 req.user.userId）
  // 前端需在请求头添加：X-Login-User-Id: 登录用户的id（从localStorage取userId）
  const loginUserId = req.headers['x-login-user-id'];

  // 新增：校验前端是否传递了登录状态（避免未登录访问）
  if (!loginUserId) {
    return res.status(401).json({ code: 401, message: '未登录，请先登录' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, username, created_at, avatar, user_power FROM users WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    const user = rows[0];
    // 权限校验逻辑不变（仅本人或管理员可看），但用新的 loginUserId 对比
    // 注意：数据库 id 可能是数字，这里转字符串避免类型不一致问题
    if (String(user.id) !== loginUserId && user.user_power !== 0) {
      return res.status(403).json({ code: 403, message: '无权限查看他人资料' });
    }

    res.status(200).json({
      code: 200,
      data: {
        id: user.id,
        username: user.username,
        created_at: user.created_at,
        avatar: user.avatar || null,
        user_power: user.user_power
      }
    });
  } catch (error) {
    console.error('查询用户详情失败（连接池）：', error);
    res.status(500).json({ code: 500, message: '服务器错误，获取用户资料失败' });
  }
});

// 接口 2：GET /api/users/:id/posts → 查询用户发布的帖子（仅本人可访问）
router.get('/:id/posts', async (req, res) => {
  const userId = req.params.id;
  // 关键修改：从请求头获取前端传递的「登录用户ID」
  const loginUserId = req.headers['x-login-user-id'];

  // 新增：校验登录状态
  if (!loginUserId) {
    return res.status(401).json({ code: 401, message: '未登录，请先登录' });
  }

  try {
    // 权限校验：仅本人可看（用新的 loginUserId 对比，转字符串避免类型问题）
    if (userId !== loginUserId) {
      return res.status(403).json({ code: 403, message: '无权限查看他人帖子' });
    }

    const [posts] = await pool.execute(
      `SELECT id, user_id, title, content, tags, video_url, created_at, updated_at, view_count, like_count, comment_count 
       FROM posts WHERE user_id = ? AND is_deleted = 0 
       ORDER BY created_at DESC`,
      [userId]
    );

    const [statsRows] = await pool.execute(
      `SELECT COUNT(*) as post_count, SUM(like_count) as total_likes, SUM(comment_count) as total_comments 
       FROM posts WHERE user_id = ? AND is_deleted = 0`,
      [userId]
    );

    const stats = statsRows[0];

    res.status(200).json({
      code: 200,
      data: {
        posts: posts,
        stats: {
          post_count: stats.post_count || 0,
          total_likes: stats.total_likes || 0,
          total_comments: stats.total_comments || 0
        }
      }
    });
  } catch (error) {
    console.error('查询用户帖子失败（连接池）：', error);
    res.status(500).json({ code: 500, message: '服务器错误，获取帖子失败' });
  }
});

// 新增：删除用户帖子接口（DELETE /api/users/:id/posts/:postId）
// 路径呼应查询接口，权限：仅帖子作者本人可删除
router.delete('/:id/posts/:postId', async (req, res) => {
  try {
    // 1. 获取路径参数：用户ID（:id）、帖子ID（:postId）
    const targetUserId = req.params.id;
    const postId = req.params.postId;
    // 2. 从请求头获取当前登录用户ID（和现有查询接口权限逻辑一致）
    const loginUserId = req.headers['x-login-user-id'];

    // 3. 基础校验：登录状态 + 参数有效性
    if (!loginUserId) {
      return res.status(401).json({ code: 401, message: '未登录，请先登录' });
    }
    if (!postId || isNaN(postId)) {
      return res.status(400).json({ code: 400, message: '帖子ID无效' });
    }

    // 4. 权限校验：仅本人可删除自己的帖子（和查询接口逻辑一致）
    if (targetUserId !== loginUserId) {
      return res.status(403).json({ code: 403, message: '无权限删除他人帖子' });
    }

    // 5. 校验帖子是否存在 + 是否属于当前用户（防删不存在/他人帖子）
    const [existingPosts] = await pool.execute(
      `SELECT id FROM posts 
       WHERE id = ? AND user_id = ? AND is_deleted = 0`, // 只删未被软删除的帖子
      [postId, loginUserId]
    );
    if (existingPosts.length === 0) {
      return res.status(404).json({ code: 404, message: '帖子不存在或已被删除' });
    }

    // 6. 执行软删除（和查询接口的 is_deleted 逻辑呼应，不物理删除数据）
    await pool.execute(
      `UPDATE posts 
       SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND user_id = ?`,
      [postId, loginUserId]
    );

    // 7. 返回成功响应（格式和现有接口一致）
    res.status(200).json({
      code: 200,
      message: '帖子删除成功'
    });

  } catch (error) {
    // 8. 错误处理（和现有接口风格一致）
    console.error('删除用户帖子失败：', error);
    res.status(500).json({
      code: 500,
      message: '服务器错误，删除帖子失败',
      errorMessage: error.message
    });
  }
});

module.exports = router;