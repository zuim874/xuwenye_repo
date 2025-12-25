  document.addEventListener('DOMContentLoaded', function () {
  // DOM元素获取（保持和HTML ID一致）
  const loginBtnArea = document.getElementById('loginBtnArea');
  const userArea = document.getElementById('userArea');
  const userNamePrefix = document.getElementById('userNamePrefix');
  const logoutBtn = document.getElementById('logoutBtn');
  let heartbeatTimer = window.heartbeatTimer || null;
  let inactivityTimer = null;  
  const userInfo = document.querySelector('.user-info');
  const myinfoBtn = document.getElementById('myinfoBtn');

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
        window.location.href = './account/login.html';
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
        localStorage.removeItem('userId');
        window.location.href = './account/login.html';
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
            window.location.href = './account/login.html';
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
        localStorage.removeItem('userId');
        window.location.href = './account/login.html';
        }
    }, 300000); // 300秒阈值
    }

        // 点击用户名显示/隐藏菜单
    userInfo?.addEventListener('click', function(e) {
        e.stopPropagation(); // 阻止事件冒泡
        const isVisible = logoutBtn.style.display === 'block';
        logoutBtn.style.display = isVisible ? 'none' : 'block';
        myinfoBtn.style.display = isVisible ? 'none' : 'block';
        adminBtn.style.display = isVisible ? 'none' : 'block';
    });

    // 点击页面其他区域隐藏菜单
    document.addEventListener('click', function() {
        logoutBtn.style.display = 'none';
        myinfoBtn.style.display = 'none';
        adminBtn.style.display = 'none';
    });

    // 登出按钮事件
    logoutBtn?.addEventListener('click', async function(e) {
        e.stopPropagation();
        try {
            // 停止心跳
            if (window.heartbeatTimer) {
                clearInterval(window.heartbeatTimer);
                window.heartbeatTimer = null;
            }
            // 调用登出接口
            await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUser })
            });
        } catch (err) {
            console.error('登出失败:', err);
        } finally {
            // 清除本地存储并跳转登录页
            localStorage.removeItem('currentUser');
            localStorage.removeItem('userId');
            window.location.reload();
        }
    });

    // "我的"按钮事件（可根据需求跳转个人中心）
    myinfoBtn?.addEventListener('click', function(e) {
        e.stopPropagation();
        window.location.href = 'myinfo.html';
    });

    adminBtn?.addEventListener('click', function(e) {
        e.stopPropagation();
        window.location.href = 'manager/manager.html';
    });

  // 扩展：覆盖PC+移动端所有合理用户交互事件
  const userActivityEvents = [
      // PC端核心操作
      'click',        // 鼠标点击（按钮、链接、帖子等）
      'keydown',      // 键盘按键（输入、方向键、快捷键等）
      'mousemove',    // 鼠标移动（浏览页面时的鼠标滑动）
      'wheel',        // 鼠标滚轮（滚动页面、缩放等）
      'scroll',       // 页面滚动（滚轮、触摸、键盘方向键触发的滚动）
      'mouseup',      // 鼠标松开（点击后的收尾动作，补充点击完整性）
      'dblclick',     // 双击（双击查看、放大等操作）
      'focusin',      // 元素获得焦点（输入框、下拉框、按钮等）
      'input',        // 输入框输入（发帖、评论时的文字输入）
      'change',       // 表单元素变更（下拉选择、复选框、单选框等）
      // 移动端核心操作（适配手机/平板用户）
      'touchstart',   // 触摸开始（手指触碰屏幕）
      'touchmove',    // 触摸滑动（手指在屏幕上滑动浏览）
      'touchend',     // 触摸结束（手指离开屏幕，补充触摸完整性）
      'touchcancel',  // 触摸取消（意外中断触摸，如来电、弹窗）
      // 其他潜在操作
      'contextmenu',  // 右键菜单（右键点击操作）
      'selectstart'   // 文本选择（选中帖子内容、评论等）
  ];

  // 批量绑定事件：委托到document，确保动态元素（如JS渲染的帖子）也能触发
  userActivityEvents.forEach(event => {
      // passive: true 优化性能，避免滚动/触摸事件卡顿
      document.addEventListener(event, resetInactivityTimer, { passive: true });
  });

  // 初始化时启动计时器
  resetInactivityTimer();
});