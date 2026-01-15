// TOTP (Time-based One-Time Password) 生成器
// 基于 RFC 6238 标准实现

let currentSecret = null;
let updateInterval = null;

// Base32 解码
function base32Decode(base32) {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    base32 = base32.toUpperCase().replace(/=+$/, '');
    let bits = '';
    
    for (let i = 0; i < base32.length; i++) {
        const val = base32Chars.indexOf(base32.charAt(i));
        if (val === -1) throw new Error('密钥包含无效字符');
        bits += val.toString(2).padStart(5, '0');
    }
    
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.substr(i, 8), 2));
    }
    
    return new Uint8Array(bytes);
}

// HMAC-SHA1 实现
async function hmacSha1(key, message) {
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
    return new Uint8Array(signature);
}

// 生成 TOTP
async function generateTOTP(secret, timeStep = 30) {
    try {
        const key = base32Decode(secret);
        const epoch = Math.floor(Date.now() / 1000);
        const time = Math.floor(epoch / timeStep);
        
        const timeBuffer = new ArrayBuffer(8);
        const timeView = new DataView(timeBuffer);
        timeView.setUint32(4, time, false);
        
        const hmac = await hmacSha1(key, new Uint8Array(timeBuffer));
        const offset = hmac[hmac.length - 1] & 0x0f;
        
        const truncated = (
            ((hmac[offset] & 0x7f) << 24) |
            ((hmac[offset + 1] & 0xff) << 16) |
            ((hmac[offset + 2] & 0xff) << 8) |
            (hmac[offset + 3] & 0xff)
        );
        
        const code = (truncated % 1000000).toString().padStart(6, '0');
        return code;
    } catch (error) {
        console.error('生成 TOTP 失败:', error);
        throw error;
    }
}

// 获取剩余时间
function getRemainingTime(timeStep = 30) {
    const epoch = Math.floor(Date.now() / 1000);
    return timeStep - (epoch % timeStep);
}

// 更新验证码显示
async function updateTokenDisplay() {
    if (!currentSecret) return;

    try {
        const token = await generateTOTP(currentSecret);
        const remaining = getRemainingTime();
        const progress = (remaining / 30) * 100;

        document.getElementById('tokenCode').textContent = token;
        document.getElementById('timeLeft').textContent = remaining;
        document.getElementById('progressFill').style.width = progress + '%';

        // 当时间快结束时添加警告效果
        if (remaining <= 5) {
            document.getElementById('tokenCode').style.color = '#ffeb3b';
        } else {
            document.getElementById('tokenCode').style.color = 'white';
        }
    } catch (error) {
        console.error('更新验证码失败:', error);
        stopUpdateLoop();
        alert('生成验证码时出错: ' + error.message);
    }
}

// 开始更新循环
function startUpdateLoop() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    updateTokenDisplay();
    updateInterval = setInterval(updateTokenDisplay, 1000);
    
    const displayEl = document.getElementById('tokenDisplay');
    displayEl.classList.add('show');
}

// 停止更新循环
function stopUpdateLoop() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
    
    const displayEl = document.getElementById('tokenDisplay');
    displayEl.classList.remove('show');
}

// 生成验证码
async function generateToken() {
    const secretInput = document.getElementById('secretKey');
    const secret = secretInput.value.trim().replace(/\s/g, '').toUpperCase();

    if (!secret) {
        alert('请输入 2FA 密钥');
        secretInput.focus();
        return;
    }

    // 验证密钥格式 (Base32)
    if (!/^[A-Z2-7]+=*$/.test(secret)) {
        alert('密钥格式不正确，请输入有效的 Base32 密钥（仅包含 A-Z 和 2-7）');
        secretInput.focus();
        return;
    }

    try {
        currentSecret = secret;
        startUpdateLoop();
    } catch (error) {
        alert('生成验证码失败: ' + error.message);
        currentSecret = null;
    }
}

// 复制验证码
async function copyToken() {
    const tokenCode = document.getElementById('tokenCode').textContent;
    const copyBtn = document.getElementById('copyBtn');
    
    if (tokenCode === '------') {
        return;
    }

    try {
        // 使用 Clipboard API 复制文本
        await navigator.clipboard.writeText(tokenCode);
        
        // 更改按钮样式表示成功
        copyBtn.textContent = '✓';
        copyBtn.classList.add('copied');
        
        // 2秒后恢复原状
        setTimeout(() => {
            copyBtn.textContent = '📋';
            copyBtn.classList.remove('copied');
        }, 2000);
    } catch (error) {
        // 如果 Clipboard API 不可用，使用备用方法
        const textArea = document.createElement('textarea');
        textArea.value = tokenCode;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            copyBtn.textContent = '✓';
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                copyBtn.textContent = '📋';
                copyBtn.classList.remove('copied');
            }, 2000);
        } catch (err) {
            alert('复制失败，请手动复制验证码');
        }
        
        document.body.removeChild(textArea);
    }
}

// 清空所有
function clearAll() {
    document.getElementById('secretKey').value = '';
    currentSecret = null;
    stopUpdateLoop();
    
    document.getElementById('tokenCode').textContent = '------';
    document.getElementById('timeLeft').textContent = '30';
    document.getElementById('progressFill').style.width = '100%';
    
    // 安全地重置复制按钮状态
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.textContent = '📋';
        copyBtn.classList.remove('copied');
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    // 支持回车键生成验证码
    document.getElementById('secretKey').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            generateToken();
        }
    });
});
