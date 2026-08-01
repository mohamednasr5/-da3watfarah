/* ===================================================
   Unified Site Footer - shared behaviour
   Only defines shareOnWhatsApp / shareOnTwitter /
   shareOnTelegram / copyInvitationLink when a page
   hasn't already defined its own (e.g. invitation.html
   / invite.html already build a personalized message).
   =================================================== */
(function () {
    function genericShareText() {
        var title = document.title || 'دعوة فرح';
        return '✨ ' + title;
    }

    if (typeof window.shareOnWhatsApp !== 'function') {
        window.shareOnWhatsApp = function () {
            var url = encodeURIComponent(window.location.href);
            var text = encodeURIComponent(genericShareText());
            window.open('https://wa.me/?text=' + text + '%20' + url, '_blank');
        };
    }

    if (typeof window.shareOnTwitter !== 'function') {
        window.shareOnTwitter = function () {
            var url = encodeURIComponent(window.location.href);
            var text = encodeURIComponent(genericShareText());
            window.open('https://twitter.com/intent/tweet?text=' + text + '&url=' + url, '_blank');
        };
    }

    if (typeof window.shareOnTelegram !== 'function') {
        window.shareOnTelegram = function () {
            var url = encodeURIComponent(window.location.href);
            var text = encodeURIComponent(genericShareText());
            window.open('https://t.me/share/url?url=' + url + '&text=' + text, '_blank');
        };
    }

    if (typeof window.copyInvitationLink !== 'function') {
        window.copyInvitationLink = function () {
            navigator.clipboard.writeText(window.location.href).then(function () {
                if (typeof window.showNotification === 'function') {
                    window.showNotification('تم نسخ الرابط بنجاح!', 'success');
                } else {
                    alert('تم نسخ الرابط بنجاح!');
                }
            }).catch(function () {
                if (typeof window.showNotification === 'function') {
                    window.showNotification('فشل نسخ الرابط', 'error');
                } else {
                    alert('فشل نسخ الرابط');
                }
            });
        };
    }
})();
