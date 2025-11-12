// 生成 123456 的 bcrypt 哈希
const bcrypt = require('bcrypt');

(async () => {
  const plainPassword = '123456'; // 明文密码
  const saltRounds = 10; // 加密强度（默认10，无需修改）
  const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

  console.log('明文密码：', plainPassword);
  console.log('对应的 bcrypt 哈希（复制下面这行到 SQL 中）：');
  console.log(passwordHash); // 示例输出：$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
})();