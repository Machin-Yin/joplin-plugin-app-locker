import joplin from 'api';
import { SettingItemType } from 'api/types';
import { MenuItemLocation } from 'api/types';

joplin.plugins.register({
    onStart: async function () {

        // insert app locker setting
        await joplin.settings.registerSection('appLocker', {
            label: 'App Locker',
            iconName: 'fa fa-lock',
        });
        // insert app locker setting
        await joplin.settings.registerSettings({
            appLockerPswd: {
                value: '',
                type: SettingItemType.String,
                section: 'appLocker',
                public: true,
                secure: true,
                label: 'Password (If password is empty, plugin app locker will not work.)',
            },
            appLockerTimer: {
                value: 5,
                type: SettingItemType.Int,
                section: 'appLocker',
                public: true,
                label: 'Lock joplin when it has no activity for how many minutes (Default is 5 minutes, value must be integer and greater than 0.): ',
            },
        });

        let startTime = +new Date();
        let checkTimer = null;
        let lockId = null;

        // relock
        const resetLock = (needShowError, pswd) => {
            lock(needShowError, pswd);
            clearTimeout(checkTimer);
        };

        // show message
        const showMessage = async (message) => {
            const Dialogs = joplin.views.dialogs;
            await Dialogs.showMessageBox(message);
        };

        // lock app
        const lock = async (needShowError, pswd) => {
            const Dialogs = joplin.views.dialogs;
            let lockResult;

            if ((lockResult && lockResult?.formData?.appLocker) || lockId) {
                return false;
            }

            lockId = 'app.locker' + +new Date();
            const lockDialog = await Dialogs.create(lockId);

            await Dialogs.setHtml(
                lockDialog,
                `
                <style>
                    /* 最强力的全局覆盖 */
                    html, body, #root, [class*="dialog"], [class*="modal"] {
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: hidden !important;
                        width: 100% !important;
                        height: 100% !important;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                        border: none !important;
                        box-shadow: none !important;
                    }
                    
                    /* 移除所有可能的容器边距和边框，并设置背景色 */
                    body > *, 
                    body > * > *,
                    div:not(.lock-overlay):not(.lock-content):not(.user-avatar-wrapper):not(.user-avatar):not(.input-wrapper):not(.time-display):not(.bottom-hint):not(.error-message), 
                    form {
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: transparent !important;
                    }
                    
                    
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    .lock-overlay {
                        position: fixed;
                        top: -200px !important;
                        left: -200px !important;
                        right: -200px !important;
                        bottom: -200px !important;
                        width: calc(100vw + 400px) !important;
                        height: calc(100vh + 400px) !important;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                        margin: 0;
                        
                        /* macOS风格动态渐变背景 */
                        background: linear-gradient(135deg, 
                            #667eea 0%, 
                            #764ba2 25%,
                            #f093fb 50%,
                            #4facfe 75%,
                            #667eea 100%);
                        background-size: 400% 400%;
                        animation: gradientShift 30s ease infinite;
                        
                        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
                    }
                    
                    @keyframes gradientShift {
                        0% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                        100% { background-position: 0% 50%; }
                    }
                    
                    /* 顶部时间显示 */
                    .time-display {
                        position: absolute;
                        top: 40px;
                        font-size: 18px;
                        font-weight: 300;
                        color: rgba(255, 255, 255, 0.95);
                        letter-spacing: 0.5px;
                        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                    }
                    
                    .lock-content {
                        width: 100%;
                        max-width: 380px;
                        text-align: center;
                        transform: translateY(-5%);
                    }
                    
                    /* 用户头像容器 */
                    .user-avatar-wrapper {
                        display: inline-block;
                        margin-bottom: 40px;
                        animation: scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }
                    
                    @keyframes scaleIn {
                        from {
                            opacity: 0;
                            transform: scale(0.5);
                        }
                        to {
                            opacity: 1;
                            transform: scale(1);
                        }
                    }
                    
                    .user-avatar {
                        width: 96px;
                        height: 96px;
                        border-radius: 50%;
                        background: rgba(255, 255, 255, 0.95);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2),
                                    0 0 0 4px rgba(255, 255, 255, 0.2);
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .user-avatar::before {
                        content: '';
                        position: absolute;
                        top: -50%;
                        left: -50%;
                        width: 200%;
                        height: 200%;
                        background: linear-gradient(
                            45deg,
                            transparent,
                            rgba(255, 255, 255, 0.3),
                            transparent
                        );
                        animation: shimmer 3s infinite;
                    }
                    
                    @keyframes shimmer {
                        0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
                        100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
                    }
                    
                    .avatar-icon {
                        width: 56px;
                        height: 56px;
                        z-index: 1;
                    }
                    
                    .user-name {
                        font-size: 24px;
                        font-weight: 500;
                        color: #ffffff;
                        margin-bottom: 12px;
                        letter-spacing: 0.3px;
                        text-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
                    }
                    
                    .lock-subtitle {
                        font-size: 15px;
                        font-weight: 400;
                        color: rgba(255, 255, 255, 0.85);
                        margin-bottom: 48px;
                        letter-spacing: 0.2px;
                        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
                    }
                    
                    .input-wrapper {
                        position: relative;
                        margin-bottom: 20px;
                    }
                    
                    /* macOS风格输入框 */
                    .password-input {
                        width: 100%;
                        padding: 16px 20px;
                        font-size: 15px;
                        color: #1d1d1f;
                        
                        /* 毛玻璃效果 */
                        background: rgba(255, 255, 255, 0.85);
                        backdrop-filter: blur(20px) saturate(180%);
                        -webkit-backdrop-filter: blur(20px) saturate(180%);
                        
                        border: 1px solid rgba(255, 255, 255, 0.4);
                        border-radius: 10px;
                        outline: none;
                        
                        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12),
                                    inset 0 1px 2px rgba(255, 255, 255, 0.4);
                    }
                    
                    .password-input::placeholder {
                        color: rgba(29, 29, 31, 0.4);
                        font-weight: 400;
                    }
                    
                    .password-input:focus {
                        background: rgba(255, 255, 255, 0.95);
                        border-color: rgba(255, 255, 255, 0.6);
                        box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.15),
                                    0 8px 24px rgba(0, 0, 0, 0.15),
                                    inset 0 1px 2px rgba(255, 255, 255, 0.5);
                        transform: translateY(-1px);
                    }
                    
                    /* macOS风格按钮 */
                    .unlock-button {
                        width: 100%;
                        padding: 16px 20px;
                        font-size: 15px;
                        font-weight: 600;
                        color: #ffffff;
                        
                        background: rgba(255, 255, 255, 0.2);
                        backdrop-filter: blur(20px) saturate(180%);
                        -webkit-backdrop-filter: blur(20px) saturate(180%);
                        
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        border-radius: 10px;
                        cursor: pointer;
                        
                        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
                        letter-spacing: 0.3px;
                    }
                    
                    .unlock-button:hover {
                        background: rgba(255, 255, 255, 0.3);
                        border-color: rgba(255, 255, 255, 0.4);
                        transform: translateY(-2px);
                        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
                    }
                    
                    .unlock-button:active {
                        transform: translateY(0);
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
                    }
                    
                    /* 错误提示 - macOS风格 */
                    .error-message {
                        margin-top: 16px;
                        padding: 12px 16px;
                        
                        background: rgba(255, 59, 48, 0.9);
                        backdrop-filter: blur(20px);
                        -webkit-backdrop-filter: blur(20px);
                        
                        border-radius: 8px;
                        
                        color: #ffffff;
                        font-size: 13px;
                        font-weight: 500;
                        
                        animation: slideDownBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                        box-shadow: 0 4px 16px rgba(255, 59, 48, 0.3);
                    }
                    
                    @keyframes slideDownBounce {
                        from {
                            opacity: 0;
                            transform: translateY(-15px) scale(0.95);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0) scale(1);
                        }
                    }
                    
                    .error-message::before {
                        content: '⚠️';
                        margin-right: 6px;
                    }
                    
                    /* 错误时输入框抖动 - macOS风格 */
                    .shake {
                        animation: macShake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97);
                    }
                    
                    @keyframes macShake {
                        0%, 100% { transform: translateX(0); }
                        10%, 50%, 90% { transform: translateX(-8px); }
                        30%, 70% { transform: translateX(8px); }
                    }
                    
                    /* 底部提示 */
                    .bottom-hint {
                        position: absolute;
                        bottom: 40px;
                        font-size: 13px;
                        font-weight: 400;
                        color: rgba(255, 255, 255, 0.6);
                        letter-spacing: 0.2px;
                        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
                    }
                    
                    /* 全局强制隐藏所有可能的按钮 */
                    button:not(.unlock-button),
                    input[type="button"],
                    input[type="submit"]:not([name="password"]),
                    [type="button"]:not(.unlock-button),
                    .dialog-button-row,
                    *[class*="button"]:not(.unlock-button),
                    *[class*="submit"]:not(.unlock-button) {
                        /* 使按钮极小 */
                        width: 1px !important;
                        height: 1px !important;
                        min-width: 1px !important;
                        min-height: 1px !important;
                        max-width: 1px !important;
                        max-height: 1px !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        border: none !important;
                        font-size: 0 !important;
                        opacity: 0 !important;
                        overflow: hidden !important;
                        position: fixed !important;
                        bottom: 0 !important;
                        right: 0 !important;
                        z-index: -9999 !important;
                    }
                </style>
                
                <form name="appLocker">
                    <div class="lock-overlay">
                        <!-- 顶部时间显示 -->
                        <div class="time-display" id="timeDisplay"></div>
                        
                        <div class="lock-content">
                            <!-- 用户头像 -->
                            <div class="user-avatar-wrapper">
                                <div class="user-avatar">
                                    <svg class="avatar-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                                        <!-- 用户图标 -->
                                        <circle cx="32" cy="24" r="12" fill="#667eea" opacity="0.9"/>
                                        <path d="M 16 48 Q 16 38, 32 38 Q 48 38, 48 48 L 48 52 L 16 52 Z" 
                                              fill="#667eea" opacity="0.9"/>
                                    </svg>
                                </div>
                            </div>
                            
                            <div class="user-name">Joplin</div>
                            <div class="lock-subtitle">请输入密码解锁</div>
                            
                            <div class="input-wrapper">
                                <input 
                                    type="password" 
                                    name="password" 
                                    class="password-input ${needShowError ? 'shake' : ''}"
                                    placeholder="密码"
                                    autofocus
                                    autocomplete="off"
                                />
                            </div>
                            
                            <button type="submit" class="unlock-button">解锁</button>
                            
                            ${needShowError ? '<div class="error-message">密码错误</div>' : ''}
                        </div>
                        
                        <!-- 底部提示 -->
                        <div class="bottom-hint">Joplin App Locker</div>
                    </div>
                </form>
                
                <script>
                    // 持续监控并隐藏默认按钮
                    (function hideDefaultButtons() {
                        function hideButtons() {
                            const selectors = [
                                'button:not(.unlock-button)',
                                'input[type="button"]',
                                'input[type="submit"]:not([name="password"])',
                                '[type="button"]:not(.unlock-button)'
                            ];
                            
                            selectors.forEach(function(selector) {
                                try {
                                    const elements = document.querySelectorAll(selector);
                                    elements.forEach(function(elem) {
                                        elem.style.display = 'none';
                                        elem.style.visibility = 'hidden';
                                        elem.style.opacity = '0';
                                        elem.style.position = 'absolute';
                                        elem.style.left = '-99999px';
                                        elem.style.pointerEvents = 'none';
                                    });
                                } catch(e) {}
                            });
                        }
                        
                        // 立即执行
                        hideButtons();
                        // 延迟执行
                        setTimeout(hideButtons, 10);
                        setTimeout(hideButtons, 100);
                        setTimeout(hideButtons, 500);
                        
                        // 持续监控DOM变化
                        if (window.MutationObserver) {
                            const observer = new MutationObserver(hideButtons);
                            observer.observe(document.body, {
                                childList: true,
                                subtree: true
                            });
                        }
                    })();
                    
                    // 更新时间显示
                    function updateTime() {
                        const now = new Date();
                        const timeStr = now.toLocaleTimeString('zh-CN', { 
                            hour: '2-digit', 
                            minute: '2-digit'
                        });
                        const dateStr = now.toLocaleDateString('zh-CN', { 
                            month: 'long', 
                            day: 'numeric',
                            weekday: 'long'
                        });
                        const timeDisplay = document.getElementById('timeDisplay');
                        if (timeDisplay) {
                            timeDisplay.textContent = dateStr + ' ' + timeStr;
                        }
                    }
                    updateTime();
                    setInterval(updateTime, 1000);
                    
                    // 尝试访问外层对话框并隐藏按钮
                    (function hideExternalButtons() {
                        function tryHide() {
                            try {
                                // 尝试访问父级文档
                                if (window.parent && window.parent.document) {
                                    const buttons = window.parent.document.querySelectorAll('button, input[type="button"]');
                                    buttons.forEach(function(btn) {
                                        if (btn.textContent && (btn.textContent.toLowerCase().includes('submit') || btn.textContent.toLowerCase().includes('unlock'))) {
                                            btn.style.display = 'none';
                                        }
                                    });
                                }
                                
                                // 尝试从当前文档向上查找
                                let current = document.body;
                                for (let i = 0; i < 10; i++) {
                                    if (current.parentElement) {
                                        current = current.parentElement;
                                        const btns = current.querySelectorAll('button, input[type="button"]');
                                        btns.forEach(function(btn) {
                                            if (!btn.className || !btn.className.includes('unlock-button')) {
                                                // 使按钮变得极小
                                                btn.style.width = '1px';
                                                btn.style.height = '1px';
                                                btn.style.minWidth = '1px';
                                                btn.style.minHeight = '1px';
                                                btn.style.padding = '0';
                                                btn.style.margin = '0';
                                                btn.style.fontSize = '0';
                                                btn.style.opacity = '0';
                                                btn.style.border = 'none';
                                                btn.style.overflow = 'hidden';
                                            }
                                        });
                                    }
                                }
                            } catch (e) {
                                // 跨域限制，忽略错误
                            }
                        }
                        
                        tryHide();
                        setTimeout(tryHide, 50);
                        setTimeout(tryHide, 200);
                        setTimeout(tryHide, 1000);
                    })();
                </script>
                `
            );
            // 恢复按钮以确保对话框能正确返回数据，但用CSS隐藏
            await Dialogs.setButtons(lockDialog, [
                { id: 'submit', title: '\u200B' }  // 使用零宽空格作为标题
            ]);
            await Dialogs.setFitToContent(lockDialog, false);

            lockResult = await Dialogs.open(lockDialog);

            if (lockResult?.formData?.appLocker?.password !== pswd) {
                lockId = null;
                resetLock(true, pswd);
            } else {
                lockId = null;
                startTime = +new Date();
                clearTimeout(checkTimer);
                checkIdle(false);
            }
        };

        // check app is idle or not
        const checkIdle = async (actNow) => {
            const lockTimer = parseInt(
                (await joplin.settings.value('appLockerTimer')) || '5'
            );
            const pswd = (
                (await joplin.settings.value('appLockerPswd')) || ''
            ).trim();

            // if pswd is not set , not lock app
            if (pswd === '') {
                await showMessage('Password is empty, plugin app locker will not work.')
            }

            if (actNow && pswd) {
                resetLock(null, pswd);
                return false;
            }

            if (lockTimer > 0 && pswd) {
                const now = +new Date();
                const checkTime = (lockTimer - 1) * 60 * 1000 + 60 * 1000;

                // console.log(
                //     [
                //         lockTimer,
                //         pswd,
                //         now - startTime,
                //         new Date(startTime),
                //         'checking joplin idle status',
                //     ].join(',')
                // );

                clearTimeout(checkTimer);
                checkTimer = setTimeout(() => {
                    if (now - startTime + checkTime > lockTimer * 60 * 1000) {
                        resetLock(null, pswd);
                    } else {
                        checkIdle(false);
                    }
                }, checkTime);
            }
        };

        // when note changed, check app status again
        joplin.workspace.onNoteChange(() => {
            startTime = +new Date();
            clearTimeout(checkTimer);
            checkIdle(false);
        });

        // register command
        joplin.commands.register({
            name: 'AppLocker.AppLockNow',
            label: 'AppLocker.AppLockNow',
            enabledCondition: '',
            execute: async () => {
                await checkIdle(true)
            }
        });

        // create contextMenu 
        joplin.views.menuItems.create("AppLocker.AppLockNow", "AppLocker.AppLockNow", MenuItemLocation.Edit);
        joplin.views.menuItems.create("AppLocker.AppLockNow", "AppLocker.AppLockNow", MenuItemLocation.EditorContextMenu);

        // create Tools menuItems
        let menuItems = []
        menuItems.push({ commandName: 'AppLocker.AppLockNow', accelerator: 'Ctrl+Cmd+Option+L' })
        await joplin.views.menus.create('AppLocker', 'AppLocker', menuItems, MenuItemLocation.Tools);

        // if pswd is not set , lock app on login
        const pswd = (
            (await joplin.settings.value('appLockerPswd')) || ''
        ).trim();
        if (pswd !== '') {
            checkIdle(true);
        }

    },
});
