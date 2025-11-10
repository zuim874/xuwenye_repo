-- 创建用户表
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(20) NOT NULL UNIQUE, -- 用户名唯一
    password VARCHAR(100) NOT NULL, -- 存储加密后的密码
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入测试用户：用户名 testuser，密码 123456（已加密）
INSERT INTO users (username, password)
VALUES (
  'xwy', 
  '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' -- 替换为你的 bcrypt 加密密码
);

SELECT * FROM users;