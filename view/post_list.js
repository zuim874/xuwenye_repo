// community-posts.js - 帖子数据获取与渲染逻辑
document.addEventListener('DOMContentLoaded', function() {
    // 1. 获取DOM元素
    const postsList = document.getElementById('postsList');

    // 2. 初始化：加载帖子数据
    fetchPosts();

    // 3. 从后端API获取帖子数据
    async function fetchPosts() {
        // 显示加载状态
        setLoadingState();

        try {
            const response = await fetch('/api/posts'); // 后端获取帖子列表的接口

            if (!response.ok) {
                throw new Error(`HTTP错误！状态码：${response.status}`);
            }

            const result = await response.json();

            // 处理后端响应
            if (result.code === 200 && Array.isArray(result.data.posts) && result.data.posts.length > 0) {
                renderPosts(result.data.posts); // 渲染帖子列表
            } else {
                setEmptyState(); // 暂无帖子
            }
        } catch (error) {
            console.error('获取帖子失败：', error);
            setErrorState(); // 加载失败
        }
    }

    // 4. 渲染帖子列表
    function renderPosts(posts) {
        // 清空容器
        postsList.innerHTML = '';

        // 遍历帖子数据，生成卡片
        posts.forEach(post => {
            const postCard = document.createElement('div');
            postCard.className = 'post-card';

            // 格式化日期（调用辅助函数）
            const formattedDate = formatRelativeDate(post.created_at); // 注意：后端字段是 created_at（和数据库一致）
            // 分割标签（后端存储的是逗号分隔字符串，转成数组）
            //const tags = post.tags ? post.tags.split(',') : [];
            const tags = post.tags || [];

            // 帖子卡片HTML结构
            // 在renderPosts函数中修改统计信息部分：
            postCard.innerHTML = `
                <div class="post-header">
                    <div class="post-author">
                        <div class="author-avatar">${getAuthorInitials(post.author_name)}</div>
                        <div class="author-info">
                            <h4>${post.author_name || '匿名用户'}</h4>
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
                    <div class="post-stat">💬 ${post.comment_count || 0}</div> <!-- 修正：移除重复emoji -->
                    <div class="post-stat">👁 ${post.view_count || 0}</div> <!-- 修正：移除重复emoji -->
                </div>
                ${post.video_url ? `<div class="post-video">
                    <video src="${post.video_url}" controls></video>
                </div>` : ''}
            `;

            // 点击帖子跳转到详情页（携带帖子ID）
            postCard.addEventListener('click', () => {
                window.location.href = `post-detail.html?id=${post.id}`;
            });

            // 添加到列表容器
            postsList.appendChild(postCard);
        });
    }

    // 5. 辅助函数：显示加载状态
    function setLoadingState() {
        postsList.innerHTML = '<div class="loading-indicator">加载中...</div>';
    }

    // 6. 辅助函数：显示空数据状态
    function setEmptyState() {
        postsList.innerHTML = '<div class="no-posts">暂无帖子，快来发布第一条内容吧～</div>';
    }

    // 7. 辅助函数：显示加载失败状态
    function setErrorState() {
        postsList.innerHTML = '<div class="error-message">加载失败，请刷新页面重试</div>';
    }

    // 8. 辅助函数：获取作者姓名首字母
    function getAuthorInitials(name) {
        if (!name) return '?';
        return name.trim().charAt(0).toUpperCase();
    }

    // 9. 辅助函数：格式化相对时间（如：10分钟前、2小时前）
    function formatRelativeDate(dateString) {
        if (!dateString) return '未知时间';

        const postDate = new Date(dateString);
        const now = new Date();
        const diffMs = now - postDate; // 时间差（毫秒）

        const second = 1000;
        const minute = second * 60;
        const hour = minute * 60;
        const day = hour * 24;
        const month = day * 30;
        const year = day * 365;

        if (diffMs < minute) {
            return `${Math.floor(diffMs / second)}秒前`;
        } else if (diffMs < hour) {
            return `${Math.floor(diffMs / minute)}分钟前`;
        } else if (diffMs < day) {
            return `${Math.floor(diffMs / hour)}小时前`;
        } else if (diffMs < month) {
            return `${Math.floor(diffMs / day)}天前`;
        } else if (diffMs < year) {
            return `${Math.floor(diffMs / month)}个月前`;
        } else {
            return `${Math.floor(diffMs / year)}年前`;
        }
    }

    // 10. 辅助函数：HTML转义（防止XSS攻击）
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