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
});