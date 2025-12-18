// community-posts.js - 帖子数据获取与渲染逻辑（适配user表avatar字段）
document.addEventListener('DOMContentLoaded', function() {
    // 1. 获取DOM元素
    const postsList = document.getElementById('postsList');

    // 2. 初始化：加载帖子数据
    fetchPosts();

    // 3. 从后端API获取帖子数据（包含authorId，关联user表）
    async function fetchPosts() {
        // 显示加载状态
        setLoadingState();

        try {
            const response = await fetch('/api/posts'); // 后端帖子列表接口，需返回post.authorId
            if (!response.ok) {
                throw new Error(`HTTP错误！状态码：${response.status}`);
            }

            const result = await response.json();

            // 处理后端响应
            if (result.code === 200 && Array.isArray(result.data.posts) && result.data.posts.length > 0) {
                renderPosts(result.data.posts); // 渲染帖子列表（含头像加载）
            } else {
                setEmptyState(); // 暂无帖子
            }
        } catch (error) {
            console.error('获取帖子失败：', error);
            setErrorState(); // 加载失败
        }
    }

    // 4. 渲染帖子列表（核心修改：通过authorId请求user表的avatar字段）
    function renderPosts(posts) {
        postsList.innerHTML = '';

        posts.forEach(post => {
            const postCard = document.createElement('div');
            postCard.className = 'post-card';

            // 格式化日期、处理标签
            const formattedDate = formatRelativeDate(post.updated_at);
            const tags = post.tags || [];
            // 提取作者信息（必须包含authorId，用于请求头像；authorName用于首字母兜底）
            const authorId = post.authorId; // 帖子数据中需包含作者ID（关联user表id）
            const authorName = post.author_name || '匿名用户';
            const authorInitial = getAuthorInitials(authorName); // 首字母兜底

            // 帖子卡片基础结构（头像区域先显示首字母，后续异步替换）
            postCard.innerHTML = `
                <div class="post-header">
                    <div class="post-author">
                        <!-- 头像容器：添加data-author-id标记，用于后续替换 -->
                        <div class="author-avatar" data-author-id="${authorId}">
                            ${authorInitial}
                        </div>
                        <div class="author-info">
                            <h4>${escapeHtml(authorName)}</h4>
                            <div class="post-date">${formattedDate}</div>
                        </div>
                    </div>
                    <div class="post-tags">
                        ${tags.map(tag => `<span class="post-tag">${tag.trim()}</span>`).join('')}
                    </div>
                </div>
                <div class="post-content">
                    <h3>${escapeHtml(post.title)}</h3>
                    <p>${escapeHtml(post.content)}</p>
                </div>
                <div class="post-stats">
                    <div class="post-stat">👍 ${post.like_count || 0}</div>
                    <div class="post-stat">💬 ${post.comment_count || 0}</div>
                    <div class="post-stat">👁 ${post.view_count || 0}</div>
                </div>
                ${post.video_url ? `<div class="post-video">
                    <video src="${post.video_url}" controls></video>
                </div>` : ''}
            `;

            // 点击跳转详情页
            postCard.addEventListener('click', () => {
                window.location.href = `post-detail.html?id=${post.id}`;
            });

            postsList.appendChild(postCard);

            // 异步加载当前作者的头像（从user表avatar字段获取）
            loadAuthorAvatar(authorId);
        });
    }

    // 5. 核心函数：根据authorId请求user表的avatar字段
    async function loadAuthorAvatar(authorId) {
        // 1. 修复：移除未定义的 post 变量引用
        const validAuthorId = authorId; 
        if (!validAuthorId) {
            console.error('帖子作者ID无效:', authorId);
            return;
        }

        try {
            const loginUserId = localStorage.getItem('userId');
            const response = await fetch(`/api/users/${validAuthorId}/avatar`, {
                method: 'GET',
                headers: {
                    'x-login-user-id': loginUserId,
                    'Content-Type': 'application/json'
                }
            });

            const res = await response.json();
            if (res.code === 200 && res.data.avatar) {
                const avatarContainer = document.querySelector(`.author-avatar[data-author-id="${validAuthorId}"]`);
                if (avatarContainer) {
                    // 2. 修复：使用与用户头像相同的创建img元素方式
                    avatarContainer.innerHTML = ''; // 清空现有内容（首字母）
                    const img = document.createElement('img');
                    img.src = res.data.avatar;
                    img.className = 'avatar-image';
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    
                    // 3. 添加图片加载失败的回退处理
                    img.onerror = function() {
                        const authorName = avatarContainer.closest('.post-author').querySelector('.author-info h4').textContent;
                        const initial = authorName.substring(0, 1).toUpperCase();
                        avatarContainer.innerHTML = initial;
                    };
                    
                    avatarContainer.appendChild(img);
                }
            }
        } catch (error) {
            console.error('加载作者头像失败:', error);
        }
    }

    // 6. 辅助函数：显示加载状态
    function setLoadingState() {
        postsList.innerHTML = '<div class="loading-indicator">加载中...</div>';
    }

    // 7. 辅助函数：显示空数据状态
    function setEmptyState() {
        postsList.innerHTML = '<div class="no-posts">暂无帖子，快来发布第一条内容吧～</div>';
    }

    // 8. 辅助函数：显示加载失败状态
    function setErrorState() {
        postsList.innerHTML = '<div class="error-message">加载失败，请刷新页面重试</div>';
    }

    // 9. 辅助函数：获取作者姓名首字母（头像兜底）
    function getAuthorInitials(name) {
        if (!name) return '?';
        return name.trim().charAt(0).toUpperCase();
    }

    // 10. 辅助函数：格式化相对时间
    function formatRelativeDate(dateString) {
        if (!dateString) return '未知时间';
        const pureDateTime = dateString.slice(0, 19).replace('T', ' ');
        const reg = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
        return reg.test(pureDateTime) ? pureDateTime : '无效时间';
    }

    // 11. 辅助函数：HTML转义（防止XSS）
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});