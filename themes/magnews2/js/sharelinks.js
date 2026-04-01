function toggleShare() {
  document.getElementById('sharePanel').classList.toggle('active');
}

function getShareData() {
  return {
    url: encodeURIComponent(location.href),
    title: encodeURIComponent(document.title)
  };
}

function openShare(type) {
  const {url, title} = getShareData();
  let link = '';

  switch(type) {
    case 'weibo':
      link = `https://service.weibo.com/share/share.php?url=${url}&title=${title}`;
      break;
    case 'qq':
      link = `https://connect.qq.com/widget/shareqq/index.html?url=${url}&title=${title}`;
      break;
    case 'twitter':
      link = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
      break;
    case 'facebook':
      link = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      break;
    case 'telegram':
      link = `https://t.me/share/url?url=${url}&text=${title}`;
      break;
    case 'whatsapp':
      link = `https://api.whatsapp.com/send?text=${title}%20${url}`;
      break;
    case 'linkedin':
      link = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
      break;
  }

  window.open(link, '_blank');
}

function copyLink() {
  navigator.clipboard.writeText(location.href);
  alert('链接已复制');
}

// 微信提示
function shareWeChat() {
  alert('微信分享请使用浏览器右上角菜单或生成二维码');
}

// 点击外部关闭
document.addEventListener('click', function(e) {
  if (!e.target.closest('.share-container')) {
    document.getElementById('sharePanel').classList.remove('active');
  }
});
