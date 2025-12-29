// posts-audit.js - 帖子审核接口（简化版）
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ===================== 1. 权限验证中间件（模仿position.js） =====================
/**
 * 验证用户是否登录（从请求头获取用户权限）
 * 前端需在请求头携带：Authorization: Bearer {user_power}（0=管理员，1=普通用户）
 */
const verifyLogin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        message: '请先登录后再操作',
        data: null
      });
    }

    const userPower = authHeader.split(' ')[1];
    if (!userPower) {
      return res.status(401).json({
        code: 401,
        message: '登录状态无效，请重新登录',
        data: null
      });
    }

    req.userPower = userPower;
    next();
  } catch (error) {
    return res.status(401).json({
      code: 401,
      message: '身份验证失败，请重新登录',
      data: null
    });
  }
};

/**
 * 验证是否为管理员（需配合verifyLogin使用）
 * 仅user_power=0的管理员可执行审核操作
 */
const verifyAdmin = (req, res, next) => {
  if (req.userPower !== '0') {
    return res.status(403).json({
      code: 403,
      message: '权限不足，仅管理员可执行此操作',
      data: null
    });
  }
  next();
};

// ===================== 2. 通用工具函数 =====================
/**
 * 统一错误处理
 */
const handleError = (res, error, action) => {
  console.error(`[${action}失败]`, error);
  res.status(500).json({
    code: 500,
    message: `${action}失败：${error.message || '服务器内部错误'}`,
    data: null
  });
};

// ===================== 3. 审核接口实现 =====================

/**
 * 获取待审核帖子列表
 * GET /api/posts/audit
 * 权限：需管理员权限
 */
router.get('/audit', verifyLogin, verifyAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const sql = `
      SELECT 
        p.id, p.user_id, p.title, p.content, p.tags, p.video_url, p.created_at,
        u.username AS author_name
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.is_deleted = 0 AND p.status = 0  -- status=0表示待审核
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [posts] = await db.query(sql, [limit, offset]);

    // 获取总数用于分页（可选）
    const [totalResult] = await db.query(
      'SELECT COUNT(*) AS total FROM posts WHERE is_deleted = 0 AND status = 0'
    );
    const total = totalResult[0].total;

    // 格式化返回数据
    const formattedPosts = posts.map(post => ({
      ...post,
      authorId: post.user_id,
      tags: post.tags ? post.tags.split(',').map(tag => tag.trim()) : []
    }));

    res.status(200).json({
      code: 200,
      message: '获取待审核帖子列表成功',
      data: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    handleError(res, error, '获取待审核帖子列表');
  }
});

/**
 * 获取已通过审核帖子列表
 * GET /api/posts/audit/approved
 * 权限：需管理员权限
 */
router.get('/audit/approved', verifyLogin, verifyAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const sql = `
      SELECT 
        p.id, p.user_id, p.title, p.content, p.tags, p.video_url, p.created_at,
        u.username AS author_name
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.is_deleted = 0 AND p.status = 1  -- status=1表示已通过
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [posts] = await db.query(sql, [limit, offset]);

    // 获取总数用于分页（可选）
    const [totalResult] = await db.query(
      'SELECT COUNT(*) AS total FROM posts WHERE is_deleted = 0 AND status = 1'
    );
    const total = totalResult[0].total;

    // 格式化返回数据
    const formattedPosts = posts.map(post => ({
      ...post,
      authorId: post.user_id,
      tags: post.tags ? post.tags.split(',').map(tag => tag.trim()) : []
    }));

    res.status(200).json({
      code: 200,
      message: '获取已通过审核帖子列表成功',
      data: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    handleError(res, error, '获取已通过审核帖子列表');
  }
});

/**
 * 审核通过帖子
 * POST /api/posts/:id/approve
 * 权限：需管理员权限
 */
router.post('/:id/approve', verifyLogin, verifyAdmin, async (req, res) => {
  try {
    const postId = req.params.id;
    
    if (isNaN(Number(postId))) {
      return res.status(400).json({
        code: 400,
        message: '帖子ID必须为数字',
        data: null
      });
    }

    // 检查帖子是否存在
    const [postCheck] = await db.query(
      'SELECT id, status FROM posts WHERE id = ? AND is_deleted = 0 LIMIT 1',
      [Number(postId)]
    );
    
    if (postCheck.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '帖子不存在或已被删除',
        data: null
      });
    }

    // 如果帖子已经是审核通过状态
    if (postCheck[0].status === 1) {
      return res.status(400).json({
        code: 400,
        message: '帖子已审核通过',
        data: null
      });
    }

    // 更新帖子状态为审核通过
    await db.query(
      'UPDATE posts SET status = 1, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [Number(postId)]
    );

    res.status(200).json({
      code: 200,
      message: '帖子审核通过成功',
      data: { postId: Number(postId) }
    });

  } catch (error) {
    handleError(res, error, '审核通过帖子');
  }
});

/**
 * 审核拒绝帖子
 * POST /api/posts/:id/reject
 * 权限：需管理员权限
 */
router.post('/:id/reject', verifyLogin, verifyAdmin, async (req, res) => {
  try {
    const postId = req.params.id;
    
    if (isNaN(Number(postId))) {
      return res.status(400).json({
        code: 400,
        message: '帖子ID必须为数字',
        data: null
      });
    }

    // 检查帖子是否存在
    const [postCheck] = await db.query(
      'SELECT id, status FROM posts WHERE id = ? AND is_deleted = 0 LIMIT 1',
      [Number(postId)]
    );
    
    if (postCheck.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '帖子不存在或已被删除',
        data: null
      });
    }

    // 如果帖子已经是拒绝状态
    if (postCheck[0].status === 2) {
      return res.status(400).json({
        code: 400,
        message: '帖子已审核拒绝',
        data: null
      });
    }

    // 更新帖子状态为审核拒绝
    await db.query(
      'UPDATE posts SET status = 2, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [Number(postId)]
    );

    res.status(200).json({
      code: 200,
      message: '帖子审核拒绝成功',
      data: { postId: Number(postId) }
    });

  } catch (error) {
    handleError(res, error, '审核拒绝帖子');
  }
});

/**
 * 批量审核帖子
 * POST /api/posts/batch-audit
 * 权限：需管理员权限
 * Body: { postIds: [1,2,3], action: 'approve'|'reject' }
 */
router.post('/batch-audit', verifyLogin, verifyAdmin, async (req, res) => {
  try {
    const { postIds, action } = req.body;
    
    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '帖子ID列表不能为空',
        data: null
      });
    }

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({
        code: 400,
        message: '操作类型必须为 approve 或 reject',
        data: null
      });
    }

    // 验证所有ID都是数字
    const invalidIds = postIds.filter(id => isNaN(Number(id)));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        code: 400,
        message: `帖子ID必须为数字，无效的ID: ${invalidIds.join(', ')}`,
        data: null
      });
    }

    const status = action === 'approve' ? 1 : 2;
    const placeholders = postIds.map(() => '?').join(',');
    
    // 批量更新帖子状态
    const [result] = await db.query(
      `UPDATE posts SET status = ?, reviewed_at = CURRENT_TIMESTAMP 
       WHERE id IN (${placeholders}) AND is_deleted = 0`,
      [status, ...postIds]
    );

    res.status(200).json({
      code: 200,
      message: `批量${action === 'approve' ? '通过' : '拒绝'}成功`,
      data: {
        processedCount: result.affectedRows
      }
    });

  } catch (error) {
    handleError(res, error, '批量审核帖子');
  }
});

/**
 * 获取审核统计信息（可选功能）
 * GET /api/posts/audit/stats
 * 权限：需管理员权限
 */
router.get('/audit/stats', verifyLogin, verifyAdmin, async (req, res) => {
  try {
    // 获取各种状态的帖子数量
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS today
      FROM posts 
      WHERE is_deleted = 0
    `);

    res.status(200).json({
      code: 200,
      message: '获取审核统计成功',
      data: stats[0]
    });

  } catch (error) {
    handleError(res, error, '获取审核统计');
  }
});

module.exports = router;
