const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// 错误处理函数
const handleError = (res, error, action) => {
  console.error(`${action}失败:`, error);
  res.status(500).json({
    code: 500,
    message: `${action}失败，请稍后重试`
  });
};

// 获取所有地图数据
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM maps ORDER BY map_name');
    res.json({
      code: 200,
      data: rows
    });
  } catch (error) {
    handleError(res, error, '获取地图数据');
  }
});

// 获取单个地图数据
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM maps WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '地图不存在'
      });
    }
    res.json({
      code: 200,
      data: rows[0]
    });
  } catch (error) {
    handleError(res, error, '获取单个地图数据');
  }
});

// 添加新地图
router.post('/', async (req, res) => {
  try {
    const { map_key, map_name, map_image_url, map_url } = req.body;
    
    // 验证必要字段（数据库字段均为NOT NULL）
    if (!map_key || !map_name || !map_image_url || !map_url) {
      return res.status(400).json({
        code: 400,
        message: '地图标识、名称、2D地图地址和封面地址为必填项'
      });
    }
    
    // 检查map_key是否已存在（唯一键约束）
    const [existing] = await pool.query('SELECT * FROM maps WHERE map_key = ?', [map_key]);
    if (existing.length > 0) {
      return res.status(409).json({
        code: 409,
        message: '该地图标识已存在'
      });
    }
    
    // 插入数据（id为自增，无需手动传入）
    await pool.query(
      'INSERT INTO maps (map_key, map_name, map_image_url, map_url) VALUES (?, ?, ?, ?)',
      [map_key, map_name, map_image_url, map_url]
    );
    
    res.status(201).json({
      code: 201,
      message: '地图添加成功'
    });
  } catch (error) {
    handleError(res, error, '添加地图');
  }
});

// 更新地图数据
router.put('/:id', async (req, res) => {
  try {
    const { map_key, map_name, map_image_url, map_url } = req.body;
    
    // 检查地图是否存在
    const [existing] = await pool.query('SELECT * FROM maps WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '地图不存在'
      });
    }
    
    // 验证更新字段（数据库字段均为NOT NULL）
    if (!map_key || !map_name || !map_image_url || !map_url) {
      return res.status(400).json({
        code: 400,
        message: '地图名称、2D地图地址和封面地址为必填项'
      });
    }
    
    // 更新数据（移除不存在的updated_at字段）
    await pool.query(
      'UPDATE maps SET map_key = ?, map_name = ?, map_image_url = ?, map_url = ? WHERE id = ?',
      [map_key, map_name, map_image_url, map_url, req.params.id]
    );
    
    res.json({
      code: 200,
      message: '地图更新成功'
    });
  } catch (error) {
    handleError(res, error, '更新地图');
  }
});

// 删除地图
router.delete('/:id', async (req, res) => {
  try {
    // 检查地图是否存在
    const [existing] = await pool.query('SELECT * FROM maps WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '地图不存在'
      });
    }
    
    await pool.query('DELETE FROM maps WHERE id = ?', [req.params.id]);
    
    res.json({
      code: 200,
      message: '地图删除成功'
    });
  } catch (error) {
    handleError(res, error, '删除地图');
  }
});

module.exports = router;