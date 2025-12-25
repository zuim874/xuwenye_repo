// 从URL获取帖子ID
function getPostIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// 获取帖子详情
async function fetchPostDetail(postId) {
    try {
        // 构建请求头，包含用户身份信息
        const headers = {
            'Content-Type': 'application/json'
        };
        
        const userId = localStorage.getItem('userId');
        if (userId) {
            headers['x-login-user-id'] = userId;
        }
        
        const response = await fetch(`/api/posts/${postId}`, {
            headers: headers
        });
        const result = await response.json();
        
        if (result.code === 200) {
            renderPostDetail(result.data.post);
            // 增加浏览量
            incrementViewCount(postId);
        } else {
            document.getElementById('postDetail').innerHTML = '<div class="error-message">帖子不存在或已被删除</div>';
        }
    } catch (error) {
        console.error('获取帖子详情失败:', error);
        document.getElementById('postDetail').innerHTML = '<div class="error-message">加载帖子失败，请稍后重试</div>';
    }
}


// 时间显示修正
function formatRelativeDate(dateString) {
    if (!dateString) return '未知时间';
    
    // 核心：直接截取字符串前19位（覆盖两种常见格式），替换T为空格
    const pureDateTime = dateString.slice(0, 19).replace('T', ' ');
    
    // 验证格式是否正确（避免异常字符串）
    const reg = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    return reg.test(pureDateTime) ? pureDateTime : '无效时间';
}

// 渲染帖子详情
function renderPostDetail(post) {
    const postDetailElement = document.getElementById('postDetail');
    
    // 格式化日期
    const formattedDate = formatRelativeDate(post.created_at);
    
    // 生成作者头像首字母
    const authorInitials = post.author_name.substring(0, 1).toUpperCase();
    
    // 增强状态字段处理逻辑
    const userLiked = Boolean(post.user_liked) || post.user_liked === 1 || post.user_liked === '1';
    const userFavorited = Boolean(post.user_favorited) || post.user_favorited === 1 || post.user_favorited === '1';
    
    // 确保收藏数有值，处理undefined/null的情况
    const favoriteCount = (post.favorite_count !== undefined && post.favorite_count !== null) 
        ? post.favorite_count 
        : 0;
    
    // 调试信息
    console.log('帖子详情数据:', {
        postId: post.id,
        favorite_count: post.favorite_count,
        processed_favorite_count: favoriteCount,
        user_favorited: post.user_favorited
    });
    
    // 渲染帖子内容
    postDetailElement.innerHTML = `
        <div class="post-header">
            <h1 class="post-title">${post.title}</h1>
            <div class="post-meta">
                <div class="author-info">
                    <div class="author-avatar" data-author-id="${post.user_id}">${authorInitials}</div>
                    <div>
                        <div class="author-name">${post.author_name}</div>
                        <div class="post-date">发布于 ${formattedDate}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="post-content">
            ${post.video_url ? `<video class="post-video" controls><source src="${post.video_url}" type="video/mp4">您的浏览器不支持视频播放</video>` : ''}
            <div class="post-text">${formatContent(post.content)}</div>
            
            <div class="post-tags">
                ${post.tags.map(tag => `<span class="post-tag">${tag}</span>`).join('')}
            </div>
        </div>
        
        <div class="post-actions">
            <button class="action-btn ${userLiked ? 'liked' : ''}" id="likeBtn" data-post-id="${post.id}">
                <i class="like-icon">❤️</i>
                <span class="like-count">${post.like_count || 0}</span>
                <span class="action-text">${userLiked ? '已点赞' : '点赞'}</span>
            </button>
            <button class="action-btn ${userFavorited ? 'favorited' : ''}" id="favoriteBtn" data-post-id="${post.id}">
                <i class="favorite-icon">⭐</i>
                <span class="favorite-count">${favoriteCount}</span>
                <span class="action-text">${userFavorited ? '已收藏' : '收藏'}</span>
            </button>
            <button class="action-btn" id="shareBtn">
                <i class="share-icon">🔗🔗</i>
                <span class="action-text">分享</span>
            </button>
        </div>
    `;
    
    // 绑定按钮事件
    bindActionButtons(post.id);

    // 确保使用正确的用户ID加载头像
    if (post.user_id) {
        requestAnimationFrame(() => {
            loadAuthorAvatar(post.user_id, post.author_name);
        });
    }
}

// 格式化帖子内容（将换行符转换为<br>）
function formatContent(content) {
    return content.replace(/\n/g, '<br>');
}

// 绑定操作按钮事件
function bindActionButtons(postId) {
    // 点赞按钮
    document.getElementById('likeBtn').addEventListener('click', function() {
        toggleLike(postId, this);
    });
    
    // 收藏按钮
    document.getElementById('favoriteBtn').addEventListener('click', function() {
        toggleFavorite(postId, this);
    });
    
    // 分享按钮
    document.getElementById('shareBtn').addEventListener('click', function() {
        sharePost(postId);
    });
}

// 切换点赞状态
async function toggleLike(postId, button) {
    try {
        // 检查用户是否登录
        const userId = localStorage.getItem('userId');
        if (!userId) {
            alert('请先登录才能点赞');
            window.location.href = `./account/login.html?redirect=post-detail.html?id=${postId}`;
            return;
        }
        
        const isCurrentlyLiked = button.classList.contains('liked');
        const likeCountElement = button.querySelector('.like-count');
        const actionTextElement = button.querySelector('.action-text');
        const currentCount = parseInt(likeCountElement.textContent) || 0;
        
        const response = await fetch(`/api/posts/${postId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-login-user-id': userId
            },
            body: JSON.stringify({ 
                username: localStorage.getItem('currentUser'),
                action: isCurrentlyLiked ? 'unlike' : 'like'
            })
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            // 更新按钮状态和点赞数
            const newLikedState = !isCurrentlyLiked;
            button.classList.toggle('liked', newLikedState);
            
            const newCount = newLikedState ? currentCount + 1 : currentCount - 1;
            likeCountElement.textContent = Math.max(0, newCount);
            actionTextElement.textContent = newLikedState ? '已点赞' : '点赞';
            
            // 更新本地状态
            updateLocalInteractionStatus(postId, 'liked', newLikedState);
            
            // 添加视觉反馈
            button.style.transform = 'scale(1.1)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 300);
        } else {
            alert(result.message || '操作失败，请稍后重试');
        }
    } catch (error) {
        console.error('点赞失败:', error);
        alert('点赞失败，请稍后重试');
    }
}

// 切换收藏状态
async function toggleFavorite(postId, button) {
    try {
        // 检查用户是否登录
        const userId = localStorage.getItem('userId');
        if (!userId) {
            alert('请先登录才能收藏');
            window.location.href = `./account/login.html?redirect=post-detail.html?id=${postId}`;
            return;
        }
        
        const isCurrentlyFavorited = button.classList.contains('favorited');
        const favoriteCountElement = button.querySelector('.favorite-count');
        const actionTextElement = button.querySelector('.action-text');
        
        // 确保收藏数有初始值，处理各种边界情况
        let currentCount = parseInt(favoriteCountElement.textContent);
        if (isNaN(currentCount)) {
            currentCount = 0;
        }
        
        const response = await fetch(`/api/posts/${postId}/favorite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-login-user-id': userId
            },
            body: JSON.stringify({
                action: isCurrentlyFavorited ? 'unfavorite' : 'favorite'
            })
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            // 更新按钮状态和收藏数
            const newFavoritedState = !isCurrentlyFavorited;
            button.classList.toggle('favorited', newFavoritedState);
            
            // 更新收藏数量
            const newCount = newFavoritedState ? currentCount + 1 : currentCount - 1;
            favoriteCountElement.textContent = Math.max(0, newCount);
            actionTextElement.textContent = newFavoritedState ? '已收藏' : '收藏';
            
            // 更新本地状态
            updateLocalInteractionStatus(postId, 'favorited', newFavoritedState);
            
            // 添加视觉反馈
            button.style.transform = 'scale(1.1)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 300);
        } else {
            alert(result.message || '操作失败，请稍后重试');
        }
    } catch (error) {
        console.error('收藏失败:', error);
        alert('收藏失败，请稍后重试');
    }
}

// 分享帖子
function sharePost(postId) {
    const postUrl = window.location.href;
    
    // 检查浏览器是否支持分享API
    if (navigator.share) {
        navigator.share({
            title: document.title,
            url: postUrl
        }).catch(error => {
            console.error('分享失败:', error);
            copyToClipboard(postUrl);
        });
    } else {
        // 不支持分享API则复制链接
        copyToClipboard(postUrl);
    }
}

// 复制到剪贴板
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('链接已复制到剪贴板');
    }).catch(error => {
        console.error('复制失败:', error);
        alert('复制失败，请手动复制链接');
    });
}

// 增加浏览量
async function incrementViewCount(postId) {
    try {
        await fetch(`/api/posts/${postId}/view`, {
            method: 'POST'
        });
    } catch (error) {
        console.error('增加浏览量失败:', error);
    }
}

// 获取帖子评论
async function fetchComments(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}/comments`);
        const result = await response.json();
        
        if (result.code === 200) {
            renderComments(result.data.comments);
        } else {
            document.getElementById('commentsList').innerHTML = '<div class="error-message">加载评论失败</div>';
        }
    } catch (error) {
        console.error('获取评论失败:', error);
        document.getElementById('commentsList').innerHTML = '<div class="error-message">加载评论失败，请稍后重试</div>';
    }
}

// 渲染评论列表
function renderComments(comments) {
    const commentsListElement = document.getElementById('commentsList');
    const currentUser = localStorage.getItem('currentUser');
    
    if (comments.length === 0) {
        commentsListElement.innerHTML = '<div class="no-comments">还没有评论，快来发表第一条评论吧！</div>';
        return;
    }
    
    let commentsHTML = '';
    comments.forEach(comment => {
        const formattedDate = formatRelativeDate(comment.created_at);
        const authorInitials = comment.author_name.substring(0, 1).toUpperCase();
        const isOwnComment = currentUser && comment.author_name === currentUser;
        
        commentsHTML += `
            <div class="comment-item" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <div class="comment-author">
                        <!-- 确保data-user-id属性正确设置 -->
                        <div class="comment-avatar" data-user-id="${comment.user_id}">${authorInitials}</div>
                        <div class="author-name">${comment.author_name}</div>
                    </div>
                    <div class="comment-time">
                        ${formattedDate}
                        ${isOwnComment ? `<button class="delete-comment-btn" style="margin-left:10px; background:none; border:none; color:#a0a0a0; cursor:pointer; font-size:12px;">删除</button>` : ''}
                    </div>
                </div>
                <div class="comment-text">${comment.content}</div>
            </div>
        `;
    });
    
    commentsListElement.innerHTML = commentsHTML;
    
    // 绑定删除按钮事件
    bindDeleteCommentEvents();

    // 加载评论作者头像
    comments.forEach(comment => {
        if (comment.user_id) {
            setTimeout(() => {
                loadAuthorAvatar(comment.user_id,comment.author_name);
            }, 100);
        }
    });
}

// 绑定删除评论事件
function bindDeleteCommentEvents() {
    const deleteButtons = document.querySelectorAll('.delete-comment-btn');
    const postId = getPostIdFromUrl();
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const commentItem = this.closest('.comment-item');
            const commentId = commentItem.getAttribute('data-comment-id');
            
            if (confirm('确定要删除这条评论吗？')) {
                deleteComment(postId, commentId);
            }
        });
    });
}

// 删除评论
async function deleteComment(postId, commentId) {
    try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            alert('请先登录');
            return;
        }
        
        const response = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'x-login-user-id': userId
            }
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            // 删除成功，重新加载评论列表
            fetchComments(postId);
        } else {
            alert(result.message || '删除评论失败，请稍后重试');
        }
    } catch (error) {
        console.error('删除评论失败:', error);
        alert('删除评论失败，请稍后重试');
    }
}

// 提交评论
async function submitComment(postId) {
    const commentInput = document.getElementById('commentInput');
    const content = commentInput.value.trim();
    
    if (!content) {
        alert('请输入评论内容');
        return;
    }
    
    // 检查用户是否登录
    const userId = localStorage.getItem('userId');
    if (!userId) {
        alert('请先登录才能评论');
        window.location.href = `./account/login.html?redirect=post-detail.html?id=${postId}`;
        return;
    }
    
    try {
        const response = await fetch(`/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-login-user-id': userId
            },
            body: JSON.stringify({ 
                content,
                username: localStorage.getItem('currentUser') 
            })
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            // 清空输入框并重新加载评论
            commentInput.value = '';
            fetchComments(postId);
        } else {
            alert(result.message || '评论失败，请稍后重试');
        }
    } catch (error) {
        console.error('提交评论失败:', error);
        alert('评论失败，请稍后重试');
    }
}

// 检查用户是否登录（与community.js保持一致）
function isUserLoggedIn() {
    return !!localStorage.getItem('currentUser');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    const postId = getPostIdFromUrl();
    
    if (!postId) {
        document.getElementById('postDetail').innerHTML = '<div class="error-message">无效的帖子ID</div>';
        return;
    }
    
    // 加载帖子详情和评论
    fetchPostDetail(postId);
    fetchComments(postId);
    
    // 绑定评论提交按钮事件
    document.getElementById('submitComment').addEventListener('click', function() {
        submitComment(postId);
    });
    
    // 初始化用户状态
    initUserStatus();
});

// 初始化用户状态显示（使用currentUser）
function initUserStatus() {
    const userArea = document.getElementById('userArea');
    const loginBtnArea = document.getElementById('loginBtnArea');
    const userNamePrefix = document.getElementById('userNamePrefix');
    const currentUser = localStorage.getItem('currentUser');
    
    if (isUserLoggedIn() && currentUser) {
        // 用户已登录，显示用户信息
        userNamePrefix.textContent = currentUser.substring(0, 3).toUpperCase();
        userArea.style.display = 'block';
        loginBtnArea.style.display = 'none';
    } else {
        // 用户未登录，显示登录按钮
        userArea.style.display = 'none';
        loginBtnArea.style.display = 'block';
    }
}

// 检查本地交互状态作为备用方案
function checkLocalInteractionStatus(postId) {
    const userId = localStorage.getItem('userId');
    if (!userId) return { liked: false, favorited: false };
    
    try {
        const userInteractions = JSON.parse(localStorage.getItem(`userInteractions_${userId}`) || '{}');
        const postInteraction = userInteractions[postId] || {};
        
        return {
            liked: Boolean(postInteraction.liked),
            favorited: Boolean(postInteraction.favorited)
        };
    } catch (error) {
        console.error('读取本地交互状态失败:', error);
        return { liked: false, favorited: false };
    }
}

// 更新本地交互状态（在点赞/收藏成功后调用）
function updateLocalInteractionStatus(postId, type, status) {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    
    const userInteractions = JSON.parse(localStorage.getItem(`userInteractions_${userId}`) || '{}');
    if (!userInteractions[postId]) {
        userInteractions[postId] = {};
    }
    
    userInteractions[postId][type] = status;
    localStorage.setItem(`userInteractions_${userId}`, JSON.stringify(userInteractions));
}

// 修改loadAuthorAvatar函数的选择器逻辑
async function loadAuthorAvatar(authorId, username) {
    if (!authorId || authorId === 'undefined' || authorId === 'null') {
        console.warn('无效的作者ID:', authorId);
        showAuthorInitial(authorId, null, username); // 直接显示首字母
        return;
    }

    try {
        // 先尝试显示首字母作为过渡
        const avatarContainers = document.querySelectorAll(
            `.author-avatar[data-author-id="${authorId}"], 
             .comment-avatar[data-user-id="${authorId}"]`
        );
        avatarContainers.forEach(container => {
            showAuthorInitial(authorId, container, username);
        });

        // 请求头像
        const response = await fetch(`/api/users/${authorId}/avatar`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-login-user-id': localStorage.getItem('userId')
            }
        });

        const result = await response.json();
        
        if (result.code === 200 && result.data?.avatar) {
            // 有有效头像URL，显示图片
            avatarContainers.forEach(container => {
                container.innerHTML = ''; // 清空首字母
                const img = document.createElement('img');
                img.src = result.data.avatar;
                img.className = 'avatar-image';
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '50%';

                // 只有图片确实加载失败时才显示首字母
                img.onerror = function() {
                    console.error('头像图片加载失败:', result.data.avatar);
                    showAuthorInitial(authorId, container, username || result.data?.username);
                };

                container.appendChild(img);
            });
        } 
        // 如果没有头像数据，保持首字母显示
    } catch (error) {
        console.error('加载用户头像失败:', error);
        // 保持之前显示的首字母
    }
}

// 修改showAuthorInitial函数，只在容器存在时操作
function showAuthorInitial(userId, container, username) {
    if (!userId || userId === 'undefined' || userId === 'null') {
        console.warn('无效的用户ID:', userId);
        return;
    }

    if (!container) {
        container = document.querySelector(
            `.author-avatar[data-author-id="${userId}"], 
             .comment-avatar[data-user-id="${userId}"]`
        );
        if (!container) return;
    }

    let displayText = '';
    if (username && username.trim()) {
        displayText = username.trim().charAt(0).toUpperCase();
    } else {
        displayText = userId.toString().slice(-2).toUpperCase();
    }

    // 只在容器为空或没有图片时设置首字母
    if (!container.querySelector('img')) {
        container.innerHTML = '';
        const initialEl = document.createElement('div');
        initialEl.style.cssText = `
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background-color: #0f3460;
            color: #e63946;
            font-size: 14px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        initialEl.textContent = displayText;
        container.appendChild(initialEl);
    }
}