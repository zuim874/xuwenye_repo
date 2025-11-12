document.addEventListener('DOMContentLoaded', function () {
  // DOM元素获取（保持和HTML ID一致）
  const loginBtnArea = document.getElementById('loginBtnArea');
  const userArea = document.getElementById('userArea');
  const userNamePrefix = document.getElementById('userNamePrefix');
  const logoutBtn = document.getElementById('logoutBtn');
  let heartbeatTimer = window.heartbeatTimer || null;
  let inactivityTimer = null;

  // 1. 还原用户名前三位显示（已修复，无改动）
  let currentUser = localStorage.getItem('currentUser'); // 初始获取
  if (currentUser) {
    loginBtnArea.style.display = 'none';
    userArea.style.display = 'block';
    const prefix = currentUser.substring(0, 3);
    userNamePrefix.textContent = prefix.toUpperCase();
    userNamePrefix.style.cursor = 'pointer';
    startHeartbeat(); // 登录后启动心跳
  } else {
    loginBtnArea.style.display = 'block';
    userArea.style.display = 'none';
  }

  // 2. 注销功能（无改动）
  logoutBtn.addEventListener('click', async function(e) {
    e.stopPropagation();
    currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      window.location.reload();
      return;
    }

    try {
      await fetch('/api/users/logout', { // 注意：注销接口路径是 /api/users/logout（之前可能写错）
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser })
      });
      stopHeartbeat();
      localStorage.removeItem('currentUser');
      window.location.reload();
    } catch (error) {
      console.error('注销错误:', error);
      alert(error.message || '注销失败');
    }
  });

  // 3. 点击其他区域关闭注销按钮（无改动）
  document.addEventListener('click', function() {
    logoutBtn.style.display = 'none';
  });

  // 4. 点击用户名前缀显示注销按钮（无改动）
  userNamePrefix.addEventListener('click', function(e) {
    e.stopPropagation();
    logoutBtn.style.display = logoutBtn.style.display === 'block' ? 'none' : 'block';
  });

  // 5. 登录按钮跳转（无改动）
  const loginBtn = loginBtnArea.querySelector('a');
  if (loginBtn) {
    loginBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = 'login.html';
    });
  }

  // 6. 核心修复：心跳函数（解决 username=undefined 问题）
  function startHeartbeat() {
    // 避免重复启动
    if (heartbeatTimer) clearInterval(heartbeatTimer);

    // 每30秒发送一次心跳（每次发送前重新获取 currentUser，避免过期）
    heartbeatTimer = setInterval(async () => {
      // 关键修复：每次发送前重新从localStorage取currentUser（防止中途被清除）
      currentUser = localStorage.getItem('currentUser');

      // 检查：如果currentUser不存在（已注销/过期），停止心跳并跳登录页
      if (!currentUser) {
        stopHeartbeat();
        window.location.href = 'login.html';
        return;
      }

      try {
        // 发送心跳请求（此时username一定有值）
        const response = await fetch('/api/users/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: currentUser }) // 现在不会是 undefined 了
        });

        if (!response.ok) throw new Error('心跳失败');
      } catch (error) {
        console.error('心跳错误:', error);
        stopHeartbeat();
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
      }
    }, 30000);

    window.heartbeatTimer = heartbeatTimer;
  }

  // 7. 停止心跳（无改动）
  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
      window.heartbeatTimer = null;
    }
  }

  // 8. 在线人数查询（无改动）
  async function showOnlineCount() {
    try {
      const res = await fetch('/api/users/online_users');
      const result = await res.json();
      if (result.code === 200) {
        console.log('在线人数:', result.data.onlineCount);
      }
    } catch (err) {
      console.error('查询在线人数失败:', err);
    }
  }
  showOnlineCount();

  // 30s无操作自动登出功能


// 重置无操作计时器（用户有操作时触发，仅负责重置计时，不做其他操作）
function resetInactivityTimer() {
  // 清除现有计时器，避免重复计时
  clearTimeout(inactivityTimer);
  
  // 重新设置30秒计时器，超时后执行自动登出逻辑
  inactivityTimer = setTimeout(async () => {
    // 👉 只有超时后，才执行以下登出逻辑
    try {
      // 1. 先停止心跳（避免登出后心跳继续发送，覆盖 is_online=0）
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null; // 清空标记，避免重复停止
      }

      // 2. 获取用户名（必须先获取，避免 undefined）
      const username = localStorage.getItem('currentUser');
      if (!username) {
        console.log('未找到登录用户，直接跳转登录页');
        window.location.href = 'login.html';
        return;
      }

      // 3. 调用后端登出接口（更新数据库 is_online=0）
      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }), // 传递获取到的用户名
      });

      const result = await response.json();
      if (result.code === 200) {
        console.log('自动登出成功');
      } else {
        console.error('自动登出接口返回失败：', result.message);
      }
    } catch (err) {
      console.error('自动登出接口调用失败：', err);
    } finally {
      // 4. 无论接口是否成功，都清除本地用户信息并跳转登录页
      localStorage.removeItem('currentUser');
      window.location.href = 'login.html';
    }
  }, 60000); // 30秒阈值
  }

  // 监听用户交互事件
  document.addEventListener('click', resetInactivityTimer);
  document.addEventListener('keydown', resetInactivityTimer);

  // 初始化时启动计时器
  resetInactivityTimer();
});