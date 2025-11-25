const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// 今日访问量统计接口
router.get('/daily-views', async (req, res) => {
  let connection;
  try {
    // 获取连接以确保事务一致性
    connection = await pool.getConnection();
    
    // 获取今日日期（YYYY-MM-DD）
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`📊 处理今日访问量统计，日期: ${today}`);

    // 开始事务
    await connection.beginTransaction();

    // 1. 尝试插入新记录或更新现有记录
    const upsertSql = `
      INSERT INTO daily_views (date, views) 
      VALUES (?, 1) 
      ON DUPLICATE KEY UPDATE views = views + 1, last_updated = CURRENT_TIMESTAMP
    `;
    
    const [upsertResult] = await connection.execute(upsertSql, [today]);
    console.log(`✅ 更新访问量成功，影响行数: ${upsertResult.affectedRows}`);

    // 2. 查询更新后的访问量
    const selectSql = 'SELECT views FROM daily_views WHERE date = ?';
    const [results] = await connection.execute(selectSql, [today]);

    if (results.length === 0) {
      throw new Error('未查询到今日访问量记录');
    }
    
    const dailyViews = results[0].views;
    console.log(`📈 今日访问量: ${dailyViews}`);

    // 提交事务
    await connection.commit();

    res.status(200).json({
      success: true,
      today: today,
      dailyViews: dailyViews
    });

  } catch (error) {
    // 回滚事务
    if (connection) {
      await connection.rollback();
    }
    
    console.error('❌ 浏览量统计失败：', error.message);
    res.status(500).json({
      success: false,
      message: '统计访问量失败',
      dailyViews: 0,
      error: error.message
    });
  } finally {
    // 释放连接
    if (connection) {
      connection.release();
    }
  }
});

// 新增：获取访问量历史数据接口（可选）
router.get('/view-history', async (req, res) => {
  try {
    const { days = 7 } = req.query; // 默认获取最近7天数据
    
    const sql = `
      SELECT date, views 
      FROM daily_views 
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) 
      ORDER BY date DESC
      LIMIT 30
    `;
    
    const [results] = await pool.execute(sql, [parseInt(days)]);
    
    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('获取访问历史失败：', error);
    res.status(500).json({
      success: false,
      message: '获取访问历史失败'
    });
  }
});

module.exports = router;