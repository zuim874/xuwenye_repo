// user-avatar.js 完整修复版
async function loadAndDisplayUserAvatar(userId) {
  // 第一步：兜底获取userId，避免传入undefined
  let validUserId = userId || localStorage.getItem('userId');
  
  // 第二步：严格校验，打印清晰日志（方便排查）
  if (!validUserId || validUserId === 'undefined' || validUserId === 'null') {
    console.error('无效的userId，跳过头像加载:', validUserId, '| 请检查localStorage是否有userId');
    // 兜底显示用户名首字母（避免页面空着）
    showUserInitial();
    return;
  }

  try {
    // 第三步：调用头像接口，必须传x-login-user-id请求头（之前可能漏了）
    const response = await fetch(`/api/users/${validUserId}/avatar`, {
      method: 'GET',
      headers: {
        'x-login-user-id': validUserId, // 接口要求的登录态，必须传
        'Content-Type': 'application/json'
      }
    });

    const res = await response.json();
    if (res.code !== 200) {
      console.warn('头像接口返回失败:', res.message);
      showUserInitial();
      return;
    }

    // 第四步：渲染头像（接口返回的是res.data.avatar，不是avatarUrl！）
    const avatarUrl = res.data.avatar;
    if (avatarUrl) {
      replaceInitialsWithAvatar(avatarUrl);
    } else {
      showUserInitial(); // 无头像时显示首字母
    }
  } catch (error) {
    console.error('加载头像出错:', error);
    showUserInitial();
  }
}

// 显示用户名前三位（兜底函数）
function showUserInitial() {
  const username = localStorage.getItem('currentUser') || '未知用户';
  const initial = username.substring(0, 3).toUpperCase();
  const initialElement = document.getElementById('userNamePrefix');
  if (initialElement) {
    initialElement.textContent = initial;
    initialElement.style.display = 'block'; // 显示首字母
  }
  // 隐藏可能存在的空头像img
  const avatarImg = document.querySelector('.avatar-image');
  if (avatarImg) avatarImg.style.display = 'none';
}

// 替换首字母为头像
function replaceInitialsWithAvatar(avatarUrl) {
  const initialElement = document.getElementById('userNamePrefix');
  if (!initialElement) return;

  // 创建img标签（避免直接改src导致的加载问题）
  const img = document.createElement('img');
  img.src = avatarUrl;
  img.className = 'avatar-image';
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.borderRadius = '50%';
  
  // 头像加载失败时，回退到首字母
  img.onerror = function() {
    console.warn('头像图片加载失败，回退到首字母:', avatarUrl);
    showUserInitial();
  };

  // 替换DOM
  initialElement.innerHTML = '';
  initialElement.appendChild(img);
  initialElement.style.display = 'block';
}

// 页面加载时自动执行（确保调用时传对参数）
document.addEventListener('DOMContentLoaded', () => {
  // 直接从localStorage拿userId调用，避免传undefined
  loadAndDisplayUserAvatar(localStorage.getItem('userId'));
});