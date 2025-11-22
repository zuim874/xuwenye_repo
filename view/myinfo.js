// DOM元素缓存（全局统一管理，避免重复DOM查询）
const DOM = {
    userNamePrefix: document.getElementById('userNamePrefix'),
    userArea: document.getElementById('userArea'),
    loginBtnArea: document.getElementById('loginBtnArea'),
    logoutBtn: document.getElementById('logoutBtn'),
    userMenu: document.getElementById('userMenu'),
    myPostsList: document.getElementById('myPostsList'),
    profileAvatar: document.getElementById('profileAvatar'),
    profileName: document.getElementById('profileName'),
    profileJoined: document.getElementById('profileJoined'),
    postCount: document.getElementById('postCount'),
    likeCount: document.getElementById('likeCount'),
    commentCount: document.getElementById('commentCount'),
    userInfo: document.querySelector('.user-info')
};

// 页面初始化入口（DOM加载完成后执行）
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus(); // 优先检查登录状态
    bindEvents(); // 绑定所有事件
});

/**
 * 绑定所有页面事件
 */
function bindEvents() {
    // 登出事件
    DOM.logoutBtn.addEventListener('click', logout);
    
    // 用户信息区域悬停事件（显示/隐藏菜单）
    DOM.userInfo.addEventListener('mouseenter', () => {
        DOM.userMenu.classList.add('show');
    });
    
    DOM.userInfo.addEventListener('mouseleave', () => {
        DOM.userMenu.classList.remove('show');
    });
}

/**
 * 检查用户登录状态
 * - 已登录：显示用户区域，加载资料和帖子
 * - 未登录：跳转登录页
 */
function checkLoginStatus() {
    const currentUser = localStorage.getItem('currentUser');
    const userId = localStorage.getItem('userId');

    console.log('登录状态检查:', { currentUser, userId });

    // 修复：降低检查标准，主要检查用户名即可
    if (!currentUser) {
        DOM.userArea.style.display = 'none';
        DOM.loginBtnArea.style.display = 'block';
        window.location.href = 'login.html';
        return;
    }

    // 已登录：初始化用户界面
    DOM.userArea.style.display = 'block';
    DOM.loginBtnArea.style.display = 'none';
    const userInitial = currentUser.charAt(0).toUpperCase();
    DOM.userNamePrefix.textContent = userInitial;
    DOM.profileAvatar.textContent = userInitial;
    DOM.profileName.textContent = currentUser;

    // 加载核心数据
    fetchUserProfile(userId);
    fetchUserPosts(userId);
}

/**
 * 获取用户详情（注册时间等）
 * @param {string} userId - 用户ID
 */
async function fetchUserProfile(userId) {
    try {
        const loginUserId = localStorage.getItem('userId');
        // 双重校验：防止 loginUserId 为空
        if (!loginUserId) throw new Error('用户登录状态异常');

        const response = await fetch(`/api/users/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // 新增：传递登录用户ID到请求头
                'X-Login-User-Id': localStorage.getItem('userId')
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: '获取资料失败' }));
            throw new Error(errorData.message || `错误码：${response.status}`);
        }

        const result = await response.json();
        if (result.code !== 200 || !result.data) {
            throw new Error('用户资料格式异常');
        }

        // 更新页面用户资料
        const userData = result.data;
        const joinDate = userData.created_at 
            ? new Date(userData.created_at).toLocaleDateString() 
            : '未知时间';
        DOM.profileJoined.textContent = `注册时间：${joinDate}`;

    } catch (error) {
        console.error('获取用户资料失败：', error);
        DOM.profileJoined.textContent = `注册时间：加载失败`;

        // Token过期/无效，强制登出
        handleAuthError(error.message);
    }
}

/**
 * 获取用户发布的帖子及统计数据
 * @param {string} userId - 用户ID
 * @param {string} token - 登录凭证Token
 */
async function fetchUserPosts(userId) {
    try {
        // 显示加载状态
        setLoadingState();

        const response = await fetch(`/api/users/${userId}/posts`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // 新增：传递登录用户ID到请求头
                'X-Login-User-Id': localStorage.getItem('userId')
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: '获取帖子失败' }));
            throw new Error(errorData.message || `错误码：${response.status}`);
        }

        const result = await response.json();
        if (result.code !== 200 || !result.data) {
            throw new Error('帖子数据格式异常');
        }

        const { posts, stats } = result.data;
        updateUserStats(stats); // 更新统计数据
        renderUserPosts(posts); // 渲染帖子列表

    } catch (error) {
        console.error('获取用户帖子失败：', error);
        setErrorState(error.message);

        // Token过期/无效，强制登出
        handleAuthError(error.message);
    }
}

/**
 * 更新用户统计数据（帖子数、获赞数、评论数）
 * @param {Object} stats - 后端返回的统计对象
 */
function updateUserStats(stats = {}) {
    DOM.postCount.textContent = stats.post_count || 0;
    DOM.likeCount.textContent = stats.total_likes || 0;
    DOM.commentCount.textContent = stats.total_comments || 0;
}

/**
 * 渲染用户帖子列表
 * @param {Array} posts - 帖子数组
 */
function renderUserPosts(posts) {
    if (!Array.isArray(posts) || posts.length === 0) {
        setEmptyState();
        return;
    }

    DOM.myPostsList.innerHTML = ''; // 清空加载状态

    posts.forEach(post => {
        const postCard = document.createElement('div');
        postCard.className = 'post-card';

        // 格式化帖子数据
        const formattedDate = formatRelativeDate(post.created_at);
        const tags = post.tags ? post.tags.split(',').map(tag => tag.trim()) : [];
        const authorInitial = DOM.profileName.textContent.charAt(0).toUpperCase();

        // 帖子卡片HTML结构
        postCard.innerHTML = `
            <div class="post-header">
                <div class="post-author">
                    <div class="author-avatar">${authorInitial}</div>
                    <div class="author-info">
                        <h4>${DOM.profileName.textContent}</h4>
                        <div class="post-date">${formattedDate}</div>
                    </div>
                </div>
                <div class="post-tags">
                    ${tags.map(tag => `<span class="post-tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
            </div>
            <div class="post-content">
                <h3>${escapeHtml(post.title)}</h3>
                <p>${escapeHtml(truncateContent(post.content, 100))}</p>
            </div>
            <div class="post-stats">
                <div class="post-stat">👍 ${post.like_count || 0}</div>
                <div class="post-stat">💬 ${post.comment_count || 0}</div>
                <div class="post-stat">👁 ${post.view_count || 0}</div>
            </div>
            ${post.video_url ? `<div class="post-video">
                <video src="${escapeHtml(post.video_url)}" controls></video>
            </div>` : ''}
            <div class="post-actions">
                <button class="edit-btn" data-id="${post.id}">✏️ 编辑</button>
                <button class="delete-btn" data-id="${post.id}">🗑️ 删除</button>
            </div>
        `;

        // 点击帖子卡片跳转到详情页（排除操作按钮）
        postCard.addEventListener('click', (e) => {
            if (!e.target.closest('.edit-btn') && !e.target.closest('.delete-btn')) {
                window.location.href = `post-detail.html?id=${post.id}`;
            }
        });

        // 编辑按钮：跳转至编辑页
        postCard.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = `edit-post.html?id=${post.id}`;
        });

        // 删除按钮：发送删除请求
        postCard.querySelector('.delete-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('确定要删除这篇帖子吗？此操作不可撤销！')) {
                await deletePost(post.id);
            }
        });

        DOM.myPostsList.appendChild(postCard);
    });
}

/**
 * 删除帖子
 * @param {string} postId - 帖子ID
 */
async function deletePost(postId) {
    try {
        const userId = localStorage.getItem('userId'); // 补充获取userId
        if (!userId) {
            throw new Error('用户未登录');
        }
        console.log('要删除的帖子ID：', postId);
        // 修正路径，添加 /users 层级，并携带登录用户ID请求头
        const response = await fetch(`/api/users/${userId}/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-Login-User-Id': userId // 保持与其他接口一致的权限校验方式
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: '删除失败' }));
            throw new Error(errorData.message);
        }

        // 删除成功后重新加载帖子列表
        fetchUserPosts(userId);
        alert('帖子删除成功！');

    } catch (error) {
        console.error('删除帖子失败：', error);
        alert(`删除失败：${error.message}`);
        handleAuthError(error.message);
    }
}

/**
 * 登出功能
 */
function logout() {
    // 清除本地存储的用户信息
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userId');
    
    // 跳转登录页
    window.location.href = 'login.html';
}

/**
 * 处理认证相关错误（Token过期等）
 * @param {string} errorMessage - 错误信息
 */
function handleAuthError(errorMessage) {
    console.error('发生错误:', errorMessage);
}

/**
 * 设置加载状态
 */
function setLoadingState() {
    DOM.myPostsList.innerHTML = '<div class="loading-indicator">加载中...</div>';
}

/**
 * 设置空状态（无帖子）
 */
function setEmptyState() {
    DOM.myPostsList.innerHTML = '<div class="empty-message">您还没有发布任何帖子，点击"发布新帖子"开始分享吧！</div>';
}

/**
 * 设置错误状态
 * @param {string} message - 错误信息
 */
function setErrorState(message) {
    DOM.myPostsList.innerHTML = `<div class="error-message">加载失败：${message}</div>`;
}

/**
 * 格式化相对日期
 * @param {string} dateString - 日期字符串
 * @returns {string} 相对时间描述
 */
function formatRelativeDate(dateString) {
    if (!dateString) return '未知时间';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 30) return `${diffDays}天前`;
    
    // 超过30天显示具体日期
    return date.toLocaleDateString();
}

/**
 * 截断内容
 * @param {string} content - 原始内容
 * @param {number} length - 最大长度
 * @returns {string} 截断后的内容
 */
function truncateContent(content, length) {
    if (!content) return '';
    return content.length > length ? content.substring(0, length) + '...' : content;
}

/**
 * HTML转义（防止XSS攻击）
 * @param {string} str - 原始字符串
 * @returns {string} 转义后的字符串
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}