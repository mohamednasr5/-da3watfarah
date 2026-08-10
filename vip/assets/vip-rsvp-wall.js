/* ===================================================
   دعوة فرح - توحيد "تأكيد الحضور" و "جدار التهاني" في VIP
   ============================================================
   يُحقن بسطرين فقط قبل </body> في كل صفحات الديمو (نفس نمط
   vip-widget.js / vip-dynamic-sections.js المستخدم فعلاً في
   المشروع)، ويعمل تلقائياً على أي قالب من الـ 18 قالب VIP
   دون الحاجة لتعديل الكود الداخلي لكل قالب، لأنه يعتمد على
   الخاصيّات الثابتة المشتركة بين كل القوالب:
     - data-einvite-section="rsvp"
     - [data-rsvp-form] / [data-rsvp-success] / [data-rsvp-declined]
     - أسماء الحقول: name / phone / phone_country_code /
       attending / party_size / message
     - كلاسات تنتهي بنفس اللاحقة في كل قالب (-field, -form-row,
       -att, -att-opt, -submit, -heading, -eyebrow...) حتى لو
       اختلفت البادئة (ei- / t2- / wh- ...)

   الوظيفة:
     1) حذف حقل "رقم الجوال" بالكامل (تصميم الحضور في VIP
        كان يعتمد على رقم الهاتف - تم إلغاؤه).
     2) تغليف نموذج تأكيد الحضور بنفس شكل الكارت المعتمد
        (هيدر بتدرّج لوني + جسم فاتح) باستخدام ألوان القالب
        نفسه (--ei-accent / --ei-ink / --ei-line ...).
     3) إضافة قسم "جدار التهاني" (اسم + رسالة أو تسجيل صوتي)
        بنفس الشكل والستايل مباشرة بعد قسم تأكيد الحضور.
   =================================================== */
(function () {
    'use strict';

    var STYLE_ID = 'df-rsvp-wall-style';

    function ready(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    function esc(str) {
        return String(str).replace(/[&<>"']/g, function (c) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
        });
    }

    /* بعض القوالب (مثل royal-maroon) لا تستخدم متغيرات --ei-*
       العامة، بل نظام ألوان خاص بها. في هذه الحالة نصنع
       "نسخة" من متغيراتها الخاصة داخل --ei-* حتى يبقى نفس
       الكود يعمل ويتلوّن تلقائياً بألوان القالب نفسه. */
    function ensureThemeVarsFallback() {
        var cs = getComputedStyle(document.documentElement);
        if (cs.getPropertyValue('--ei-accent').trim()) return; // already has the standard vars
        var map = {
            '--ei-accent': ['--gold', '--gold-2', '--primary-gold', '--accent'],
            '--ei-ink': ['--cream-text', '--deep', '--ink', '--text-primary'],
            '--ei-soft': ['--body-text-soft', '--body-text', '--soft'],
            '--ei-line': ['--panel-border', '--input-border', '--line'],
            '--ei-bg': ['--ivory', '--surface', '--bg']
        };
        var rules = ':root{';
        Object.keys(map).forEach(function (target) {
            var candidates = map[target];
            for (var i = 0; i < candidates.length; i++) {
                var val = cs.getPropertyValue(candidates[i]).trim();
                if (val) { rules += target + ':' + val + ';'; break; }
            }
        });
        rules += '}';
        var style = document.createElement('style');
        style.textContent = rules;
        document.head.appendChild(style);
    }

    function injectStyleOnce() {
        if (document.getElementById(STYLE_ID)) return;
        var css = [
            /* ---------- RSVP card ---------- */
            '.df-rsvp-card{max-width:640px;margin:0 auto;border-radius:22px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.16);background:#fff;}',
            '.df-rsvp-head{padding:2.4rem 1.8rem;text-align:center;color:#fff;background:linear-gradient(135deg,var(--ei-accent,#b8965a),color-mix(in srgb, var(--ei-accent,#b8965a) 55%, #000 20%));}',
            '.df-rsvp-head .df-rsvp-icon{width:52px;height:52px;margin:0 auto 14px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:1.4rem;}',
            '.df-rsvp-head [class$="-eyebrow"],.df-rsvp-head [class*="-eyebrow "]{color:rgba(255,255,255,.85)!important;}',
            '.df-rsvp-head [class$="-heading"],.df-rsvp-head h2{color:#fff!important;font-size:1.7rem!important;margin:.3rem 0!important;}',
            '.df-rsvp-head [class$="-rsvp-note"],.df-rsvp-head p{color:rgba(255,255,255,.9)!important;font-size:.98rem!important;max-width:none!important;}',
            '.df-rsvp-head [aria-hidden="true"]{filter:brightness(0) invert(1);opacity:.85;}',
            '.df-rsvp-body{padding:2.2rem 1.8rem;background:#fff;}',
            '.df-rsvp-body [class$="-form-row"]{display:grid;grid-template-columns:1fr 1fr;gap:1.2rem;}',
            '.df-rsvp-body [class$="-field"]{display:flex;flex-direction:column;gap:.4rem;margin-bottom:1.4rem;}',
            '.df-rsvp-body [class$="-field"] label{font-size:.82rem;font-weight:600;color:var(--ei-soft,#776e58);text-transform:none!important;letter-spacing:0!important;}',
            '.df-rsvp-body [class$="-field"] input,.df-rsvp-body [class$="-field"] select,.df-rsvp-body [class$="-field"] textarea{background:#faf9f6!important;color:var(--ei-ink,#222)!important;border:2px solid var(--ei-line,#e5e0d8)!important;border-radius:12px!important;padding:.85rem 1rem!important;font-size:1rem!important;color-scheme:light;}',
            '.df-rsvp-body [class$="-field"] input:focus,.df-rsvp-body [class$="-field"] select:focus,.df-rsvp-body [class$="-field"] textarea:focus{border-color:var(--ei-accent,#b8965a)!important;}',
            '.df-rsvp-body [class$="-field"] select option{color:#111;background:#fff;}',
            '.df-rsvp-body [class$="-att-label"]{display:block;font-size:.82rem;font-weight:600;color:var(--ei-soft,#776e58);margin-bottom:.7rem;}',
            '.df-rsvp-body [class$="-att"],.df-rsvp-body [class*="attendance-toggle"]{display:grid!important;grid-template-columns:1fr 1fr;gap:12px!important;background:none!important;border:0!important;margin-bottom:1.4rem;}',
            '.df-rsvp-body [class$="-att-opt"] label,.df-rsvp-body [class*="att-option"] label{display:flex!important;align-items:center;justify-content:center;gap:.4rem;background:#fff!important;border:2px solid var(--ei-line,#e5e0d8)!important;border-radius:14px!important;padding:1rem .6rem!important;font-weight:600!important;color:var(--ei-ink,#222)!important;cursor:pointer;transition:all .2s;}',
            '.df-rsvp-body [class$="-att-opt"] input[value="yes"] + label::before,.df-rsvp-body [class*="att-option"] input[value="yes"] + label::before{content:"✓";}',
            '.df-rsvp-body [class$="-att-opt"] input[value="no"] + label::before,.df-rsvp-body [class*="att-option"] input[value="no"] + label::before{content:"✕";}',
            '.df-rsvp-body [class$="-att-opt"] input[value="yes"]:checked + label,.df-rsvp-body [class*="att-option"] input[value="yes"]:checked + label{border-color:var(--ei-accent,#b8965a)!important;background:color-mix(in srgb, var(--ei-accent,#b8965a) 14%, #fff)!important;color:var(--ei-accent,#b8965a)!important;}',
            '.df-rsvp-body [class$="-att-opt"] input[value="no"]:checked + label,.df-rsvp-body [class*="att-option"] input[value="no"]:checked + label{border-color:#EF4444!important;background:#FEF2F2!important;color:#DC2626!important;}',
            '.df-rsvp-body [class$="-submit"]{width:100%!important;background:linear-gradient(135deg,var(--ei-accent,#b8965a),color-mix(in srgb, var(--ei-accent,#b8965a) 55%, #000 15%))!important;color:#fff!important;border:0!important;border-radius:14px!important;padding:1.05rem!important;font-size:1rem!important;font-weight:700!important;text-transform:none!important;letter-spacing:0!important;}',
            '.df-rsvp-body [class*="-success"]{background:#faf9f6;border:1px solid var(--ei-line,#e5e0d8);border-radius:14px;padding:2rem 1.6rem;text-align:center;}',
            '.df-rsvp-body [class*="-success"] h3{color:var(--ei-ink,#222)!important;}',
            '.df-rsvp-body [class*="-success"] p{color:var(--ei-soft,#776e58)!important;}',
            '.df-rsvp-body [class*="-success-ic"]{margin:0 auto 1rem;border-color:var(--ei-accent,#b8965a)!important;}',
            '.df-rsvp-body [class*="-success-ic"] svg{stroke:var(--ei-accent,#b8965a)!important;}',
            '.df-rsvp-body [class$="-err"]{color:#DC2626!important;}',
            /* ---------- Wishes wall ---------- */
            '.df-wishes{padding:6rem 0;overflow:hidden;}',
            '.df-wish-form{max-width:640px;margin:0 auto 2.4rem;background:#fff;border:1px solid var(--ei-line,#e5e0d8);border-radius:20px;padding:2rem 1.8rem;box-shadow:0 10px 34px rgba(0,0,0,.08);}',
            '.df-wish-form .df-field{display:flex;flex-direction:column;gap:.4rem;margin-bottom:1.2rem;}',
            '.df-wish-form label{font-size:.82rem;font-weight:600;color:var(--ei-soft,#776e58);}',
            '.df-wish-form input,.df-wish-form textarea{background:#faf9f6;color:var(--ei-ink,#222);border:2px solid var(--ei-line,#e5e0d8);border-radius:12px;padding:.85rem 1rem;font-size:1rem;width:100%;font-family:inherit;color-scheme:light;}',
            '.df-wish-form textarea{resize:none;min-height:90px;}',
            '.df-wish-form input:focus,.df-wish-form textarea:focus{outline:none;border-color:var(--ei-accent,#b8965a);}',
            '.df-voice-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:1.2rem;}',
            '.df-voice-row>span{font-weight:600;font-size:.88rem;color:var(--ei-soft,#776e58);}',
            '.df-voice-btn{display:inline-flex;align-items:center;gap:8px;padding:.6rem 1.1rem;border-radius:999px;border:2px solid var(--ei-accent,#b8965a);background:transparent;color:var(--ei-accent,#b8965a);font-weight:600;font-size:.88rem;cursor:pointer;font-family:inherit;}',
            '.df-voice-btn[data-state="recording"]{background:#FEF2F2;border-color:#EF4444;color:#DC2626;animation:dfVoicePulse 1.2s ease-in-out infinite;}',
            '.df-voice-btn[data-state="done"]{background:#F0FDF4;border-color:#10B981;color:#059669;}',
            '@keyframes dfVoicePulse{0%,100%{opacity:1;}50%{opacity:.55;}}',
            '.df-wish-submit{width:100%;background:linear-gradient(135deg,var(--ei-accent,#b8965a),color-mix(in srgb, var(--ei-accent,#b8965a) 55%, #000 15%));color:#fff;border:0;border-radius:14px;padding:1rem;font-size:1rem;font-weight:700;cursor:pointer;font-family:inherit;}',
            '.df-wish-list{max-width:640px;margin:0 auto;display:flex;flex-direction:column;gap:14px;}',
            '.df-wish-item{background:#fff;border:1px solid var(--ei-line,#e5e0d8);border-radius:16px;padding:1.1rem 1.2rem;display:flex;gap:14px;}',
            '.df-wish-avatar{flex-shrink:0;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--ei-accent,#b8965a),color-mix(in srgb, var(--ei-accent,#b8965a) 55%, #000 15%));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;}',
            '.df-wish-content h4{font-size:1rem;color:var(--ei-ink,#222);margin-bottom:.3rem;}',
            '.df-wish-content p{font-size:.92rem;color:var(--ei-soft,#776e58);line-height:1.7;margin:0;}',
            '.df-wish-time{font-size:.76rem;color:var(--ei-soft,#776e58);opacity:.7;display:block;margin-top:.4rem;}',
            '@media (max-width:640px){.df-rsvp-body [class$="-form-row"]{grid-template-columns:1fr;}.df-rsvp-body [class$="-att"]{grid-template-columns:1fr;}}'
        ].join('');
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function removePhoneField(form) {
        var phoneInput = form.querySelector('input[name="phone"]');
        if (!phoneInput) return;
        var wrapper = phoneInput.closest('[class*="field" i]') || phoneInput.parentElement;
        if (wrapper && wrapper.parentElement) wrapper.parentElement.removeChild(wrapper);
        var hiddenCc = form.querySelector('input[name="phone_country_code"]');
        if (hiddenCc) hiddenCc.remove();
    }

    function transformRsvp(section) {
        var form = section.querySelector('[data-rsvp-form]');
        if (!form || section.querySelector('.df-rsvp-card')) return; // already done or no form

        removePhoneField(form);

        var rsvpInner = form.parentElement;
        var successOk = section.querySelector('[data-rsvp-success]');
        var successDeclined = section.querySelector('[data-rsvp-declined]');
        var invIdInput = section.querySelector('input[name="invitationId"]');

        var headerNodes = [];
        var bodyNodes = [];
        Array.prototype.forEach.call(rsvpInner.children, function (node) {
            if (node === form || node === successOk || node === successDeclined || node === invIdInput) return;
            headerNodes.push(node);
        });
        if (invIdInput) bodyNodes.push(invIdInput);
        if (successOk) bodyNodes.push(successOk);
        if (successDeclined) bodyNodes.push(successDeclined);
        bodyNodes.push(form);

        var card = document.createElement('div');
        card.className = 'df-rsvp-card';

        var head = document.createElement('div');
        head.className = 'df-rsvp-head';
        var icon = document.createElement('div');
        icon.className = 'df-rsvp-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6l9 6 9-6M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        head.appendChild(icon);
        headerNodes.forEach(function (n) { head.appendChild(n); });

        var body = document.createElement('div');
        body.className = 'df-rsvp-body';
        bodyNodes.forEach(function (n) { body.appendChild(n); });

        card.appendChild(head);
        card.appendChild(body);
        rsvpInner.appendChild(card);
    }

    function resetVoiceBtn(btn) {
        btn.dataset.state = 'idle';
        btn.innerHTML = '<span aria-hidden="true">🎙️</span><span>تسجيل صوتي</span>';
    }

    function setupVoice(form) {
        var btn = form.querySelector('.df-voice-btn');
        var mediaRecorder, chunks = [], stream;

        btn.addEventListener('click', function () {
            var state = btn.dataset.state;
            if (state === 'idle') {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    alert('عذراً، متصفحك لا يدعم التسجيل الصوتي');
                    return;
                }
                navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
                    stream = s;
                    chunks = [];
                    mediaRecorder = new MediaRecorder(s);
                    mediaRecorder.ondataavailable = function (e) {
                        if (e.data && e.data.size > 0) chunks.push(e.data);
                    };
                    mediaRecorder.onstop = function () {
                        form._audioBlob = new Blob(chunks, { type: 'audio/webm' });
                        btn.dataset.state = 'done';
                        btn.innerHTML = '<span aria-hidden="true">✅</span><span>تم التسجيل (اضغط لإعادة التسجيل)</span>';
                        stream.getTracks().forEach(function (t) { t.stop(); });
                    };
                    mediaRecorder.start();
                    btn.dataset.state = 'recording';
                    btn.innerHTML = '<span aria-hidden="true">⏹️</span><span>إيقاف التسجيل</span>';
                }).catch(function () {
                    alert('يرجى السماح باستخدام الميكروفون لتسجيل التهنئة الصوتية');
                });
            } else if (state === 'recording') {
                if (mediaRecorder) mediaRecorder.stop();
            } else {
                form._audioBlob = null;
                resetVoiceBtn(btn);
            }
        });
    }

    function addWish(list, name, message, audioBlob) {
        var item = document.createElement('div');
        item.className = 'df-wish-item';
        var html = '<div class="df-wish-avatar">' + esc(name.charAt(0)) + '</div><div class="df-wish-content"><h4>' + esc(name) + '</h4>';
        if (audioBlob) {
            var url = URL.createObjectURL(audioBlob);
            html += '<audio controls src="' + url + '" style="width:100%;margin:6px 0;"></audio>';
        }
        if (message) html += '<p>' + esc(message) + '</p>';
        html += '<span class="df-wish-time">الآن</span></div>';
        item.innerHTML = html;
        list.insertBefore(item, list.firstChild);
    }

    function buildWishesSection() {
        var section = document.createElement('section');
        section.className = 'df-wishes';
        section.setAttribute('data-einvite-section', 'wishes');
        section.innerHTML =
            '<div class="ei-wrap" style="max-width:1180px;margin:0 auto;padding:0 clamp(1.4rem,5vw,5rem);">' +
                '<div style="text-align:center;margin-bottom:2.4rem;">' +
                    '<div aria-hidden="true" style="font-size:1.6rem;margin-bottom:.5rem;">💬</div>' +
                    '<h2 style="font-family:var(--ei-font-ar, var(--ei-font-display));font-weight:600;font-size:clamp(1.6rem,3.4vw,2.3rem);color:var(--ei-ink,#222);margin:0;">جدار التهاني</h2>' +
                '</div>' +
                '<form class="df-wish-form">' +
                    '<div class="df-field"><label>اسمك</label><input type="text" class="df-wish-name" placeholder="أدخل اسمك" required></div>' +
                    '<div class="df-field"><label>رسالة التهنئة</label><textarea class="df-wish-message" placeholder="اكتب رسالة تهنئة.. (أو سجّل تهنئة صوتية بدلاً من ذلك)"></textarea></div>' +
                    '<div class="df-voice-row"><span>أو أرسل تهنئة صوتية</span>' +
                        '<button type="button" class="df-voice-btn" data-state="idle"><span aria-hidden="true">🎙️</span><span>تسجيل صوتي</span></button>' +
                    '</div>' +
                    '<button type="submit" class="df-wish-submit"><span aria-hidden="true">💌</span> إرسال التهنئة</button>' +
                '</form>' +
                '<div class="df-wish-list"></div>' +
            '</div>';
        return section;
    }

    function insertWishesSection(rsvpSection) {
        if (document.querySelector('[data-einvite-section="wishes"]')) return;
        var section = buildWishesSection();
        if (rsvpSection.parentNode) {
            rsvpSection.parentNode.insertBefore(section, rsvpSection.nextSibling);
        } else {
            document.body.appendChild(section);
        }
        var form = section.querySelector('.df-wish-form');
        var list = section.querySelector('.df-wish-list');
        setupVoice(form);
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var name = form.querySelector('.df-wish-name').value.trim();
            var message = form.querySelector('.df-wish-message').value.trim();
            var audioBlob = form._audioBlob;
            if (!name || (!message && !audioBlob)) {
                alert('يرجى كتابة اسمك مع رسالة تهنئة أو تسجيل صوتي');
                return;
            }
            addWish(list, name, message, audioBlob);
            form.reset();
            form._audioBlob = null;
            resetVoiceBtn(form.querySelector('.df-voice-btn'));
        });
    }

    ready(function () {
        try { ensureThemeVarsFallback(); } catch (e) { console.warn('[vip-rsvp-wall] theme-vars', e); }
        try { injectStyleOnce(); } catch (e) { console.warn('[vip-rsvp-wall] style', e); }
        var rsvpSection = document.querySelector('[data-einvite-section="rsvp"]');
        if (!rsvpSection) return;
        try { transformRsvp(rsvpSection); } catch (e) { console.warn('[vip-rsvp-wall] rsvp', e); }
        try { insertWishesSection(rsvpSection); } catch (e) { console.warn('[vip-rsvp-wall] wishes', e); }
    });
})();
