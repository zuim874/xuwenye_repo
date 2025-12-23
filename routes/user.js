const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads/videos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer用于处理视频上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/videos/'); // 视频存储目录，确保该目录存在
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名，避免重复
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB限制
  },
  fileFilter: function(req, file, cb) {
    // 验证视频格式
    if (file.mimetype === 'video/mp4' || file.mimetype === 'video/webm') {
      cb(null, true);
    } else {
      cb(new Error('只支持MP4和WebM格式的视频'), false);
    }
  }
});

// 在文件顶部添加头像上传目录配置
const avatarUploadDir = path.join(__dirname, '../uploads/avatar');
if (!fs.existsSync(avatarUploadDir)) {
  fs.mkdirSync(avatarUploadDir, { recursive: true });
}

// 配置头像上传的multer
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/avatar/'); // 头像存储目录
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名，使用用户ID确保唯一性
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = file.originalname.split('.').pop();
    cb(null, `avatar-${req.headers['x-login-user-id']}-${uniqueSuffix}.${ext}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB限制
  },
  fileFilter: function(req, file, cb) {
    // 验证图片格式
    if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持JPG、PNG、GIF和WebP格式的图片'), false);
    }
  }
});

// ==================== 公共工具函数 ====================

/**
 * 统一错误处理函数
 */
const handleError = (res, error, operation) => {
    console.error(`${operation}错误:`, error);
    res.status(500).json({
        code: 500,
        message: `服务器内部错误，${operation}失败`
    });
};

/**
 * 验证用户权限（本人或管理员）
 */
const validateUserPermission = (targetUserId, loginUserId, userPower) => {
    return String(targetUserId) === loginUserId || userPower === 0;
};

// ==================== 用户基本信息接口 ====================

/**
 * 查询所有用户列表
 * GET /api/users
 */
router.get('/', async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, username FROM users ORDER BY id DESC'
        );

        res.status(200).json({
            message: '查询所有用户成功',
            total: users.length,
            users: users
        });

    } catch (err) {
        handleError(res, err, '查询用户列表');
    }
});

/**
 * 根据用户名查询用户ID
 * GET /api/users/id?username=xxx
 */
router.get('/id', async (req, res) => {
    try {
        const { username } = req.query;

        if (!username?.trim()) {
            return res.status(400).json({
                code: 400,
                message: '参数错误：username 不能为空'
            });
        }

        const [rows] = await pool.execute(
            'SELECT id FROM users WHERE username = ? LIMIT 1',
            [username.trim()]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                code: 404,
                message: `未找到用户名 ${username} 对应的用户`
            });
        }

        res.status(200).json({
            code: 200,
            message: '查询成功',
            data: {
                username: username.trim(),
                userId: rows[0].id
            }
        });

    } catch (err) {
        handleError(res, err, '查询用户ID');
    }
});

/**
 * 在线用户查询接口（自动同步在线状态）
 * GET /api/users/online_users
 */
router.get('/online_users', async (req, res) => {
    try {
        // 批量更新在线状态（1分钟无活跃视为离线）
        await pool.execute(`
            UPDATE users 
            SET is_online = CASE 
                WHEN last_active > DATE_SUB(NOW(), INTERVAL 1 MINUTE) THEN 1
                ELSE 0
            END
        `);

        // 查询在线用户
        const [onlineUsers] = await pool.execute(
            `SELECT username, last_active, id 
             FROM users 
             WHERE is_online = 1 
             ORDER BY last_active DESC`
        );

        res.status(200).json({
            code: 200,
            message: '查询成功',
            data: {
                onlineUsers: onlineUsers,
                onlineCount: onlineUsers.length,
                onlineusersid: onlineUsers.id
            }
        });
    } catch (err) {
        handleError(res, err, '查询在线用户');
    }
});

/**
 * 查询用户详情（需登录，仅本人或管理员可访问）
 * GET /api/users/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const loginUserId = req.headers['x-login-user-id'];

        if (!loginUserId) {
            return res.status(401).json({ code: 401, message: '未登录，请先登录' });
        }

        const [rows] = await pool.execute(
            'SELECT id, username, created_at, avatar, user_power FROM users WHERE id = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }

        const user = rows[0];
        if (!validateUserPermission(user.id, loginUserId, user.user_power)) {
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
        handleError(res, error, '查询用户详情');
    }
});

// ==================== 用户帖子管理接口 ====================

/**
 * 查询用户发布的帖子（仅本人可访问）
 * GET /api/users/:id/posts
 */
router.get('/:id/posts', async (req, res) => {
    try {
        const userId = req.params.id;
        const loginUserId = req.headers['x-login-user-id'];

        if (!loginUserId) {
            return res.status(401).json({ code: 401, message: '未登录，请先登录' });
        }

        if (userId !== loginUserId) {
            return res.status(403).json({ code: 403, message: '无权限查看他人帖子' });
        }

        // 查询帖子列表
        const [posts] = await pool.execute(
            `SELECT id, user_id, title, content, tags, video_url, created_at, 
                    view_count, like_count, comment_count 
             FROM posts 
             WHERE user_id = ? AND is_deleted = 0 
             ORDER BY created_at DESC`,
            [userId]
        );

        // 查询统计信息
        const [statsRows] = await pool.execute(
            `SELECT COUNT(*) as post_count, 
                    SUM(like_count) as total_likes, 
                    SUM(comment_count) as total_comments 
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
        handleError(res, error, '查询用户帖子');
    }
});

/**
 * 删除用户帖子（仅本人可操作）
 * DELETE /api/users/:id/posts/:postId
 */
router.delete('/:id/posts/:postId', async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const postId = req.params.postId;
        const loginUserId = req.headers['x-login-user-id'];

        if (!loginUserId) {
            return res.status(401).json({ code: 401, message: '未登录，请先登录' });
        }

        if (!postId || isNaN(postId)) {
            return res.status(400).json({ code: 400, message: '帖子ID无效' });
        }

        if (targetUserId !== loginUserId) {
            return res.status(403).json({ code: 403, message: '无权限删除他人帖子' });
        }

        // 验证帖子存在性
        const [existingPosts] = await pool.execute(
            'SELECT id FROM posts WHERE id = ? AND user_id = ? AND is_deleted = 0',
            [postId, loginUserId]
        );

        if (existingPosts.length === 0) {
            return res.status(404).json({ code: 404, message: '帖子不存在或已被删除' });
        }

        // 执行软删除
        await pool.execute(
            `UPDATE posts 
             SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND user_id = ?`,
            [postId, loginUserId]
        );

        res.status(200).json({
            code: 200,
            message: '帖子删除成功'
        });

    } catch (error) {
        handleError(res, error, '删除用户帖子');
    }
});

// ==================== 用户状态管理接口 ====================

/**
 * 心跳接口（更新用户活跃时间）
 * POST /api/users/heartbeat
 */
router.post('/heartbeat', async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({ code: 400, message: '缺少用户名参数' });
        }

        await pool.execute(
            'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE username = ?',
            [username]
        );

        res.status(200).json({ code: 200, message: '心跳成功' });
    } catch (err) {
        handleError(res, err, '心跳接口');
    }
});

// ==================== 用户账户管理接口 ====================

/**
 * 修改用户密码
 * PUT /api/users/:username/password
 */
router.put('/:username/password', async (req, res) => {
    try {
        const username = req.params.username.trim();
        const { newPassword } = req.body || {};

        // 参数校验
        if (!username) {
            return res.status(400).json({ message: '用户名不能为空' });
        }
        if (!newPassword) {
            return res.status(400).json({ message: '新密码不能为空' });
        }
        if (!/^\d{6,}$/.test(newPassword)) {
            return res.status(400).json({ message: '新密码必须至少6位数字' });
        }

        // 验证用户存在性
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE username = ? LIMIT 1',
            [username]
        );
        if (existingUsers.length === 0) {
            return res.status(404).json({ message: `用户名 "${username}" 不存在` });
        }

        // 加密并更新密码
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await pool.execute(
            'UPDATE users SET password_hash = ? WHERE username = ?',
            [newPasswordHash, username]
        );

        res.status(200).json({ message: `用户 "${username}" 的密码已成功修改` });

    } catch (err) {
        handleError(res, err, '修改密码');
    }
});

/**
 * 删除用户
 * DELETE /api/users/:username
 */
router.delete('/:username', async (req, res) => {
    try {
        const username = req.params.username.trim();

        if (!username) {
            return res.status(400).json({ message: '用户名不能为空' });
        }

        // 验证用户存在性
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE username = ? LIMIT 1',
            [username]
        );
        if (existingUsers.length === 0) {
            return res.status(404).json({ message: `用户名 "${username}" 不存在` });
        }

        // 执行删除
        await pool.execute('DELETE FROM users WHERE username = ?', [username]);

        res.status(200).json({ message: `用户 "${username}" 已成功删除` });

    } catch (err) {
        handleError(res, err, '删除用户');
    }
});

/**
 * 编辑用户帖子（仅本人可操作）
 * PUT /api/users/:userId/posts/:postId
 */
router.put('/:userId/posts/:postId', upload.single('video'), async (req, res) => {
    try {
        const userId = req.params.userId;
        const postId = req.params.postId;
        const loginUserId = req.headers['x-login-user-id'];

        // 1. 基础验证
        if (!loginUserId) {
            return res.status(401).json({ code: 401, message: '未登录，请先登录' });
        }
        if (userId !== loginUserId) {
            return res.status(403).json({ code: 403, message: '无权限编辑他人帖子' });
        }
        if (!postId || isNaN(postId)) {
            return res.status(400).json({ code: 400, message: '帖子ID无效' });
        }

        // 2. 解析表单数据（前端使用FormData，需确保后端已配置multer等中间件处理文件）
        const { title, content, tags, removeExistingVideo } = req.body;
        const newVideoFile = req.file; // 假设使用multer处理视频文件，文件信息在req.file中

        // 3. 验证必填字段
        if (!title?.trim()) {
            return res.status(400).json({ code: 400, message: '帖子标题不能为空' });
        }
        if (!content?.trim()) {
            return res.status(400).json({ code: 400, message: '帖子内容不能为空' });
        }
        if (!tags?.trim()) {
            return res.status(400).json({ code: 400, message: '请至少选择一个标签' });
        }

        // 4. 验证帖子是否存在且属于当前用户
        const [existingPosts] = await pool.execute(
            'SELECT id, video_url FROM posts WHERE id = ? AND user_id = ? AND is_deleted = 0',
            [postId, loginUserId]
        );
        if (existingPosts.length === 0) {
            return res.status(404).json({ code: 404, message: '帖子不存在或已被删除' });
        }
        const existingPost = existingPosts[0];

        // 5. 处理视频逻辑
        let videoUrl = existingPost.video_url; // 默认保留原视频
        if (removeExistingVideo === 'true') {
            // 标记删除现有视频（实际项目中可能需要删除存储的视频文件）
            videoUrl = null;
        }
        if (newVideoFile) {
            // 处理新上传的视频（实际项目中需上传至存储服务并获取URL）
            // 示例：假设已上传至服务器，视频URL为 `/uploads/videos/${newVideoFile.filename}`
            videoUrl = `/uploads/videos/${newVideoFile.filename}`;
        }

        // 6. 更新帖子信息
        await pool.execute(
            `UPDATE posts 
             SET title = ?, content = ?, tags = ?, video_url = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND user_id = ?`,
            [title.trim(), content.trim(), tags.trim(), videoUrl, postId, loginUserId]
        );

        res.status(200).json({
            code: 200,
            message: '帖子更新成功',
            data: { postId }
        });

    } catch (error) {
        handleError(res, error, '编辑帖子');
    }
});

/**
 * 获取用户指定帖子详情（仅本人可访问）
 * GET /api/users/:userId/posts/:postId
 */
router.get('/:userId/posts/:postId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const postId = req.params.postId;
        const loginUserId = req.headers['x-login-user-id'];

        // 1. 登录状态验证
        if (!loginUserId) {
            return res.status(401).json({ code: 401, message: '未登录，请先登录' });
        }

        // 2. 权限验证（仅本人可访问）
        if (userId !== loginUserId) {
            return res.status(403).json({ code: 403, message: '无权限查看他人帖子' });
        }

        // 3. 帖子ID有效性验证
        if (!postId || isNaN(postId)) {
            return res.status(400).json({ code: 400, message: '帖子ID无效' });
        }

        // 4. 查询帖子详情（仅查询未删除的帖子）
        const [posts] = await pool.execute(
            `SELECT id, title, content, tags, video_url, updated_at 
             FROM posts 
             WHERE id = ? AND user_id = ? AND is_deleted = 0 
             LIMIT 1`,
            [postId, loginUserId]
        );

        // 5. 验证帖子是否存在
        if (posts.length === 0) {
            return res.status(404).json({ code: 404, message: '帖子不存在或已被删除' });
        }

        // 6. 返回帖子数据
        res.status(200).json({
            code: 200,
            message: '查询帖子成功',
            data: posts[0] // 返回单个帖子详情
        });

    } catch (error) {
        handleError(res, error, '查询帖子详情');
    }
});

/**
 * 更新用户头像接口
 * POST /api/users/update-avatar
 */
router.post('/update-avatar', avatarUpload.single('avatarFile'), async (req, res) => {
  try {
    // 1. 获取用户ID
    const userId = req.headers['x-login-user-id'];
    if (!userId) {
      return res.status(401).json({
        code: 401,
        message: '未登录，缺少用户ID'
      });
    }

    let avatarUrl = '';
    
    // 2. 处理上传的文件（如果有）
    if (req.file) {
      // 上传了本地文件
      avatarUrl = `/uploads/avatar/${req.file.filename}`;
    } else {
      // 处理URL方式
      const { avatarUrl: url } = req.body;
      if (!url?.trim()) {
        return res.status(400).json({
          code: 400,
          message: '头像URL不能为空'
        });
      }

      // 校验URL格式
      const urlRegex = /^(https?:\/\/).+\.(jpg|jpeg|png|gif|webp)$/i;
      if (!urlRegex.test(url.trim())) {
        return res.status(400).json({
          code: 400,
          message: '头像URL格式错误，仅支持jpg/png/gif/webp格式的网络图片'
        });
      }
      avatarUrl = url.trim();
    }

    // 3. 验证用户是否存在
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    if (users.length === 0) {
      return res.status(404).json({
        code: 404,
        message: `用户ID ${userId} 不存在`
      });
    }

    // 4. 如果是新上传的文件，删除旧头像（可选）
    if (req.file) {
      const [user] = await pool.execute(
        'SELECT avatar FROM users WHERE id = ?',
        [userId]
      );
      const oldAvatar = user[0].avatar;
      if (oldAvatar && oldAvatar.startsWith('/uploads/avatar/')) {
        const oldAvatarPath = path.join(__dirname, '..', oldAvatar);
        if (fs.existsSync(oldAvatarPath)) {
          try {
            fs.unlinkSync(oldAvatarPath);
          } catch (err) {
            console.error('删除旧头像失败:', err);
          }
        }
      }
    }

    // 5. 更新数据库
    await pool.execute(
      'UPDATE users SET avatar = ? WHERE id = ?',
      [avatarUrl, userId]
    );

    // 6. 返回成功响应
    res.status(200).json({
      code: 200,
      message: '头像更新成功',
      data: {
        userId,
        avatar: avatarUrl,
        updateTime: new Date().toLocaleString()
      }
    });

  } catch (error) {
    handleError(res, error, '更新用户头像');
  }
});

/**
 * 获取用户头像
 * GET /api/users/:userId/avatar
 */
router.get('/:userId/avatar', async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const loginUserId = req.headers['x-login-user-id'];

        // 验证登录状态
        if (!loginUserId) {
            return res.status(401).json({ code: 401, message: '未登录，请先登录' });
        }

        // 查询用户头像URL（从user表的avatar字段获取）
        const [users] = await pool.execute(
            'SELECT avatar FROM users WHERE id = ? LIMIT 1',
            [targetUserId]
        );

        // 验证用户是否存在
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }

        // 返回头像URL（数据库中直接存储的URL）
        res.status(200).json({
            code: 200,
            message: '查询头像成功',
            data: {
                userId: targetUserId,
                avatar: users[0].avatar || null, // 直接返回存储的URL，未设置则为null
                updateTime: new Date().toLocaleString()
            }
        });

    } catch (error) {
        handleError(res, error, '查询用户头像');
    }
});

/**
 * 获取作者主页信息（公开信息，无需登录）
 * GET /api/users/:id/profile
 */
router.get('/:id/profile', async (req, res) => {
    try {
        const userId = req.params.id;

        // 查询用户基本信息
        const [userRows] = await pool.execute(
            'SELECT id, username, created_at, avatar FROM users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({ 
                code: 404, 
                message: '用户不存在' 
            });
        }

        const user = userRows[0];

        // 查询用户帖子统计
        const [postStats] = await pool.execute(
            `SELECT COUNT(*) as post_count, 
                    SUM(like_count) as total_likes,
                    SUM(comment_count) as total_comments
             FROM posts WHERE user_id = ? AND is_deleted = 0`,
            [userId]
        );

        // 查询用户最近发布的帖子（公开可见）
        const [recentPosts] = await pool.execute(
            `SELECT id, title, created_at, like_count, comment_count, view_count
             FROM posts 
             WHERE user_id = ? AND is_deleted = 0 
             ORDER BY created_at DESC 
             LIMIT 5`,
            [userId]
        );

        res.status(200).json({
            code: 200,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    avatar: user.avatar,
                    created_at: user.created_at,
                    join_date: new Date(user.created_at).toLocaleDateString()
                },
                stats: {
                    post_count: postStats[0].post_count || 0,
                    total_likes: postStats[0].total_likes || 0,
                    total_comments: postStats[0].total_comments || 0
                },
                recent_posts: recentPosts
            }
        });

    } catch (error) {
        handleError(res, error, '查询作者主页');
    }
});

/**
 * 获取作者公开的帖子列表（无需登录）
 * GET /api/users/:id/public-posts
 */
router.get('/:id/public-posts', async (req, res) => {
    try {
        const userId = req.params.id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        // 验证用户存在
        const [userCheck] = await pool.execute(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        );

        if (userCheck.length === 0) {
            return res.status(404).json({ 
                code: 404, 
                message: '用户不存在' 
            });
        }

        // 查询帖子列表
        const [posts] = await pool.execute(
            `SELECT id, title, content, tags, created_at, 
                    like_count, comment_count, view_count
             FROM posts 
             WHERE user_id = ? AND is_deleted = 0 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );

        // 查询总数
        const [totalResult] = await pool.execute(
            'SELECT COUNT(*) as total FROM posts WHERE user_id = ? AND is_deleted = 0',
            [userId]
        );

        const total = totalResult[0].total;

        res.status(200).json({
            code: 200,
            data: {
                posts: posts.map(post => ({
                    ...post,
                    tags: post.tags ? post.tags.split(',').map(tag => tag.trim()) : []
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        handleError(res, error, '查询作者帖子列表');
    }
});

module.exports = router;