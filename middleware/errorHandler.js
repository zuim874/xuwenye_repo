// middleware/errorHandler.js
// 统一捕获所有接口的错误，避免返回杂乱的错误信息
const errorHandler = (err, req, res, next) => {
  console.error('接口错误：', err.stack);

  // 返回统一的错误响应格式
  res.status(500).json({
    message: '服务器内部错误，请稍后重试',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined // 开发环境显示错误详情
  });
};

module.exports = { errorHandler };