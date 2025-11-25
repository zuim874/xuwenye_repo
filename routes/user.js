const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');

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
            `SELECT username, last_active 
             FROM users 
             WHERE is_online = 1 
             ORDER BY last_active DESC`
        );

        res.status(200).json({
            code: 200,
            message: '查询成功',
            data: {
                onlineUsers: onlineUsers,
                onlineCount: onlineUsers.length
            }
        });
    } catch (err) {
        handleError(res, err, '查询在线用户');
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

module.exports = router;