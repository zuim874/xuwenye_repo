CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(20) NOT NULL UNIQUE, -- 用户名唯一（保留原字段）
    password_hash VARCHAR(100) NOT NULL, -- 加密密码（保留原字段）
    is_online TINYINT(1) NOT NULL DEFAULT 0, -- 登录状态：0=离线（默认），1=在线
    last_login TIMESTAMP NULL, -- 可选：记录最后登录时间（增强功能）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 给users表新增last_active字段，记录最后活跃时间
ALTER TABLE users 
ADD COLUMN last_active TIMESTAMP NULL;

-- 插入测试用户：用户名 testuser，密码 123456（已加密）
INSERT INTO users (username, password_hash)
VALUES (
  'cyy', 
  '$2b$10$e1q1w/P8LYULId.BFOZlJ.vEioCxCoMSMV.9uedilN8bbWaBKmbRa' -- 替换为你的 bcrypt 加密密码
);
 
SELECT * FROM users;
-- 手动查询数据库，看是否有 online 用户
SELECT username, is_online FROM users WHERE is_online = 1;
USE 你的数据库名;  -- 替换为实际数据库名
SELECT username, password FROM users WHERE username = 'xwy';