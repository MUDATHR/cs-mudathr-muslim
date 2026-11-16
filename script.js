'use strict';
(function(){
  const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
  const url=typeof window.MURAD_DOWNLOAD_URL==='string'?window.MURAD_DOWNLOAD_URL.trim():'';
  const available=/^https:\/\/github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+\/releases\/latest\/download\/Muslim_Murad\.apk$/.test(url);
  document.querySelectorAll('a.download-link').forEach(el=>{
    if(available){el.href=url;el.setAttribute('rel','noopener noreferrer');el.setAttribute('aria-label','تنزيل تطبيق مسلم مراد APK');}
    else{el.href='#download';if(el.id==='download-android'){el.setAttribute('aria-disabled','true');el.classList.add('not-yet');el.addEventListener('click',evt=>evt.preventDefault());}}
  });
  const status=document.getElementById('android-status');
  const msg=document.getElementById('availability-message');
  const btnLabel=document.querySelector('.android-label');
  if(available){if(status)status.textContent='متاح الآن';if(msg)msg.textContent='تحميل مباشر من صفحة الإصدار الرسمية على GitHub.';if(btnLabel)btnLabel.textContent='تحميل APK الآن';}
  else{if(btnLabel)btnLabel.textContent='ملف APK قريباً';}
  const project=typeof window.MURAD_PROJECT_URL==='string'?window.MURAD_PROJECT_URL.trim():'';
  if(/^https:\/\/github\.com\/[\w-]+\/[\w.-]+$/.test(project)){const link=document.getElementById('project-link');if(link){link.href=project;link.target='_blank';link.rel='noopener noreferrer';}}
})();

/* CS_MUDATHR_ADMIN_BOOTSTRAP_V1 */
(function () { var s = document.createElement('script'); s.src = 'assets/site-content.js'; document.head.appendChild(s); })();
