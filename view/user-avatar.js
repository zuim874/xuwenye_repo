/**
 * 统一用户头像渲染方法
 * @param {HTMLElement} container 头像容器
 * @param {String|Number} userId 用户ID
 * @param {String} userName 用户名（用于首字母兜底）
 */
async function renderUserAvatar(container, userId, userName = '') {
  if (!container) return;

  // 兜底首字母
  const fallbackText = (userName || 'U')
    .substring(0, 2)
    .toUpperCase();

  container.textContent = fallbackText;
  container.classList.add('avatar');

  if (!userId || userId === 'undefined') {
    return;
  }

  try {
    const res = await fetch(`/api/users/${userId}/avatar`, {
      headers: {
        'x-login-user-id': localStorage.getItem('userId')
      }
    }).then(r => r.json());

    if (res.code === 200 && res.data && res.data.avatar) {
      const img = document.createElement('img');
      img.src = res.data.avatar;
      img.className = 'avatar-image';

      img.onerror = () => {
        container.textContent = fallbackText;
      };

      container.innerHTML = '';
      container.appendChild(img);
    }
  } catch (err) {
    console.warn('头像加载失败:', err);
  }
}

/**
 * 页面级：自动渲染当前登录用户头像（导航栏）
 */
document.addEventListener('DOMContentLoaded', () => {
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('currentUser');

  const navAvatar = document.getElementById('userNamePrefix');
  if (navAvatar) {
    renderUserAvatar(navAvatar, userId, userName);
  }
});
