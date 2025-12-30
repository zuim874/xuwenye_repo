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

/**
 * 发送注销账户验证码
 * POST /api/users/:id/send-delete-verification
 */
router.post('/:id/send-delete-verification', async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const loginUserId = req.headers['x-login-user-id'];

        // 验证登录状态和权限
        if (!loginUserId) {
            return res.status(401).json({ code: 401, message: '未登录，请先登录' });
        }

        if (targetUserId !== loginUserId) {
            return res.status(403).json({ code: 403, message: '无权限操作他人账户' });
        }

        // 查询用户信息
        const [users] = await pool.execute(
            'SELECT id, username, email FROM users WHERE id = ?',
            [targetUserId]
        );

        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }

        const user = users[0];

        // 检查用户是否有邮箱
        if (!user.email) {
            return res.status(200).json({
                code: 200,
                message: '用户未绑定邮箱，可直接注销',
                data: { hasEmail: false }
            });
        }

        // 生成6位数字验证码
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10分钟过期

        // 保存验证码到数据库
        await pool.execute(
            'UPDATE users SET delete_verification_code = ?, delete_code_expiry = ? WHERE id = ?',
            [verificationCode, codeExpiry, targetUserId]
        );

        // 发送验证码邮件
        await emailService.sendDeleteVerificationCode(user.email, user.username, verificationCode);

        res.status(200).json({
            code: 200,
            message: '验证码已发送到您的注册邮箱，请查收',
            data: { 
                hasEmail: true,
                emailMask: maskEmail(user.email) // 部分隐藏邮箱地址
            }
        });

    } catch (error) {
        handleError(res, error, '发送注销验证码');
    }
});

/**
 * 验证注销验证码并执行注销
 * POST /api/users/:id/verify-and-delete
 */
router.post('/:id/verify-and-delete', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const targetUserId = req.params.id;
        const loginUserId = req.headers['x-login-user-id'];
        const { verificationCode, confirmText } = req.body;

        // 1. 基础验证
        if (!loginUserId) {
            await connection.rollback();
            return res.status(401).json({ code: 401, message: '未登录，请先登录' });
        }

        if (targetUserId !== loginUserId) {
            await connection.rollback();
            return res.status(403).json({ code: 403, message: '无权限注销他人账户' });
        }

        if (!confirmText || confirmText !== 'DELETE') {
            await connection.rollback();
            return res.status(400).json({ code: 400, message: '请输入"DELETE"确认注销操作' });
        }

        // 2. 验证用户存在性
        const [userCheck] = await connection.execute(
            'SELECT id, username, email, delete_verification_code, delete_code_expiry FROM users WHERE id = ?',
            [targetUserId]
        );

        if (userCheck.length === 0) {
            await connection.rollback();
            return res.status(404).json({ code: 404, message: '用户不存在或登录状态异常' });
        }

        const user = userCheck[0];

        // 3. 验证码逻辑（如果有邮箱）
        if (user.email) {
            if (!verificationCode) {
                await connection.rollback();
                return res.status(400).json({ code: 400, message: '请提供验证码' });
            }

            // 检查验证码是否正确且未过期
            if (user.delete_verification_code !== verificationCode) {
                await connection.rollback();
                return res.status(400).json({ code: 400, message: '验证码错误' });
            }

            if (new Date() > new Date(user.delete_code_expiry)) {
                await connection.rollback();
                return res.status(400).json({ code: 400, message: '验证码已过期，请重新获取' });
            }
        }

        // 4. 执行注销操作（复用原有的注销逻辑）
        console.log(`开始注销用户 ${user.username} (ID: ${user.id})...`);

        // 5. 按照依赖关系顺序删除数据（从叶子节点到根节点）

        // 5.1 先删除帖子相关的点赞记录
        console.log('删除帖子点赞记录...');
        await connection.execute(
            'DELETE pl FROM post_likes pl ' +
            'INNER JOIN posts p ON pl.post_id = p.id ' +
            'WHERE p.user_id = ?',
            [targetUserId]
        );

        // 5.2 删除帖子相关的收藏记录
        console.log('删除帖子收藏记录...');
        await connection.execute(
            'DELETE pf FROM post_favorites pf ' +
            'INNER JOIN posts p ON pf.post_id = p.id ' +
            'WHERE p.user_id = ?',
            [targetUserId]
        );

        // 5.3 删除用户对他人帖子的点赞记录
        console.log('删除用户点赞记录...');
        await connection.execute(
            'DELETE FROM post_likes WHERE user_id = ?',
            [targetUserId]
        );

        // 5.4 删除用户对他人帖子的收藏记录
        console.log('删除用户收藏记录...');
        await connection.execute(
            'DELETE FROM post_favorites WHERE user_id = ?',
            [targetUserId]
        );

        // 5.5 删除帖子的评论（先删除评论的依赖关系）
        console.log('删除帖子评论...');
        await connection.execute(
            'DELETE c FROM comments c ' +
            'INNER JOIN posts p ON c.post_id = p.id ' +
            'WHERE p.user_id = ?',
            [targetUserId]
        );

        // 5.6 删除用户发布的评论
        console.log('删除用户评论...');
        await connection.execute(
            'DELETE FROM comments WHERE user_id = ?',
            [targetUserId]
        );

        // 5.7 删除用户帖子（此时外键约束已清理）
        console.log('删除用户帖子...');
        const [userPosts] = await connection.execute(
            'SELECT id, video_url FROM posts WHERE user_id = ?',
            [targetUserId]
        );

        // 删除帖子关联的视频文件
        for (const post of userPosts) {
            if (post.video_url && post.video_url.startsWith('/uploads/videos/')) {
                const videoPath = path.join(__dirname, '..', post.video_url);
                try {
                    if (fs.existsSync(videoPath)) {
                        fs.unlinkSync(videoPath);
                        console.log(`删除视频文件: ${post.video_url}`);
                    }
                } catch (fileError) {
                    console.error(`删除视频文件失败 ${post.video_url}:`, fileError);
                }
            }
        }

        await connection.execute(
            'DELETE FROM posts WHERE user_id = ?',
            [targetUserId]
        );

        // 5.8 删除用户头像文件
        console.log('删除用户头像...');
        const [userAvatar] = await connection.execute(
            'SELECT avatar FROM users WHERE id = ?',
            [targetUserId]
        );

        if (userAvatar.length > 0 && userAvatar[0].avatar) {
            const avatarUrl = userAvatar[0].avatar;
            if (avatarUrl.startsWith('/uploads/avatar/')) {
                const avatarPath = path.join(__dirname, '..', avatarUrl);
                try {
                    if (fs.existsSync(avatarPath)) {
                        fs.unlinkSync(avatarPath);
                        console.log(`删除头像文件: ${avatarUrl}`);
                    }
                } catch (fileError) {
                    console.error(`删除头像文件失败 ${avatarUrl}:`, fileError);
                }
            }
        }

        // 5.9 最后删除用户主记录
        console.log('删除用户主记录...');
        await connection.execute(
            'DELETE FROM users WHERE id = ?',
            [targetUserId]
        );

        // 在删除用户前清除验证码
        await connection.execute(
            'UPDATE users SET delete_verification_code = NULL, delete_code_expiry = NULL WHERE id = ?',
            [targetUserId]
        );

        // 提交事务
        await connection.commit();
        
        console.log(`用户 ${user.username} 注销完成`);

        res.status(200).json({
            code: 200,
            message: '账户注销成功，所有相关数据已彻底删除',
            data: {
                deletedUserId: targetUserId,
                deletedUsername: user.username,
                deletedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('验证并注销过程中发生错误:', error);
        handleError(res, error, '验证并注销账户');
    } finally {
        connection.release();
    }
});

// 辅助函数：隐藏邮箱地址
function maskEmail(email) {
    if (!email) return '';
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
        return localPart[0] + '***@' + domain;
    }
    return localPart[0] + '***' + localPart.slice(-1) + '@' + domain;
}

/**
 * 发送换绑邮箱验证码（到当前邮箱）
 * POST /api/users/:id/send-change-email-code
 */
router.post('/:id/send-change-email-code', async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const loginUserId = req.headers['x-login-user-id'];

        // 验证登录状态和权限
        if (!loginUserId) {
            return res.status(401).json({ code: 401, message: '未登录，请先登录' });
        }

        if (targetUserId !== loginUserId) {
            return res.status(403).json({ code: 403, message: '无权限操作他人账户' });
        }

        // 查询用户信息
        const [users] = await pool.execute(
            'SELECT id, username, email FROM users WHERE id = ?',
            [targetUserId]
        );

        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }

        const user = users[0];

        // 修改：如果用户没有绑定邮箱，直接返回可以绑定新邮箱的状态
        if (!user.email) {
            return res.status(200).json({
                code: 200,
                message: '您尚未绑定邮箱，可以直接绑定新邮箱',
                data: { 
                    hasEmail: false, // 新增字段，表示用户没有邮箱
                    canBindDirectly: true // 新增字段，表示可以直接绑定
                }
            });
        }

        // 原有逻辑：用户有邮箱的情况
        // 生成6位数字验证码
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10分钟过期

        // 保存验证码到数据库
        await pool.execute(
            'UPDATE users SET change_email_code = ?, change_email_code_expiry = ? WHERE id = ?',
            [verificationCode, codeExpiry, targetUserId]
        );

        // 发送验证码邮件
        await emailService.sendChangeEmailVerification(user.email, user.username, verificationCode);

        res.status(200).json({
            code: 200,
            message: '验证码已发送到您的注册邮箱，请查收',
            data: { 
                hasEmail: true, // 用户有邮箱
                emailMask: maskEmail(user.email) // 部分隐藏邮箱地址
            }
        });

    } catch (error) {
        handleError(res, error, '发送换绑验证码');
    }
});

/**
 * 验证当前邮箱验证码并发送新邮箱验证码
 * POST /api/users/:id/verify-and-send-new
 */
router.post('/:id/verify-and-send-new', async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const loginUserId = req.headers['x-login-user-id'];
        const { currentEmailCode, newEmail } = req.body;

        // 验证登录状态和权限
        if (!loginUserId) {
            return res.status(401).json({ code: 401, message: '未登录，请先登录' });
        }

        if (targetUserId !== loginUserId) {
            return res.status(403).json({ code: 403, message: '无权限操作他人账户' });
        }

        // 验证参数
        if (!currentEmailCode) {
            return res.status(400).json({ code: 400, message: '请输入当前邮箱验证码' });
        }

        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            return res.status(400).json({ code: 400, message: '请输入有效的新邮箱地址' });
        }

        // 检查新邮箱是否已被其他用户使用
        const [existingEmail] = await pool.execute(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [newEmail, targetUserId]
        );

        if (existingEmail.length > 0) {
            return res.status(400).json({ code: 400, message: '该邮箱已被其他用户使用' });
        }

        // 查询用户信息
        const [users] = await pool.execute(
            'SELECT id, username, email, change_email_code, change_email_code_expiry FROM users WHERE id = ?',
            [targetUserId]
        );

        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }

        const user = users[0];

        // 验证当前邮箱验证码
        if (!user.change_email_code || user.change_email_code !== currentEmailCode) {
            return res.status(400).json({ code: 400, message: '验证码错误' });
        }

        if (new Date() > new Date(user.change_email_code_expiry)) {
            return res.status(400).json({ code: 400, message: '验证码已过期，请重新获取' });
        }

        // 生成新邮箱验证码
        const newEmailCode = Math.floor(100000 + Math.random() * 900000).toString();
        const newCodeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10分钟过期

        // 保存新邮箱和验证码到数据库
        await pool.execute(
            'UPDATE users SET new_email = ?, new_email_verification_code = ?, new_email_code_expiry = ? WHERE id = ?',
            [newEmail, newEmailCode, newCodeExpiry, targetUserId]
        );

        // 发送新邮箱验证码
        await emailService.sendNewEmailVerification(newEmail, newEmailCode);

        res.status(200).json({
            code: 200,
            message: '验证码已发送到新邮箱，请查收',
            data: { 
                newEmailMask: maskEmail(newEmail)
            }
        });

    } catch (error) {
        handleError(res, error, '验证并发送新邮箱验证码');
    }
});

/**
 * 验证新邮箱验证码并完成换绑
 * POST /api/users/:id/confirm-change-email
 */
router.post('/:id/confirm-change-email', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const targetUserId = req.params.id;
        const loginUserId = req.headers['x-login-user-id'];
        const { newEmailCode } = req.body;

        // 验证登录状态和权限
        if (!loginUserId) {
            await connection.rollback();
            return res.status(401).json({ code: 401, message: '未登录，请先登录' });
        }

        if (targetUserId !== loginUserId) {
            await connection.rollback();
            return res.status(403).json({ code: 403, message: '无权限操作他人账户' });
        }

        if (!newEmailCode) {
            await connection.rollback();
            return res.status(400).json({ code: 400, message: '请输入新邮箱验证码' });
        }

        // 查询用户信息
        const [users] = await connection.execute(
            `SELECT id, username, email, new_email, new_email_verification_code, new_email_code_expiry 
             FROM users WHERE id = ?`,
            [targetUserId]
        );

        if (users.length === 0) {
            await connection.rollback();
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }

        const user = users[0];

        // 验证新邮箱验证码
        if (!user.new_email_verification_code || user.new_email_verification_code !== newEmailCode) {
            await connection.rollback();
            return res.status(400).json({ code: 400, message: '新邮箱验证码错误' });
        }

        if (new Date() > new Date(user.new_email_code_expiry)) {
            await connection.rollback();
            return res.status(400).json({ code: 400, message: '新邮箱验证码已过期，请重新获取' });
        }

        if (!user.new_email) {
            await connection.rollback();
            return res.status(400).json({ code: 400, message: '未找到待验证的新邮箱' });
        }

        // 最终检查新邮箱是否已被使用（防止并发冲突）
        const [emailCheck] = await connection.execute(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [user.new_email, targetUserId]
        );

        if (emailCheck.length > 0) {
            await connection.rollback();
            return res.status(400).json({ code: 400, message: '该邮箱已被其他用户使用，请更换邮箱' });
        }

        // 更新邮箱
        await connection.execute(
            'UPDATE users SET email = ?, change_email_code = NULL, change_email_code_expiry = NULL, new_email = NULL, new_email_verification_code = NULL, new_email_code_expiry = NULL WHERE id = ?',
            [user.new_email, targetUserId]
        );

        await connection.commit();

        res.status(200).json({
            code: 200,
            message: '邮箱换绑成功',
            data: {
                oldEmail: user.email,
                newEmail: user.new_email,
                updatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        await connection.rollback();
        handleError(res, error, '确认换绑邮箱');
    } finally {
        connection.release();
    }
});

/**
 * 取消换绑邮箱流程
 * POST /api/users/:id/cancel-change-email
 */
router.post('/:id/cancel-change-email', async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const loginUserId = req.headers['x-login-user-id'];

        if (!loginUserId) {
            return res.status(401).json({ code: 401, message: '未登录，请先登录' });
        }

        if (targetUserId !== loginUserId) {
            return res.status(403).json({ code: 403, message: '无权限操作他人账户' });
        }

        // 清除换绑相关数据
        await pool.execute(
            'UPDATE users SET change_email_code = NULL, change_email_code_expiry = NULL, new_email = NULL, new_email_verification_code = NULL, new_email_code_expiry = NULL WHERE id = ?',
            [targetUserId]
        );

        res.status(200).json({
            code: 200,
            message: '换绑流程已取消'
        });

    } catch (error) {
        handleError(res, error, '取消换绑邮箱');
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

        // 查询帖子列表 - 使用status字段替代is_approved
        const [posts] = await pool.execute(
            `SELECT id, user_id, title, content, tags, video_url, created_at, 
                    view_count, like_count, comment_count, status 
             FROM posts 
             WHERE user_id = ? AND is_deleted = 0 
             ORDER BY created_at DESC`,
            [userId]
        );

        // 查询统计信息 - 使用status字段
        const [statsRows] = await pool.execute(
            `SELECT COUNT(*) as post_count, 
                    SUM(like_count) as total_likes, 
                    SUM(comment_count) as total_comments,
                    SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as approved_count,
                    SUM(CASE WHEN status = 0 OR status IS NULL THEN 1 ELSE 0 END) as pending_count
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
                    total_comments: stats.total_comments || 0,
                    approved_count: stats.approved_count || 0,
                    pending_count: stats.pending_count || 0
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
             SET title = ?, content = ?, tags = ?, video_url = ?, status = 0, updated_at = CURRENT_TIMESTAMP 
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

        // 查询用户帖子统计（只包含审核通过的帖子）
        const [postStats] = await pool.execute(
            `SELECT COUNT(*) as post_count, 
                    SUM(like_count) as total_likes,
                    SUM(comment_count) as total_comments
             FROM posts WHERE user_id = ? AND is_deleted = 0 AND status = 1`,
            [userId]
        );

        // 查询用户最近发布的帖子（只包含审核通过的）
        const [recentPosts] = await pool.execute(
            `SELECT id, title, created_at, like_count, comment_count, view_count, status, video_url
             FROM posts 
             WHERE user_id = ? AND is_deleted = 0 AND status = 1
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

        // 查询帖子列表（只包含审核通过的）
        const [posts] = await pool.execute(
            `SELECT id, title, content, tags, created_at, video_url, 
                    like_count, comment_count, view_count, status
             FROM posts 
             WHERE user_id = ? AND is_deleted = 0 AND status = 1
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );

        // 查询总数（只包含审核通过的）
        const [totalResult] = await pool.execute(
            'SELECT COUNT(*) as total FROM posts WHERE user_id = ? AND is_deleted = 0 AND status = 1',
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

// ==================== 密码重置相关接口 ====================

const emailService = require('../services/emailService');

/**
 * 忘记密码 - 发送重置邮件（仅通过邮箱）
 * POST /api/users/forgot-password
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email?.trim()) {
            return res.status(400).json({
                code: 400,
                message: '请输入邮箱地址'
            });
        }

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({
                code: 400,
                message: '请输入有效的邮箱地址'
            });
        }

        // 查询用户是否存在（仅通过邮箱）
        const [users] = await pool.execute(
            'SELECT id, username, email FROM users WHERE email = ?',
            [email.trim()]
        );

        if (users.length === 0) {
            // 出于安全考虑，不透露邮箱是否注册的信息
            return res.status(200).json({
                code: 200,
                message: '如果该邮箱已注册，重置链接将发送到您的邮箱'
            });
        }

        const user = users[0];
        
        // 生成安全的重置令牌
        const resetToken = require('crypto').randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 3600000); // 1小时后过期

        // 保存重置令牌到数据库
        await pool.execute(
            'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
            [resetToken, tokenExpiry, user.id]
        );

        // 发送邮件
        await emailService.sendPasswordResetEmail(user.email, user.username, resetToken);
        
        res.status(200).json({
            code: 200,
            message: '重置链接已发送到您的邮箱，请查收'
        });

    } catch (error) {
        console.error('发送重置邮件错误:', error);
        
        // 如果是邮件发送失败，提供更友好的错误信息
        if (error.message.includes('邮件发送失败')) {
            return res.status(500).json({
                code: 500,
                message: '邮件服务暂时不可用，请稍后重试'
            });
        }
        
        handleError(res, error, '发送重置邮件');
    }
});

/**
 * 重置密码
 * POST /api/users/reset-password
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                code: 400,
                message: '重置令牌和新密码不能为空'
            });
        }

        if (!/^(?=.*[A-Za-z]).{6,}$/.test(newPassword)) {
            return res.status(400).json({
                code: 400,
                message: '新密码必须至少6位且包含字母'
            });
        }

        // 验证令牌有效性
        const [users] = await pool.execute(
            'SELECT id, reset_token_expiry FROM users WHERE reset_token = ?',
            [token]
        );

        if (users.length === 0) {
            return res.status(400).json({
                code: 400,
                message: '无效的重置令牌'
            });
        }

        const user = users[0];
        
        // 检查令牌是否过期
        if (new Date() > new Date(user.reset_token_expiry)) {
            return res.status(400).json({
                code: 400,
                message: '重置链接已过期，请重新申请'
            });
        }

        // 更新密码并清除重置令牌
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await pool.execute(
            'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
            [newPasswordHash, user.id]
        );

        res.status(200).json({
            code: 200,
            message: '密码重置成功'
        });

    } catch (error) {
        handleError(res, error, '重置密码');
    }
});

/**
 * 修改用户密码（需要验证当前密码）
 * POST /api/users/:id/change-password
 */
router.post('/:id/change-password', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const targetUserId = req.params.id;
        const loginUserId = req.headers['x-login-user-id'];
        const { currentPassword, newPassword } = req.body;

        // 1. 基础验证
        if (!loginUserId) {
            await connection.rollback();
            return res.status(401).json({ code: 401, message: '未登录，请先登录' });
        }

        if (targetUserId !== loginUserId) {
            await connection.rollback();
            return res.status(403).json({ code: 403, message: '无权限修改他人密码' });
        }

        if (!currentPassword || !newPassword) {
            await connection.rollback();
            return res.status(400).json({ code: 400, message: '当前密码和新密码不能为空' });
        }

        if (!/^(?=.*[A-Za-z]).{6,}$/.test(newPassword)) {
            await connection.rollback();
            return res.status(400).json({ code: 400, message: '新密码必须至少6位且包含字母' });
        }

        // 2. 验证用户存在性并获取当前密码哈希
        const [users] = await connection.execute(
            'SELECT id, username, password_hash, email FROM users WHERE id = ?',
            [targetUserId]
        );

        if (users.length === 0) {
            await connection.rollback();
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }

        const user = users[0];

        // 3. 验证当前密码是否正确
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isCurrentPasswordValid) {
            await connection.rollback();
            return res.status(400).json({ code: 400, message: '当前密码错误' });
        }

        // 4. 验证新密码不能与旧密码相同
        const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
        if (isSamePassword) {
            await connection.rollback();
            return res.status(400).json({ code: 400, message: '新密码不能与当前密码相同' });
        }

        // 5. 加密新密码
        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        // 6. 更新密码（使用last_active字段记录最后活跃时间）
        await connection.execute(
            'UPDATE users SET password_hash = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?',
            [newPasswordHash, targetUserId]
        );

        await connection.commit();

        // 7. 发送密码修改通知邮件（可选）
        if (user.email && isValidEmail(user.email)) {
            try {
                await emailService.sendPasswordChangeNotification(user.username, user.email);
            } catch (emailError) {
                console.error('发送密码修改通知邮件失败：', emailError);
            }
        } else {
            console.warn('用户未绑定有效邮箱，跳过邮件通知');
        }

        // 添加邮箱验证函数
        function isValidEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        res.status(200).json({
            code: 200,
            message: '密码修改成功',
            data: {
                userId: targetUserId,
                username: user.username,
                changedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('修改密码失败：', error);
        
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(500).json({ code: 500, message: '数据库字段错误' });
        }
        
        res.status(500).json({ code: 500, message: '服务器内部错误' });
    } finally {
        connection.release();
    }
});

// ==================== 邮箱相关接口 ====================

/**
 * 验证邮箱是否已存在
 * GET /api/users/check-email?email=xxx
 */
router.get('/check-email', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email?.trim()) {
            return res.status(400).json({
                code: 400,
                message: '邮箱参数不能为空'
            });
        }

        const [users] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email.trim()]
        );

        res.status(200).json({
            code: 200,
            data: {
                email: email.trim(),
                exists: users.length > 0
            }
        });

    } catch (error) {
        handleError(res, error, '检查邮箱');
    }
});

module.exports = router;