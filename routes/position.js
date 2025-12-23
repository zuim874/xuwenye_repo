// position.js - CSGO道具点位&投掷点管理接口（含权限验证+视频上传）
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // 数据库连接模块（需确保配置正确）
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ===================== 1. 权限验证中间件（核心，与示例完全对齐） =====================
/**
 * 验证用户是否登录（从请求头获取用户权限）
 * 前端需在请求头携带：Authorization: Bearer {user_power}（0=管理员，1=普通用户）
 */
const verifyLogin = (req, res, next) => {
  try {
    // 从请求头提取权限信息
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        message: '请先登录后再操作',
        data: null
      });
    }

    // 解析用户权限（0=管理员，1=普通用户）
    const userPower = authHeader.split(' ')[1];
    if (!['0', '1'].includes(userPower)) {
      return res.status(401).json({
        code: 401,
        message: '登录状态无效，请重新登录',
        data: null
      });
    }

    // 将权限挂载到req对象，供后续中间件使用
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
 * 仅user_power=0的管理员可执行增删改操作
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

// ===================== 2. 视频上传配置（与示例完全对齐） =====================
// 视频存储目录（项目根目录/assets/videos）
const uploadDir = path.join(__dirname, '../assets/videos');

const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.random().toString(36).substr(2, 9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const videoFilter = (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm'];
    const fileSize = req.headers['content-length'] ? parseInt(req.headers['content-length']) : 0;
    const maxSize = 50 * 1024 * 1024;

    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error('仅支持 MP4、WebM 格式的视频'), false);
    }
    if (fileSize > maxSize) {
        return cb(new Error('视频大小不能超过 50MB'), false);
    }
    cb(null, true);
};

const uploadVideo = multer({
    storage: videoStorage,
    fileFilter: videoFilter,
    limits: { fileSize: 50 * 1024 * 1024 }
});

// ===================== 3. 通用工具函数（与示例对齐） =====================
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

/**
 * 验证道具类型是否合法
 */
const isValidNadeType = (type) => {
  const validTypes = ['smoke', 'flash', 'molotov', 'he', 'decoy'];
  return validTypes.includes(type);
};

// ===================== 4. 点位(nade_spots) CRUD（完整实现+权限控制） =====================
/**
 * 获取所有点位（公开访问，支持map_id筛选）
 * GET /api/position/spots?map_id=1
 * 返回格式：{ [map_key]: [{ type, title, land, throws }, ...] }
 */
router.get('/spots', async (req, res) => {
  try {
    const { map_id } = req.query;
    let sql = `
      SELECT ns.*, m.map_key, m.map_name 
      FROM nade_spots ns
      JOIN maps m ON ns.map_id = m.id
    `;
    const params = [];

    if (map_id) {
      if (isNaN(Number(map_id))) {
        return res.status(400).json({ code: 400, message: 'map_id必须为数字', data: null });
      }
      sql += ' WHERE ns.map_id = ?';
      params.push(Number(map_id));
    }

    // 查询点位及关联地图key
    const [spots] = await db.query(sql, params);
    if (spots.length === 0) {
      return res.json({ code: 200, message: '获取点位列表成功', data: {} });
    }

    // 批量查询所有关联的投掷点
    const spotIds = spots.map(spot => spot.spot_id);
    const [throws] = await db.query(
      'SELECT * FROM nade_throws WHERE spot_id IN (?)',
      [spotIds]
    );

    // 构建投掷点映射表（按spot_id分组）
    const throwsMap = {};
    throws.forEach(throwItem => {
      const key = throwItem.spot_id;
      if (!throwsMap[key]) throwsMap[key] = [];
      throwsMap[key].push({
        throw_id: throwItem.throw_id,
        x: Number(throwItem.throw_x),
        y: Number(throwItem.throw_y),
        videoUrl: throwItem.video_url,
        throw_desc: throwItem.throw_desc
      });
    });

    // 按map_key分组构建最终结果
    const result = {};
    spots.forEach(spot => {
      const mapKey = spot.map_key;
      if (!result[mapKey]) result[mapKey] = [];
      
      result[mapKey].push({
        id: spot.spot_id,
        map_key: mapKey,
        map_name: spot.map_name,
        type: spot.nade_type,
        title: spot.spot_title,
        land_x: Number(spot.land_x),
        land_y: Number(spot.land_y),
        spot_desc: spot.spot_desc,
        throws: throwsMap[spot.spot_id] || []
      });
    });

    res.json({ code: 200, message: '获取点位列表成功', data: result });
  } catch (error) {
    handleError(res, error, '获取点位列表');
  }
});

/**
 * 获取单个点位（按mapKey+id，适配前端传参）
 * GET /api/position/spots/:mapKey/:id
 * 权限：需登录（verifyLogin）
 */
router.get('/spots/:mapKey/:id', verifyLogin, async (req, res) => {
  try {
    // 1. 获取前端传递的参数
    const { mapKey, id } = req.params;

    // 2. 关联查询：先通过mapKey查maps表的map_id，再查nade_spots点位详情，关联nade_throws投掷点
    const sql = `
      SELECT 
        ns.spot_id,
        ns.map_id,
        ns.nade_type,
        ns.spot_title,
        ns.land_x,
        ns.land_y,
        ns.spot_desc,
        m.map_key,
        m.map_name,
        m.map_image_url,
        -- 关联查询该点位下的所有投掷点
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'throw_id', nt.throw_id,
            'throw_x', nt.throw_x,
            'throw_y', nt.throw_y,
            'video_url', nt.video_url,
            'throw_desc', nt.throw_desc
          )
        ) AS throws
      FROM nade_spots ns
      LEFT JOIN maps m ON ns.map_id = m.id
      LEFT JOIN nade_throws nt ON ns.spot_id = nt.spot_id
      WHERE m.map_key = ? AND ns.spot_id = ?
      GROUP BY ns.spot_id, m.id
    `;

    // 3. 执行SQL查询（改用async/await统一风格）
    const [results] = await db.query(sql, [mapKey, id]);

    // 3.1 处理点位不存在的情况（返回404但提示更精准）
    if (results.length === 0) {
      return res.status(404).json({
        code: 404,
        message: `未找到 mapKey=${mapKey} 下 spot_id=${id} 的点位`,
        data: null
      });
    }

    // 3.2 处理查询结果（解构数组，清理空值）
    const spotDetail = results[0];
    spotDetail.throws = spotDetail.throws === null ? [] : spotDetail.throws; // 无投掷点时返回空数组
    // 转换数字类型确保前端兼容
    spotDetail.spot_id = Number(spotDetail.spot_id);
    spotDetail.map_id = Number(spotDetail.map_id);
    spotDetail.land_x = Number(spotDetail.land_x);
    spotDetail.land_y = Number(spotDetail.land_y);
    spotDetail.throws.forEach(throwItem => {
      if (throwItem.throw_id) throwItem.throw_id = Number(throwItem.throw_id);
      if (throwItem.throw_x) throwItem.throw_x = Number(throwItem.throw_x);
      if (throwItem.throw_y) throwItem.throw_y = Number(throwItem.throw_y);
    });

    // 3.4 返回成功响应
    res.status(200).json({
      code: 200,
      message: '获取点位详情成功',
      data: spotDetail
    });
  } catch (error) {
    handleError(res, error, '获取点位详情');
  }
});

/**
 * 获取单个点位（按spotId，兼容原有接口）
 * GET /api/position/spots/:spotId
 * 公开访问
 */
router.get('/spots/:spotId', async (req, res) => {
  try {
    const { spotId } = req.params;
    if (isNaN(Number(spotId))) {
      return res.status(400).json({ code: 400, message: 'spot_id必须为数字', data: null });
    }

    // 查询点位信息及关联地图key
    const [spotRows] = await db.query(
      `
        SELECT ns.*, m.map_key, m.map_name 
        FROM nade_spots ns
        JOIN maps m ON ns.map_id = m.id
        WHERE ns.spot_id = ?
      `,
      [Number(spotId)]
    );
    if (spotRows.length === 0) {
      return res.status(404).json({ code: 404, message: '点位不存在', data: null });
    }
    const spot = spotRows[0];

    // 查询关联投掷点
    const [throwRows] = await db.query(
      'SELECT * FROM nade_throws WHERE spot_id = ?',
      [Number(spotId)]
    );

    // 格式化投掷点数据
    const throws = throwRows.map(throwItem => ({
      throw_id: throwItem.throw_id,
      x: Number(throwItem.throw_x),
      y: Number(throwItem.throw_y),
      videoUrl: throwItem.video_url,
      throw_desc: throwItem.throw_desc
    }));

    // 构建最终结果
    const result = {
      [spot.map_key]: [
        {
          id: spot.spot_id,
          type: spot.nade_type,
          title: spot.spot_title,
          land_x: Number(spot.land_x),
          land_y: Number(spot.land_y),
          spot_desc: spot.spot_desc,
          throws: throws
        }
      ]
    };

    res.json({
      code: 200,
      message: '获取点位详情成功',
      data: result
    });
  } catch (error) {
    handleError(res, error, '获取点位详情');
  }
});

/**
 * 创建点位（仅管理员可操作）
 * POST /api/position/spots
 * 请求头：Authorization: Bearer 0
 * Body: { map_id, nade_type, spot_title, land_x, land_y, spot_desc }
 */
router.post('/spots', verifyLogin, verifyAdmin, async (req, res) => {
  try {
    const { map_id, nade_type, spot_title, land_x, land_y, spot_desc = '' } = req.body;

    // 必填项校验
    const required = ['map_id', 'nade_type', 'spot_title', 'land_x', 'land_y'];
    const missing = required.filter(key => !req.body[key]);
    if (missing.length > 0) {
      return res.status(400).json({
        code: 400,
        message: `缺少必填参数：${missing.join(', ')}`,
        data: null
      });
    }

    // 数据类型校验
    if (isNaN(Number(map_id)) || isNaN(Number(land_x)) || isNaN(Number(land_y))) {
      return res.status(400).json({
        code: 400,
        message: 'map_id/land_x/land_y必须为数字',
        data: null
      });
    }
    if (!isValidNadeType(nade_type)) {
      return res.status(400).json({
        code: 400,
        message: 'nade_type仅支持：smoke/flash/molotov/he/decoy',
        data: null
      });
    }
    if (spot_title.length > 64 || spot_desc.length > 255) {
      return res.status(400).json({
        code: 400,
        message: '点位标题不超过64字符，描述不超过255字符',
        data: null
      });
    }

    // 插入数据库
    const [result] = await db.query(
      `INSERT INTO nade_spots 
       (map_id, nade_type, spot_title, land_x, land_y, spot_desc) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [Number(map_id), nade_type, spot_title, Number(land_x), Number(land_y), spot_desc]
    );

    res.status(201).json({
      code: 201,
      message: '创建点位成功',
      data: { spot_id: result.insertId }
    });
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        code: 400,
        message: 'map_id不存在（关联maps表失败）',
        data: null
      });
    }
    handleError(res, error, '创建点位');
  }
});

/**
 * 更新点位（仅管理员可操作）
 * PUT /api/position/spots/:spotId
 * 请求头：Authorization: Bearer 0
 * Body: { map_id, nade_type, spot_title, land_x, land_y, spot_desc }
 */
router.put('/spots/:spotId', verifyLogin, verifyAdmin, async (req, res) => {
  try {
    const { spotId } = req.params;
    const { map_id, nade_type, spot_title, land_x, land_y, spot_desc } = req.body;

    // 基础校验
    if (isNaN(Number(spotId))) {
      return res.status(400).json({ code: 400, message: 'spot_id必须为数字', data: null });
    }

    // 检查点位是否存在
    const [exist] = await db.query(
      'SELECT 1 FROM nade_spots WHERE spot_id = ?',
      [Number(spotId)]
    );
    if (exist.length === 0) {
      return res.status(404).json({ code: 404, message: '点位不存在', data: null });
    }

    // 构建更新字段
    const updateFields = [];
    const params = [];
    if (map_id !== undefined) {
      if (isNaN(Number(map_id))) return res.status(400).json({ code: 400, message: 'map_id必须为数字', data: null });
      updateFields.push('map_id = ?');
      params.push(Number(map_id));
    }
    if (nade_type) {
      if (!isValidNadeType(nade_type)) return res.status(400).json({ code: 400, message: 'nade_type格式错误', data: null });
      updateFields.push('nade_type = ?');
      params.push(nade_type);
    }
    if (spot_title) {
      if (spot_title.length > 64) return res.status(400).json({ code: 400, message: '标题不超过64字符', data: null });
      updateFields.push('spot_title = ?');
      params.push(spot_title);
    }
    if (land_x !== undefined) {
      if (isNaN(Number(land_x))) return res.status(400).json({ code: 400, message: 'land_x必须为数字', data: null });
      updateFields.push('land_x = ?');
      params.push(Number(land_x));
    }
    if (land_y !== undefined) {
      if (isNaN(Number(land_y))) return res.status(400).json({ code: 400, message: 'land_y必须为数字', data: null });
      updateFields.push('land_y = ?');
      params.push(Number(land_y));
    }
    if (spot_desc !== undefined) {
      if (spot_desc.length > 255) return res.status(400).json({ code: 400, message: '描述不超过255字符', data: null });
      updateFields.push('spot_desc = ?');
      params.push(spot_desc);
    }

    // 无更新字段
    if (updateFields.length === 0) {
      return res.status(400).json({ code: 400, message: '无更新字段', data: null });
    }

    // 执行更新
    params.push(Number(spotId));
    await db.query(
      `UPDATE nade_spots SET ${updateFields.join(', ')} WHERE spot_id = ?`,
      params
    );

    res.json({ code: 200, message: '更新点位成功', data: null });
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ code: 400, message: 'map_id不存在', data: null });
    }
    handleError(res, error, '更新点位');
  }
});

/**
 * 删除点位（仅管理员可操作，级联删除投掷点+视频）
 * DELETE /api/position/spots/:spotId
 * 请求头：Authorization: Bearer 0
 */
router.delete('/spots/:spotId', verifyLogin, verifyAdmin, async (req, res) => {
  try {
    const { spotId } = req.params;
    if (isNaN(Number(spotId))) {
      return res.status(400).json({ code: 400, message: 'spot_id必须为数字', data: null });
    }

    // 检查点位存在
    const [exist] = await db.query(
      'SELECT 1 FROM nade_spots WHERE spot_id = ?',
      [Number(spotId)]
    );
    if (exist.length === 0) {
      return res.status(404).json({ code: 404, message: '点位不存在', data: null });
    }

    // 先删除关联视频文件
    const [throws] = await db.query(
      'SELECT video_url FROM nade_throws WHERE spot_id = ?',
      [Number(spotId)]
    );
    throws.forEach(item => {
      if (item.video_url) {
        const filename = item.video_url.split('/').pop();
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    });

    // 删除投掷点（级联删除，也可手动删）
    await db.query('DELETE FROM nade_throws WHERE spot_id = ?', [Number(spotId)]);
    
    // 删除点位
    await db.query('DELETE FROM nade_spots WHERE spot_id = ?', [Number(spotId)]);

    res.json({ code: 200, message: '删除点位及关联数据成功', data: null });
  } catch (error) {
    handleError(res, error, '删除点位');
  }
});

// ===================== 5. 投掷点(nade_throws) CRUD（完整实现+权限控制） =====================
/**
 * 获取指定点位的投掷点（公开访问）
 * GET /api/position/spots/:spotId/throws
 */
router.get('/spots/:spotId/throws', async (req, res) => {
  try {
    const { spotId } = req.params;
    if (isNaN(Number(spotId))) {
      return res.status(400).json({ code: 400, message: 'spot_id必须为数字', data: null });
    }

    // 检查点位存在
    const [spotExist] = await db.query(
      'SELECT 1 FROM nade_spots WHERE spot_id = ?',
      [Number(spotId)]
    );
    if (spotExist.length === 0) {
      return res.status(404).json({ code: 404, message: '点位不存在', data: null });
    }

    // 查询投掷点
    const [rows] = await db.query(
      'SELECT * FROM nade_throws WHERE spot_id = ?',
      [Number(spotId)]
    );

    // 格式化数据
    const throws = rows.map(item => ({
      throw_id: item.throw_id,
      spot_id: item.spot_id,
      x: Number(item.throw_x),
      y: Number(item.throw_y),
      video_url: item.video_url,
      throw_desc: item.throw_desc
    }));

    res.json({ code: 200, message: '获取投掷点列表成功', data: throws });
  } catch (error) {
    handleError(res, error, '获取投掷点列表');
  }
});

/**
 * 获取单个投掷点（公开访问）
 * GET /api/position/throws/:throwId
 */
router.get('/throws/:throwId', async (req, res) => {
  try {
    const { throwId } = req.params;
    if (isNaN(Number(throwId))) {
      return res.status(400).json({ code: 400, message: 'throw_id必须为数字', data: null });
    }

    const [rows] = await db.query(
      'SELECT * FROM nade_throws WHERE throw_id = ?',
      [Number(throwId)]
    );
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '投掷点不存在', data: null });
    }

    // 格式化数据
    const throwItem = {
      throw_id: rows[0].throw_id,
      spot_id: rows[0].spot_id,
      x: Number(rows[0].throw_x),
      y: Number(rows[0].throw_y),
      video_url: rows[0].video_url,
      throw_desc: rows[0].throw_desc
    };

    res.json({ code: 200, message: '获取投掷点详情成功', data: throwItem });
  } catch (error) {
    handleError(res, error, '获取投掷点详情');
  }
});

/**
 * 创建投掷点（仅管理员可操作，支持视频上传）
 * POST /api/position/spots/:spotId/throws
 * 请求头：Authorization: Bearer 0
 * FormData: { throw_x, throw_y, throw_desc, video }
 */
router.post('/spots/:spotId/throws', verifyLogin, verifyAdmin, uploadVideo.single('video'), async (req, res) => {
  try {
    const { spotId } = req.params;
    const { throw_x, throw_y, throw_desc = '' } = req.body;

    // 基础校验
    if (isNaN(Number(spotId))) return res.status(400).json({ code: 400, message: 'spot_id必须为数字', data: null });

    // 必填项校验
    const missing = [];
    if (!throw_x) missing.push('throw_x');
    if (!throw_y) missing.push('throw_y');
    if (!req.file) missing.push('video'); // 必须上传视频
    if (missing.length > 0) {
      return res.status(400).json({
        code: 400,
        message: `缺少必填项：${missing.join(', ')}`,
        data: null
      });
    }

    // 数据类型校验
    if (isNaN(Number(throw_x)) || isNaN(Number(throw_y))) {
      return res.status(400).json({ code: 400, message: 'throw_x/throw_y必须为数字', data: null });
    }
    if (throw_desc.length > 255) {
      return res.status(400).json({ code: 400, message: '投掷点描述不超过255字符', data: null });
    }

    // 检查关联点位存在
    const [spotExist] = await db.query(
      'SELECT 1 FROM nade_spots WHERE spot_id = ?',
      [Number(spotId)]
    );
    if (spotExist.length === 0) {
      return res.status(404).json({ code: 404, message: '关联点位不存在', data: null });
    }

    // 构建视频访问URL（适配前端路径）
    const videoUrl = `/assets/videos/${req.file.filename}`;

    // 插入数据库
    const [result] = await db.query(
      `INSERT INTO nade_throws 
       (spot_id, throw_x, throw_y, video_url, throw_desc) 
       VALUES (?, ?, ?, ?, ?)`,
      [Number(spotId), Number(throw_x), Number(throw_y), videoUrl, throw_desc]
    );

    res.status(201).json({
      code: 201,
      message: '创建投掷点成功',
      data: { throw_id: result.insertId, video_url: videoUrl }
    });
  } catch (error) {
    // 上传错误特殊处理
    if (error.message.includes('仅支持') || error.message.includes('大小')) {
      return res.status(400).json({ code: 400, message: error.message, data: null });
    }
    handleError(res, error, '创建投掷点');
  }
});

/**
 * 更新投掷点（仅管理员可操作，支持重新上传视频）
 * PUT /api/position/throws/:throwId
 * 请求头：Authorization: Bearer 0
 * FormData: { throw_x, throw_y, throw_desc, video }（video可选）
 */
router.put('/throws/:throwId', verifyLogin, verifyAdmin, uploadVideo.single('video'), async (req, res) => {
  try {
    const { throwId } = req.params;
    const { throw_x, throw_y, throw_desc } = req.body;

    // 基础校验
    if (isNaN(Number(throwId))) {
      return res.status(400).json({ code: 400, message: 'throw_id必须为数字', data: null });
    }

    // 检查投掷点存在
    const [exist] = await db.query(
      'SELECT * FROM nade_throws WHERE throw_id = ?',
      [Number(throwId)]
    );
    if (exist.length === 0) {
      return res.status(404).json({ code: 404, message: '投掷点不存在', data: null });
    }

    // 构建更新字段
    const updateFields = [];
    const params = [];
    if (throw_x !== undefined) {
      if (isNaN(Number(throw_x))) return res.status(400).json({ code: 400, message: 'throw_x必须为数字', data: null });
      updateFields.push('throw_x = ?');
      params.push(Number(throw_x));
    }
    if (throw_y !== undefined) {
      if (isNaN(Number(throw_y))) return res.status(400).json({ code: 400, message: 'throw_y必须为数字', data: null });
      updateFields.push('throw_y = ?');
      params.push(Number(throw_y));
    }
    if (throw_desc !== undefined) {
      if (throw_desc.length > 255) return res.status(400).json({ code: 400, message: '描述不超过255字符', data: null });
      updateFields.push('throw_desc = ?');
      params.push(throw_desc);
    }

    // 处理视频更新
    let newVideoUrl = null;
    if (req.file) {
      // 新视频URL
      newVideoUrl = `http://${req.headers.host}/assets/videos/${req.file.filename}`;
      updateFields.push('video_url = ?');
      params.push(newVideoUrl);

      // 删除旧视频文件
      const oldUrl = exist[0].video_url;
      if (oldUrl) {
        const oldFilename = oldUrl.split('/').pop();
        const oldPath = path.join(uploadDir, oldFilename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    // 无更新字段
    if (updateFields.length === 0) {
      return res.status(400).json({ code: 400, message: '无更新字段', data: null });
    }

    // 执行更新
    params.push(Number(throwId));
    await db.query(
      `UPDATE nade_throws SET ${updateFields.join(', ')} WHERE throw_id = ?`,
      params
    );

    res.json({
      code: 200,
      message: '更新投掷点成功',
      data: newVideoUrl ? { video_url: newVideoUrl } : null
    });
  } catch (error) {
    if (error.message.includes('仅支持') || error.message.includes('大小')) {
      return res.status(400).json({ code: 400, message: error.message, data: null });
    }
    handleError(res, error, '更新投掷点');
  }
});

/**
 * 删除投掷点（仅管理员可操作，同时删除视频文件）
 * DELETE /api/position/throws/:throwId
 * 请求头：Authorization: Bearer 0
 */
router.delete('/throws/:throwId', verifyLogin, verifyAdmin, async (req, res) => {
  try {
    const { throwId } = req.params;
    if (isNaN(Number(throwId))) {
      return res.status(400).json({ code: 400, message: 'throw_id必须为数字', data: null });
    }

    // 查询投掷点信息
    const [exist] = await db.query(
      'SELECT video_url FROM nade_throws WHERE throw_id = ?',
      [Number(throwId)]
    );
    if (exist.length === 0) {
      return res.status(404).json({ code: 404, message: '投掷点不存在', data: null });
    }

    // 删除视频文件
    const videoUrl = exist[0].video_url;
    if (videoUrl) {
      const filename = videoUrl.split('/').pop();
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    // 删除数据库记录
    await db.query('DELETE FROM nade_throws WHERE throw_id = ?', [Number(throwId)]);

    res.json({ code: 200, message: '删除投掷点及视频成功', data: null });
  } catch (error) {
    handleError(res, error, '删除投掷点');
  }
});

// ===================== 6. 独立视频上传接口（适配前端单独上传场景） =====================
/**
 * 视频上传接口（仅管理员可访问）
 * POST /api/position/uploadVideo
 * 请求头：Authorization: Bearer 0
 * FormData: { video }
 */
router.post('/uploadVideo', verifyLogin, verifyAdmin, uploadVideo.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        code: 400,
        message: '未选择视频文件',
        data: null
      });
    }

    // 视频访问URL（前端可直接访问）
    const videoUrl = `http://${req.headers.host}/assets/videos/${req.file.filename}`;
    res.status(200).json({
      code: 200,
      message: '视频上传成功',
      data: { url: videoUrl }
    });
  } catch (error) {
    handleError(res, error, '视频上传'); // 复用现有错误处理
  }
});

// ===================== 7. 导出路由 =====================
module.exports = router;