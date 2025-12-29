// DOM元素缓存（全局统一管理，避免重复DOM查询）
const DOM = {
    userNamePrefix: document.getElementById('userNamePrefix'),
    userArea: document.getElementById('userArea'),
    loginBtnArea: document.getElementById('loginBtnArea'),
    changeEmailBtn: document.getElementById('changeEmailBtn'), // 新增
    deleteAccountBtn: document.getElementById('deleteAccountBtn'), // 新增
    changeAvatarBtn: document.getElementById('changeAvatarBtn'), // 新增
    changePasswordBtn: document.getElementById('changePasswordBtn'),
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

// 全局状态管理
const AppState = {
    isDeletingAccount: false, // 标记是否正在进行注销操作
    deleteAccountProcess: null // 用于存储注销过程中的请求或数据
};

/**
 * 显示提示信息（toast）
 * @param {string} message - 提示内容
 * @param {string} type - 提示类型：success, error, info
 */
function showAlert(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 显示toast
    setTimeout(() => toast.classList.add('show'), 10);
    
    // 3秒后自动隐藏并移除
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 页面初始化入口（DOM加载完成后执行）
document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('currentUser');

    const profileAvatar = document.querySelector('.profile-avatar');
    renderUserAvatar(profileAvatar, userId, userName);

    checkLoginStatus(); // 优先检查登录状态
    bindEvents(); // 绑定所有事件
});

/**
 * 绑定所有页面事件
 */
function bindEvents() {
    // 换绑邮箱事件
    DOM.changeEmailBtn.addEventListener('click', changeEmail);
    
    // 注销账户事件
    DOM.deleteAccountBtn.addEventListener('click', deleteAccount);
    
    // 登出事件
    DOM.logoutBtn.addEventListener('click', logout);

    // 设置头像事件
    DOM.changeAvatarBtn.addEventListener('click', changeAvatar);

    // 修改密码时间
    DOM.changePasswordBtn.addEventListener('click', changePassword);
    
    // 修改：点击头像显示/隐藏菜单
    DOM.userInfo.addEventListener('click', (e) => {
        e.stopPropagation(); // 防止事件冒泡
        DOM.userMenu.classList.toggle('show');
    });
    
    // 修改：点击页面其他区域关闭菜单
    document.addEventListener('click', (e) => {
        if (!DOM.userInfo.contains(e.target)) {
            DOM.userMenu.classList.remove('show');
        }
    });

    // 页面导航检测 - 监听beforeunload事件（关闭页面或刷新）
    window.addEventListener('beforeunload', (e) => {
        if (AppState.isDeletingAccount) {
            // 取消注销操作
            AppState.isDeletingAccount = false;
            // 显示提示
            showAlert('注销操作已取消，您已退出注销流程。', 'info');
        }
    });

    // 页面导航检测 - 监听所有锚点点击
    document.addEventListener('click', (e) => {
        const target = e.target.closest('a');
        if (target && AppState.isDeletingAccount && target.href) {
            // 阻止默认跳转
            e.preventDefault();
            // 取消注销操作
            AppState.isDeletingAccount = false;
            // 显示提示
            showAlert('注销操作已取消，您已退出注销流程。', 'info');
        }
    });

    // 页面导航检测 - 监听所有按钮点击（可能导致页面跳转的按钮）
    document.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (target && AppState.isDeletingAccount && target.id !== 'deleteAccountBtn') {
            // 对于可能导致页面跳转的按钮，显示提示
            showAlert('注销操作已取消，您已退出注销流程。', 'info');
            // 取消注销操作
            AppState.isDeletingAccount = false;
        }
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
        window.location.href = './account/login.html';
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
 * 更新用户统计数据
 * @param {Object} stats - 后端返回的统计对象
 */
function updateUserStats(stats = {}) {
    DOM.postCount.textContent = stats.post_count || 0;
    DOM.likeCount.textContent = stats.total_likes || 0;
    DOM.commentCount.textContent = stats.total_comments || 0;
    
    // 添加审核状态提示
    if (stats.pending_count > 0) {
        const pendingNotice = document.createElement('div');
        pendingNotice.className = 'pending-notice';
        pendingNotice.innerHTML = `📋 您有 ${stats.pending_count} 篇帖子等待审核`;
        pendingNotice.style.cssText = `
            background: rgba(255, 193, 7, 0.1);
            border: 1px solid rgba(255, 193, 7, 0.3);
            border-radius: 8px;
            padding: 10px;
            margin-top: 10px;
            color: #ffc107;
            font-size: 14px;
            text-align: center;
        `;
        
        // 插入到统计信息后面
        const statsContainer = document.querySelector('.profile-stats');
        statsContainer.parentNode.insertBefore(pendingNotice, statsContainer.nextSibling);
    }
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
        
        // 检查帖子状态
        const isApproved = post.status === 1; // status=1表示已审核通过
        const isRejected = post.status === 2;  // status=2表示审核未通过
        const isPending = post.status === 0;   // status=0表示待审核
        
        let approvalTag = '';
        let approvalNotice = '';
        
        if (isApproved) {
            approvalTag = '<span class="approval-tag approved">✅ 已审核</span>';
        } else if (isRejected) {
            approvalTag = '<span class="approval-tag rejected">❌ 审核未通过</span>';
            approvalNotice = '<div class="approval-notice rejected">⚠️ 此帖子审核未通过，建议您重新编辑或删除后重新发布</div>';
        } else { // isPending
            approvalTag = '<span class="approval-tag pending">⏳ 待审核</span>';
            approvalNotice = '<div class="approval-notice">📢 此帖子正在等待审核，审核通过后将对其他用户可见</div>';
        }

        // 格式化帖子数据
        const formattedDate = formatRelativeDate(post.created_at);
        const tags = post.tags ? post.tags.split(',').map(tag => tag.trim()) : [];

        // 帖子卡片HTML结构 - 添加不同状态的标识
        postCard.innerHTML = `
            <div class="post-header">
                <div class="post-author">
                    <div class="author-avatar"></div>
                    <div class="author-info">
                        <h4>${DOM.profileName.textContent}</h4>
                        <div class="post-date">${formattedDate}</div>
                    </div>
                </div>
                <div class="post-tags">
                    ${approvalTag}
                    ${tags.map(tag => `<span class="post-tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
            </div>
            ${approvalNotice}
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

        const avatarEl = postCard.querySelector('.author-avatar');
        renderUserAvatar(avatarEl, post.user_id, DOM.profileName.textContent);

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
        showAlert('帖子删除成功！', 'success');

    } catch (error) {
        console.error('删除帖子失败：', error);
        showAlert(`删除失败：${error.message}`, 'error');
        handleAuthError(error.message);
    }
}

/**
 * 换绑邮箱功能（新版五步流程，增加确认步骤）
 */
async function changeEmail() {
    try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            throw new Error('用户未登录');
        }

        // 第一步：确认是否要换绑邮箱
        const confirmChange = await showChangeEmailConfirmation();
        if (!confirmChange) return;

        // 第二步：获取当前邮箱验证码
        const sendCodeResponse = await fetch(`/api/users/${userId}/send-change-email-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Login-User-Id': userId
            }
        });

        const sendCodeResult = await sendCodeResponse.json();
        
        if (!sendCodeResponse.ok) {
            throw new Error(sendCodeResult.message || '发送验证码失败');
        }

        // 第三步：验证当前邮箱并发送新邮箱验证码
        const currentEmailCode = await showChangeEmailStep1(sendCodeResult.data.emailMask);
        if (!currentEmailCode) return;

        // 第四步：输入新邮箱
        const newEmail = await showChangeEmailStep2();
        if (!newEmail) return;

        const verifyResponse = await fetch(`/api/users/${userId}/verify-and-send-new`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Login-User-Id': userId
            },
            body: JSON.stringify({
                currentEmailCode: currentEmailCode,
                newEmail: newEmail
            })
        });

        const verifyResult = await verifyResponse.json();
        
        if (!verifyResponse.ok) {
            throw new Error(verifyResult.message || '验证失败');
        }

        // 第五步：输入新邮箱验证码
        const newEmailCode = await showChangeEmailStep3(verifyResult.data.newEmailMask);
        if (!newEmailCode) return;

        // 最终确认换绑
        const confirmResponse = await fetch(`/api/users/${userId}/confirm-change-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Login-User-Id': userId
            },
            body: JSON.stringify({
                newEmailCode: newEmailCode
            })
        });

        const confirmResult = await confirmResponse.json();
        
        if (!confirmResponse.ok) {
            throw new Error(confirmResult.message || '换绑失败');
        }

        showAlert('邮箱换绑成功！', 'success');
        
        // 可选：刷新页面或更新用户信息
        window.location.reload();

    } catch (error) {
        console.error('换绑邮箱失败：', error);
        
        // 取消换绑流程
        try {
            await fetch(`/api/users/${userId}/cancel-change-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Login-User-Id': userId
                }
            });
        } catch (cancelError) {
            console.error('取消换绑流程失败：', cancelError);
        }
        
        showAlert(`换绑失败：${error.message}`, 'error');
    }
}

/**
 * 显示换绑邮箱确认对话框（第一步）
 */
function showChangeEmailConfirmation() {
    return new Promise((resolve) => {
        const modal = createModal(`
            <h3>换绑邮箱确认</h3>
            <div style="text-align: left; margin: 20px 0; line-height: 1.6;">
                <p>🔒🔒 您即将开始换绑邮箱流程：</p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>需要验证当前邮箱</li>
                    <li>需要验证新邮箱</li>
                    <li>整个过程需要几分钟时间</li>
                </ul>
                <p style="color: #e63946; font-weight: bold;">请确保您能访问当前邮箱和新邮箱</p>
            </div>
            <div style="margin-top: 20px;">
                <button onclick="handleConfirmChangeEmail()" style="background: #e63946; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin-right: 10px;">确认换绑</button>
                <button onclick="handleCancelChangeEmail()" style="background: #666; color: white; padding: 10px 20px; border: none; border-radius: 5px;">取消</button>
            </div>
        `);

        window.handleConfirmChangeEmail = () => {
            modal.remove();
            resolve(true);
        };

        window.handleCancelChangeEmail = () => {
            modal.remove();
            resolve(false);
        };
    });
}

/**
 * 显示换绑邮箱第一步：输入当前邮箱验证码（原第一步，现第二步）
 */
function showChangeEmailStep1(emailMask) {
    return new Promise((resolve) => {
        const modal = createModal(`
            <h3>第一步：验证当前邮箱</h3>
            <p>验证码已发送到您的邮箱 ${emailMask}</p>
            <input type="text" id="currentEmailCode" placeholder="请输入6位验证码" maxlength="6" style="width: 200px; padding: 10px; margin: 10px 0;">
            <div style="margin-top: 20px;">
                <button onclick="handleStep1Confirm()" style="background: #e63946; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin-right: 10px;">确认</button>
                <button onclick="handleStep1Cancel()" style="background: #666; color: white; padding: 10px 20px; border: none; border-radius: 5px;">取消</button>
            </div>
        `);

        window.handleStep1Confirm = () => {
            const code = document.getElementById('currentEmailCode').value;
            if (code && code.length === 6) {
                modal.remove();
                resolve(code);
            } else {
                showAlert('请输入6位验证码', 'error');
            }
        };

        window.handleStep1Cancel = () => {
            modal.remove();
            resolve(null);
        };
    });
}

/**
 * 显示换绑邮箱第二步：输入新邮箱（原第二步，现第三步）
 */
function showChangeEmailStep2() {
    return new Promise((resolve) => {
        const modal = createModal(`
            <h3>第二步：输入新邮箱</h3>
            <p>请输入您要绑定的新邮箱地址</p>
            <input type="email" id="newEmail" placeholder="请输入新邮箱地址" style="width: 300px; padding: 10px; margin: 10px 0;">
            <div style="margin-top: 20px;">
                <button onclick="handleStep2Confirm()" style="background: #e63946; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin-right: 10px;">下一步</button>
                <button onclick="handleStep2Cancel()" style="background: #666; color: white; padding: 10px 20px; border: none; border-radius: 5px;">取消</button>
            </div>
        `);

        window.handleStep2Confirm = () => {
            const email = document.getElementById('newEmail').value;
            if (email && email.includes('@')) {
                modal.remove();
                resolve(email);
            } else {
                showAlert('请输入有效的邮箱地址', 'error');
            }
        };

        window.handleStep2Cancel = () => {
            modal.remove();
            resolve(null);
        };
    });
}

/**
 * 显示换绑邮箱第三步：输入新邮箱验证码（原第三步，现第四步）
 */
function showChangeEmailStep3(newEmailMask) {
    return new Promise((resolve) => {
        const modal = createModal(`
            <h3>第三步：验证新邮箱</h3>
            <p>验证码已发送到新邮箱 ${newEmailMask}</p>
            <input type="text" id="newEmailCode" placeholder="请输入6位验证码" maxlength="6" style="width: 200px; padding: 10px; margin: 10px 0;">
            <div style="margin-top: 20px;">
                <button onclick="handleStep3Confirm()" style="background: #e63946; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin-right: 10px;">完成换绑</button>
                <button onclick="handleStep3Cancel()" style="background: #666; color: white; padding: 10px 20px; border: none; border-radius: 5px;">取消</button>
            </div>
        `);

        window.handleStep3Confirm = () => {
            const code = document.getElementById('newEmailCode').value;
            if (code && code.length === 6) {
                modal.remove();
                resolve(code);
            } else {
                showAlert('请输入6位验证码', 'error');
            }
        };

        window.handleStep3Cancel = () => {
            modal.remove();
            resolve(null);
        };
    });
}

/**
 * 创建模态对话框
 */
function createModal(content) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 10px;
        max-width: 500px;
        width: 90%;
        color: #333;
        text-align: center;
    `;
    
    modalContent.innerHTML = content;
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    return modal;
}

/**
 * 修改密码功能
 */
async function changePassword() {
    try {
        const userId = localStorage.getItem('userId');
        const userName = localStorage.getItem('currentUser');
        
        if (!userId) {
            throw new Error('用户未登录');
        }

        // 显示修改密码模态框
        const result = await showChangePasswordModal();
        if (!result) return;

        const { currentPassword, newPassword, confirmPassword } = result;

        // 前端验证
        if (newPassword !== confirmPassword) {
            throw new Error('新密码和确认密码不一致');
        }

        // 增强：使用与后端一致的密码规则验证
        if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/.test(newPassword)) {
            throw new Error('新密码必须至少6位，包含字母和数字');
        }

        // 发送修改密码请求
        const response = await fetch(`/api/users/${userId}/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Login-User-Id': userId
            },
            body: JSON.stringify({
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        });

        const resultData = await response.json();

        if (!response.ok) {
            throw new Error(resultData.message || '修改密码失败');
        }

        showAlert('密码修改成功！即将自动登出...', 'success');
        
        // 密码修改成功后立即登出并跳转至登录页
        setTimeout(logout, 1500);

    } catch (error) {
        console.error('修改密码失败：', error);
        showAlert(`修改密码失败：${error.message}`, 'error');
    }
}

/**
 * 显示修改密码模态框
 */
function showChangePasswordModal() {
    return new Promise((resolve) => {
        const modal = createModal(`
            <h3>修改密码</h3>
            <div style="margin: 20px 0;">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">当前密码</label>
                    <input type="password" id="currentPassword" placeholder="请输入当前密码" 
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">新密码</label>
                    <input type="password" id="newPassword" placeholder="请输入新密码（至少6位，包含字母和数字）" 
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">确认新密码</label>
                    <input type="password" id="confirmPassword" placeholder="请再次输入新密码" 
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                </div>
                <div style="font-size: 12px; color: #666; margin-bottom: 15px;">
                    <p>🔒 密码要求：</p>
                    <ul style="margin: 5px 0; padding-left: 15px;">
                        <li>至少6位字符</li>
                        <li>必须包含字母和数字</li>
                        <li>可以包含特殊符号(@$!%*#?&)</li>
                    </ul>
                </div>
            </div>
            <div style="text-align: right;">
                <button id="confirmChangePassword" style="background: #e63946; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin-right: 10px;">确认修改</button>
                <button id="cancelChangePassword" style="background: #666; color: white; padding: 10px 20px; border: none; border-radius: 5px;">取消</button>
            </div>
        `);

        // 确认修改按钮事件
        modal.querySelector('#confirmChangePassword').addEventListener('click', () => {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // 验证输入
            if (!currentPassword) {
                showAlert('请输入当前密码', 'error');
                return;
            }
            if (!newPassword) {
                showAlert('请输入新密码', 'error');
                return;
            }
            if (newPassword.length < 6) {
                showAlert('新密码必须至少6位', 'error');
                return;
            }
            if (newPassword !== confirmPassword) {
                showAlert('新密码和确认密码不一致', 'error');
                return;
            }

            modal.remove();
            resolve({ currentPassword, newPassword, confirmPassword });
        });

        // 取消按钮事件
        modal.querySelector('#cancelChangePassword').addEventListener('click', () => {
            modal.remove();
            resolve(null);
        });

        // 回车键支持
        modal.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                modal.querySelector('#confirmChangePassword').click();
            }
        });
    });
}

/**
 * 修改密码跳转（兼容旧代码）
 */
function changepassword() {
    changePassword();
}

/**
 * 注销账户功能（增强版：增加邮箱验证码确认）
 */
async function deleteAccount() {
    try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            throw new Error('用户未登录');
        }

        // 设置注销状态为true
        AppState.isDeletingAccount = true;

        // 第一步：确认删除
        const confirmDelete = confirm(
            '警告：此操作将永久删除您的账户和所有数据！\n\n' +
            '包括：\n' +
            '• 您发布的所有帖子\n' +
            '• 您的所有评论\n' +
            '• 您的点赞和收藏记录\n' +
            '• 您的头像和上传的文件\n\n' +
            '此操作不可撤销！'
        );
        
        if (!confirmDelete) {
            AppState.isDeletingAccount = false;
            return;
        }
        
        const userInput = prompt('请输入"DELETE"确认注销账户：');
        if (userInput !== 'DELETE') {
            showAlert('输入不匹配，注销操作已取消。', 'info');
            AppState.isDeletingAccount = false;
            return;
        }

        // 第二步：发送验证码（如果有邮箱）
        let verificationInfo = null;
        try {
            const response = await fetch(`/api/users/${userId}/send-delete-verification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Login-User-Id': userId
                }
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || '发送验证码失败');
            }

            verificationInfo = result.data;
            
        } catch (error) {
            console.error('发送验证码失败：', error);
            // 如果发送失败，询问是否继续
            const continueWithoutCode = confirm(
                '验证码发送失败：' + error.message + 
                '\n\n是否继续注销？这将降低安全性。'
            );
            if (!continueWithoutCode) {
                AppState.isDeletingAccount = false;
                return;
            }
        }

        // 第三步：验证验证码（如果有邮箱）
        let verificationCode = null;
        if (verificationInfo && verificationInfo.hasEmail) {
            verificationCode = prompt(
                `验证码已发送到您的邮箱 ${verificationInfo.emailMask}\n\n` +
                '请输入收到的6位验证码：'
            );
            
            if (!verificationCode) {
                showAlert('验证码不能为空，注销操作已取消。', 'error');
                AppState.isDeletingAccount = false;
                return;
            }
        }

        // 第四步：执行注销
        const deleteResponse = await fetch(`/api/users/${userId}/verify-and-delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Login-User-Id': userId
            },
            body: JSON.stringify({
                confirmText: userInput,
                verificationCode: verificationCode
            })
        });

        const deleteResult = await deleteResponse.json();

        if (deleteResponse.ok) {
            showAlert('账户注销成功！所有数据已彻底删除。', 'success');
            // 清除本地存储并跳转到登录页
            localStorage.removeItem('currentUser');
            localStorage.removeItem('userId');
            AppState.isDeletingAccount = false;
            window.location.href = './account/login.html';
        } else {
            throw new Error(deleteResult.message || '注销失败');
        }
    } catch (error) {
        console.error('注销账户失败：', error);
        showAlert(`注销失败：${error.message}`, 'error');
        AppState.isDeletingAccount = false;
    }
}

/**
 * 登出功能
 */
function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userId');
    window.location.href = './account/login.html';
}

/**
 * 设置头像
 */
function changeAvatar() {
    window.location.href = 'avatar.html';
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