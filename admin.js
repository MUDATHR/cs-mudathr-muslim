'use strict';
/* Personal site editor. Tokens are memory-only and never written into content. */
(function () {
  const REPO = 'MUDATHR/cs-mudathr-muslim';
  const CONTENT_FILE = 'assets/site-content.json';
  const API = 'https://api.github.com';
  let token = '';
  let editor = null;
  let sha = null;
  let defaults = null;
  let currentUser = null;
  let changed = false;

  const groups = [
    ['الواجهة الرئيسية', [
      ['eyebrow','العبارة الصغيرة أعلى الصفحة'],['heroTitle','العنوان الرئيسي'],
      ['heroHighlight','العنوان الذهبي'],['heroDescription','وصف الموقع'],
      ['heroDownloadButton','نص زر التحميل الرئيسي'],['heroSecondaryButton','زر استكشاف المميزات'],
      ['downloadNav','زر التحميل في أعلى الموقع'],['microNote','الملاحظة أسفل الأزرار']
    ]],
    ['عن التطبيق', [
      ['aboutTitle','عنوان القسم'],['aboutHighlight','العنوان الذهبي'],
      ['aboutIntro','الوصف الصغير'],['aboutDetailTitle','عنوان التعريف'],
      ['aboutDetailHighlight','العنوان الثاني'],['aboutDescription','الوصف الكامل']
    ]],
    ['المميزات', [
      ['featuresTitle','عنوان المميزات'],['featuresHighlight','العنوان الذهبي'],
      ['feature1Title','الميزة الأولى — عنوان'],['feature1Description','الميزة الأولى — وصف'],
      ['feature2Title','الميزة الثانية — عنوان'],['feature2Description','الميزة الثانية — وصف'],
      ['feature3Title','الميزة الثالثة — عنوان'],['feature3Description','الميزة الثالثة — وصف'],
      ['feature4Title','الميزة الرابعة — عنوان'],['feature4Description','الميزة الرابعة — وصف']
    ]],
    ['التنزيلات وتذييل الموقع', [
      ['downloadTitle','عنوان التحميل'],['downloadHighlight','العنوان الذهبي'],
      ['downloadDescription','وصف التنزيل'],['downloadBadge','شارة المجانية'],
      ['availabilityMessage','رسالة توفر التطبيق'],['footerDescription','وصف أسفل الموقع'],
      ['faqTitle','عنوان الأسئلة الشائعة']
    ]],
    ['الإعلان العام', [['announcement','نص الإعلان الذي يظهر فوق الواجهة الرئيسية']]]
  ];
  const colors = [
    ['background','خلفية الموقع','لون خلفية الصفحات'],
    ['gold','اللون الذهبي','العناوين والتفاصيل الذهبية'],
    ['cyan','اللون الأزرق','التأثيرات الزرقاء']
  ];
  const vis = [
    ['about','قسم عن التطبيق'],['features','قسم المميزات'],
    ['download','قسم التحميل'],['faq','الأسئلة الشائعة'],
    ['announcement','إظهار الإعلان العام']
  ];
  const $ = id => document.getElementById(id);
  const clone = obj => JSON.parse(JSON.stringify(obj));
  const setMsg = (msg, type = '') => { const e=$('message');e.textContent=msg;e.className=type; };
  const setBusy = b => { $('save-btn').disabled=b; $('refresh-btn').disabled=b; $('login-btn').disabled=b; };

  async function api(path, opts = {}, allowMissing = false) {
    if (!token) throw new Error('يجب ربط حساب GitHub قبل التعديل.');
    let response;
    try {
      response = await fetch(API + path, {
        ...opts,
        headers: {
          'Accept':'application/vnd.github+json',
          'Authorization':'Bearer ' + token,
          'X-GitHub-Api-Version':'2022-11-28',
          ...(opts.body ? {'Content-Type':'application/json'} : {}),
          ...(opts.headers || {})
        },
        cache:'no-store'
      });
    } catch (_) { throw new Error('تعذّر الاتصال بـ GitHub. تأكد من الإنترنت.'); }
    if (allowMissing && response.status === 404) return null;
    if (!response.ok) {
      let detail='';
      try {detail=(await response.json()).message || '';}catch(_){}
      if (response.status === 401) throw new Error('رمز الوصول غير صحيح أو منتهي الصلاحية.');
      if (response.status === 403) throw new Error('GitHub رفض الطلب؛ تأكد من Contents: Read and write للمستودع فقط.');
      if (response.status === 409) throw new Error('تغيّر الملف من جهاز آخر. اضغط تحديث ثم أعد الحفظ.');
      throw new Error('GitHub: ' + response.status + ' ' + detail);
    }
    return await response.json();
  }
  function fromBase64(b64) {
    const binary=atob(b64.replace(/\s/g,''));
    const bytes=Uint8Array.from(binary, c=>c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  }
  function toBase64(text) {
    const bytes=new TextEncoder().encode(text);
    let binary='';
    for (let i=0;i<bytes.length;i+=8192) binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(binary);
  }
  async function getFile(path, missing=false) {return await api('/repos/'+REPO+'/contents/'+path+'?ref=main', {}, missing);}
  async function putFile(path, contentB64, oldSha, message) {
    return await api('/repos/'+REPO+'/contents/'+path,{
      method:'PUT',
      body:JSON.stringify({message,branch:'main',content:contentB64,...(oldSha?{sha:oldSha}:{})})
    });
  }
  async function loadPublicDefaults() {
    try {
      const r=await fetch('assets/site-defaults.json?v='+Date.now(),{cache:'no-store'});
      return r.ok ? await r.json() : null;
    }catch(_){return null;}
  }
  async function loadData() {
    const r=await getFile(CONTENT_FILE);
    if (!r || r.type !== 'file') throw new Error('ملف إعدادات الموقع غير موجود. أعد تثبيت لوحة الإدارة.');
    sha=r.sha;
    const decoded=JSON.parse(fromBase64(r.content));
    if (!decoded.text || !decoded.theme || !decoded.visibility || !decoded.images) throw new Error('بيانات إعدادات الموقع غير مكتملة.');
    editor=decoded;
    defaults=defaults || clone(decoded);
    changed=false;
    render();
  }
  function markChanged() {
    changed=true;
    $('dirty-state').textContent='تعديلات غير منشورة';
    preview();
  }
  function preview() {
    $('live-headline').textContent=editor.text.heroTitle || '';
    $('live-subheadline').textContent=editor.text.heroHighlight || '';
    $('live-subheadline').style.color=editor.theme.gold || '#ecc87d';
  }
  function render() {
    const area=$('text-fields');area.replaceChildren();
    for (const [groupName, fields] of groups) {
      const group=document.createElement('div');group.className='form-group';
      const title=document.createElement('h3');title.textContent=groupName;group.appendChild(title);
      const grid=document.createElement('div');grid.className='field-grid';
      for (const [key,label] of fields) {
        const row=document.createElement('div');row.className='field';
        const value=String(editor.text[key]??'');
        const long=/Description|Intro|announcement|footerDescription|heroDescription|aboutDescription|availabilityMessage/i.test(key);
        if(long) row.classList.add('wide');
        const lab=document.createElement('label');lab.textContent=label;lab.htmlFor='field-'+key;
        const inp=document.createElement(long?'textarea':'input');
        inp.id='field-'+key;if(!long)inp.type='text';
        inp.value=value;inp.maxLength=long?1400:180;
        inp.addEventListener('input',()=>{editor.text[key]=inp.value;markChanged();});
        row.append(lab,inp);grid.appendChild(row);
      }
      group.appendChild(grid);area.appendChild(group);
    }
    const colorsEl=$('theme-fields');colorsEl.replaceChildren();
    for (const [key,title,sub] of colors) {
      const card=document.createElement('div');card.className='color-card';
      const inp=document.createElement('input');inp.type='color';inp.value=editor.theme[key]||'#ecc87d';
      inp.setAttribute('aria-label',title);
      inp.addEventListener('input',()=>{editor.theme[key]=inp.value;markChanged();});
      const box=document.createElement('div');const lab=document.createElement('label');lab.textContent=title;
      const small=document.createElement('small');small.textContent=sub;box.append(lab,small);card.append(inp,box);colorsEl.appendChild(card);
    }
    const visArea=$('visibility-fields');visArea.replaceChildren();
    for (const [key,label] of vis) {
      const row=document.createElement('label');row.className='switch-line';
      const span=document.createElement('span');span.textContent=label;
      const check=document.createElement('input');check.type='checkbox';check.checked=editor.visibility[key]!==false;
      check.addEventListener('change',()=>{editor.visibility[key]=check.checked;markChanged();});
      row.append(span,check);visArea.appendChild(row);
    }
    $('apk-url').value=editor.downloadUrl || '';
    if (editor.images.logo) $('logo-preview').src=editor.images.logo;
    if (editor.images.screenshot) $('screenshot-preview').src=editor.images.screenshot;
    $('dirty-state').textContent='التغييرات محفوظة';
    preview();
  }
  $('apk-url').addEventListener('input', e=>{if(!editor)return;editor.downloadUrl=e.target.value.trim();markChanged();});
  $('navigation').querySelectorAll('button[data-panel]').forEach(button=>{
    button.addEventListener('click',()=>{
      $('navigation').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===button));
      document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id==='panel-'+button.dataset.panel));
    });
  });
  $('login-form').addEventListener('submit',async e=>{
    e.preventDefault();token=$('token').value.trim();$('token').value='';
    if (!token) return;
    setBusy(true);setMsg('جارٍ التحقق من حساب GitHub...');
    try {
      const who=await api('/user');
      if(String(who.login||'').toLowerCase()!=='mudathr') throw new Error('الحساب غير مطابق لمالك الموقع MUDATHR.');
      const repo=await api('/repos/'+REPO);
      if (!repo.permissions?.push) throw new Error('الحساب لا يملك صلاحية تعديل المستودع.');
      currentUser=who.login;
      await loadData();
      $('login').hidden=true;$('workspace').hidden=false;
      $('connect-state').classList.add('connected');$('connect-state').innerHTML='<i></i> متصل';
      $('account-name').textContent='GitHub / '+currentUser;
      setMsg('تم ربط حسابك بنجاح. تگدر تعدّل وتنشر هسه.','ok');
    } catch(err) { token='';setMsg(err.message,'error'); }
    finally {setBusy(false);}
  });
  $('save-btn').addEventListener('click',async()=>{
    if(!editor||!token)return;
    const url=editor.downloadUrl.trim();
    if (url && !/^https:\/\/github\.com\/[a-z\d-]+\/[a-z\d_.-]+\/releases\/(?:latest\/download|download\/[a-z\d_.-]+)\/[a-z\d_.-]+\.apk$/i.test(url)) {
      setMsg('الرابط لازم يكون APK من صفحة إصدار GitHub، أو اتركه فارغاً.','error');return;
    }
    setBusy(true);setMsg('جارٍ رفع التغييرات إلى موقعك...');
    try {
      const current=await getFile(CONTENT_FILE);
      if (current.sha!==sha) throw new Error('ملف الموقع تغيّر من جهاز ثاني. اضغط تحديث أولاً حتى ما تخسر تعديلات أحد.');
      const result=await putFile(CONTENT_FILE,toBase64(JSON.stringify(editor,null,2)+'\n'),sha,'Update website content from C.S dashboard');
      sha=result.content.sha;changed=false;
      $('dirty-state').textContent='التغييرات منشورة';
      setMsg('تم الحفظ على GitHub بنجاح. راح تظهر التغييرات بعد تحديث GitHub Pages.','ok');
    } catch(err){setMsg(err.message,'error');}
    finally{setBusy(false);}
  });
  $('refresh-btn').addEventListener('click',async()=>{
    if(changed&&!confirm('عدك تعديلات ما انحفظت. تريد تلغيها وتحمل آخر نسخة؟'))return;
    setBusy(true);try{await loadData();setMsg('تم تحميل آخر إعدادات الموقع.','ok');}catch(err){setMsg(err.message,'error');}finally{setBusy(false);}
  });
  $('logout-btn').addEventListener('click',()=>{token='';editor=null;sha=null;currentUser=null;location.reload();});
  $('reset-btn').addEventListener('click',()=>{
    if(!confirm('ترجع النصوص الافتراضية؟ الصور والألوان ورابط التحميل ما يتغيرن.'))return;
    editor.text=clone(defaults.text);markChanged();render();changed=true;$('dirty-state').textContent='تحتاج حفظ ونشر';
    setMsg('تم إرجاع النصوص في المعاينة؛ اضغط حفظ ونشر لاعتمادها.');
  });
  const uploadMap={logo:{input:'logo-file',file:'assets/brand-custom.webp',name:'شعار الموقع',preview:'logo-preview'},screenshot:{input:'screenshot-file',file:'assets/screen-custom.webp',name:'صورة التطبيق',preview:'screenshot-preview'}};
  async function compress(file) {
    if(file.size>14*1024*1024) throw new Error('حجم الصورة كبير. الحد الأقصى للصورة الأصلية 14 ميغابايت.');
    const img=await createImageBitmap(file);
    const scale=Math.min(1,1300/Math.max(img.width,img.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);img.close();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.84));
    if(!blob||blob.size>4*1024*1024)throw new Error('ما گدرنا نضغط الصورة. جرّب صورة أصغر.');
    const bytes=new Uint8Array(await blob.arrayBuffer());
    let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(binary);
  }
  document.querySelectorAll('.upload-action').forEach(button=>button.addEventListener('click',async()=>{
    if(!token||!editor)return;
    const key=button.dataset.media;const info=uploadMap[key];
    const file=$(info.input).files?.[0];if(!file){setMsg('اختار صورة أولاً.','error');return;}
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setMsg('الصيغ المسموحة PNG / JPG / WebP فقط.','error');return;}
    button.disabled=true;setMsg('جارٍ ضغط ورفع '+info.name+' إلى GitHub...');
    try{
      const content=await compress(file);
      const previous=await getFile(info.file,true);
      await putFile(info.file,content,previous?.sha,'Update '+key+' image from site dashboard');
      editor.images[key]=info.file+'?v='+Date.now();
      $(info.preview).src=editor.images[key];markChanged();
      setMsg('نجح رفع الصورة إلى GitHub. اضغط «حفظ ونشر» لاعتمادها بالموقع.','ok');
    }catch(err){setMsg(err.message,'error');}
    finally{button.disabled=false;}
  }));
  window.addEventListener('beforeunload',e=>{if(changed){e.preventDefault();e.returnValue='';}});
  loadPublicDefaults().then(d=>{if(d)defaults=d;});
})();
