(function(){
  'use strict';
  if(window.__BRK_WIDGET__)return;
  window.__BRK_WIDGET__=true;

  const API_BASE=window.__BRK_API_BASE||'https://n8n-brk-buttons.pqcilq.easypanel.host';
  let cachedButtons=[];

  // ── Tema ──
  function isDark(){return document.documentElement.classList.contains('dark')||document.body.classList.contains('dark')}
  function T(){const d=isDark();return{d,bg:d?'#151b26':'#fff',bg2:d?'#1a2233':'#f8fafc',border:d?'#2d3a4d':'#e2e8f0',text:d?'#e8eaf6':'#1e293b',sub:d?'#8b95a5':'#64748b',accent:'#1f93ff',inputBg:d?'#131a27':'#fff'}}

  // ── CSS ──
  function injectCSS(){
    if(document.getElementById('brk-w-css'))return;
    const s=document.createElement('style');s.id='brk-w-css';
    s.textContent=`
      #brk-widget-wrap .brk-btn{width:100%;border:none;border-radius:0;padding:8px 16px;font:500 13px -apple-system,system-ui,sans-serif;cursor:pointer;display:flex;align-items:center;gap:10px;background:transparent;color:#374151;margin:0;text-align:left;transition:background .15s,color .15s}
      #brk-widget-wrap .brk-btn:hover{background:rgba(0,0,0,.05);color:#111827}
      .dark #brk-widget-wrap .brk-btn{color:rgba(255,255,255,.82)}
      .dark #brk-widget-wrap .brk-btn:hover{background:rgba(255,255,255,.07);color:#fff}
      #brk-widget-wrap .brk-ic{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
      @keyframes brk-spin{to{transform:rotate(360deg)}}
      .brk-wdg-overlay{position:fixed;inset:0;z-index:999998;background:rgba(0,0,0,.15)}
      .brk-wdg-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999999;font-family:-apple-system,system-ui,sans-serif}
    `;
    document.head.appendChild(s);
  }

  // ── Contexto ──
  function getConversationId(){return(location.href.match(/\/conversations\/(\d+)/)||[])[1]||null}
  function getContactId(){const l=document.querySelector('a[href*="/contacts/"]');return l?(l.href.match(/\/contacts\/(\d+)/)||[])[1]||null:null}
  function getContactName(){const el=document.querySelector('.contact--name,[class*="contact-name"]');if(el)return el.textContent.trim();const l=document.querySelector('a[href*="/contacts/"]');if(l){const t=l.textContent.trim();if(t.length>1)return t}return null}
  function brkContext(){return{conversation:getConversationId(),contact:getContactId(),contact_name:getContactName(),page_url:location.href,timestamp:new Date().toISOString()}}

  // ── Modal simples ──
  function createModal(id,title){
    document.getElementById(id)?.remove();document.getElementById(id+'-ov')?.remove();
    const t=T();
    const ov=document.createElement('div');ov.id=id+'-ov';ov.className='brk-wdg-overlay';
    const root=document.createElement('div');root.id=id;root.className='brk-wdg-modal';
    Object.assign(root.style,{width:'380px',maxWidth:'95vw',background:t.bg,borderRadius:'12px',boxShadow:t.d?'0 20px 60px rgba(0,0,0,.6)':'0 20px 60px rgba(0,0,0,.15)',overflow:'hidden'});
    const hdr=document.createElement('div');
    Object.assign(hdr.style,{padding:'14px 20px',borderBottom:`1px solid ${t.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:t.bg2});
    hdr.innerHTML=`<span style="font-weight:600;font-size:15px;color:${t.text}">${title}</span>`;
    const x=document.createElement('button');x.innerHTML='✕';Object.assign(x.style,{border:'none',background:'transparent',cursor:'pointer',color:t.sub,fontSize:'18px'});
    const close=()=>{root.remove();ov.remove()};
    x.onclick=close;ov.onclick=close;hdr.appendChild(x);
    const body=document.createElement('div');Object.assign(body.style,{padding:'20px',color:t.text});
    root.append(hdr,body);
    const orig=root.remove.bind(root);root.remove=()=>{orig();ov.remove()};
    document.body.append(ov,root);
    return{root,body};
  }

  function loadingHTML(msg){const t=T();return`<div style="text-align:center;padding:36px 20px"><div style="width:36px;height:36px;border:3px solid ${t.d?'rgba(31,147,255,.15)':'rgba(31,147,255,.2)'};border-left-color:#1f93ff;border-radius:50%;animation:brk-spin .8s linear infinite;margin:0 auto 18px"></div><div style="font-size:13px;color:${t.sub};font-weight:500">${msg}</div></div>`}
  function successHTML(msg){const t=T();return`<div style="text-align:center;padding:36px 20px"><div style="width:44px;height:44px;border-radius:50%;background:rgba(68,206,75,.1);display:flex;align-items:center;justify-content:center;margin:0 auto 14px"><svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M6 11.5L9.5 15L16 7" stroke="#44ce4b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div style="font-size:14px;font-weight:600;color:${t.text}">${msg}</div></div>`}

  // ── Carregar botões da API ──
  async function fetchButtons(){
    try{
      const r=await fetch(API_BASE+'/api/buttons/active');
      const j=await r.json();
      cachedButtons=j.data||[];
    }catch(e){console.error('[BRK Widget] Fetch error',e);cachedButtons=[]}
  }

  // ── Executar ação ──
  async function executeAction(btn){
    if(btn.action_type==='link'){
      if(btn.new_tab!==false)window.open(btn.action_url,'_blank');
      else location.href=btn.action_url;
    }else if(btn.action_type==='webhook'){
      const{root,body}=createModal('brk-fb-'+btn.id,btn.label||'Enviando...');
      body.innerHTML=loadingHTML('Enviando dados…');
      try{
        const method=btn.http_method==='GET'?'GET':'POST';
        const opts={method,headers:{'Content-Type':'application/json'}};
        if(method==='POST')opts.body=JSON.stringify({button:{id:btn.id,label:btn.label},context:brkContext()});
        const r=await fetch(btn.action_url,opts);
        if(r.ok){body.innerHTML=successHTML('Enviado com sucesso!');setTimeout(()=>root.remove(),1400)}
        else{body.innerHTML=`<div style="text-align:center;padding:24px;color:#ef4444;font-weight:600">Erro: ${r.status}</div>`;setTimeout(()=>root.remove(),2000)}
      }catch{body.innerHTML=`<div style="text-align:center;padding:24px;color:#ef4444;font-weight:600">Erro de conexão</div>`;setTimeout(()=>root.remove(),2000)}
    }else if(btn.action_type==='modal'){
      const{root,body}=createModal('brk-m-'+btn.id,btn.label||'Modal');
      body.innerHTML=btn.modal_html||'<p>Sem conteúdo.</p>';
    }
  }

  // ── Localização no sidebar ──
  function findBlocoAcoes() {
    // 1. Tenta encontrar usando a classe nativa do Chatwoot (mais seguro contra idiomas/traduções)
    const nativo = document.querySelector('.conversation--actions');
    if (nativo) return nativo;

    // 2. Fallback por texto (Ações da conversa / Conversation actions)
    const textos = document.querySelectorAll('span,div,p,h3,h4,strong');
    for (let i = 0; i < textos.length; i++) {
        const t = (textos[i].textContent||'').trim().toLowerCase();
        if ((t === 'ações da conversa' || t === 'conversation actions')) {
            let parent = textos[i].parentElement;
            for (let j = 0; j < 6; j++) {
                if (parent && (parent.classList.contains('border-b') || parent.tagName === 'SECTION' || parent.classList.contains('mb-4') || parent.style.borderRadius || parent.classList.contains('conversation--actions'))) {
                    return parent;
                }
                parent = parent ? parent.parentElement : null;
            }
            if (textos[i].parentElement && textos[i].parentElement.parentElement) {
                return textos[i].parentElement.parentElement.parentElement;
            }
        }
    }
    return null;
  }

  // ── Renderizar botões NOVOS (abaixo dos hardcoded) ──
  function renderButtons(){
    injectCSS();

    if(!cachedButtons.length) {
      document.getElementById('brk-widget-wrap')?.remove();
      return false;
    }
    const visible=cachedButtons.filter(b=>!b.visible_to||!b.visible_to.length||b.visible_to.length===0);
    if(!visible.length) {
      document.getElementById('brk-widget-wrap')?.remove();
      return false;
    }

    if(window.__BRK_SCRIPT3_V4__){
      const existingPanel=document.getElementById('brk-tools-right');
      if(existingPanel){
        let wrap = document.getElementById('brk-widget-wrap');
        if (wrap && wrap.previousElementSibling === existingPanel) return true; // Já está no lugar certo
        wrap?.remove();
        
        wrap=document.createElement('div');
        wrap.id='brk-widget-wrap';
        wrap.style.cssText='border-top:1px solid rgba(255,255,255,.06);margin-top:2px;padding-top:2px;';
        visible.forEach(btn=>{
          const el=document.createElement('button');el.type='button';el.className='brk-btn';
          el.innerHTML=`<span class="brk-ic">${btn.icon||'🔘'}</span><span>${btn.label||'Botão'}</span>`;
          if(btn.description)el.title=btn.description;
          el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();executeAction(btn)});
          wrap.appendChild(el);
        });
        existingPanel.after(wrap);
        return true;
      }
      return false; // Espera o componente base ser carregado
    }

    const blocoAcoes = findBlocoAcoes();
    if(!blocoAcoes || !blocoAcoes.parentElement) {
      document.getElementById('brk-widget-wrap')?.remove();
      return false;
    }

    // Vue.js as vezes recicla o DOM, movendo nosso widget por acidente.
    // Isso garante que ele sempre esteja exatamente ANTES de "Ações da conversa".
    let existingAccordion = document.getElementById('brk-widget-wrap');
    if (existingAccordion) {
        if (existingAccordion.nextElementSibling === blocoAcoes) {
            return true; // Já está renderizado e no lugar correto!
        } else {
            existingAccordion.remove(); // Está no lugar errado, force recriação
        }
    }

    const accordion = document.createElement('div');
    accordion.id = 'brk-widget-wrap';
    accordion.style.cssText = 'margin-bottom: 8px; border-radius: 8px; border: 1px solid #eaeaea; background: #f9f9fb; overflow: hidden;';
    
    if (isDark()) {
        accordion.style.border = '1px solid rgba(255, 255, 255, 0.08)';
        accordion.style.background = 'rgb(24, 25, 27)';
    }

    accordion.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; cursor: pointer; user-select: none;" id="brk-w-toggle">
            <h4 style="font-weight: 500; font-size: 14px; color: ${isDark() ? '#f1f5f9' : '#1f2d3d'}; margin: 0; font-family: inherit;">Botões de Ação 2</h4>
            <div style="display: flex; align-items: center; justify-content: center; color: #1f93ff;" id="brk-w-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>
            </div>
        </div>
        <div style="padding: 0 14px 12px 14px;" id="brk-w-content"></div>
    `;

    const content = accordion.querySelector('#brk-w-content');
    visible.forEach(btn=>{
      const el=document.createElement('button');el.type='button';el.className='brk-btn';
      el.innerHTML=`<span class="brk-ic">${btn.icon||'🔘'}</span><span>${btn.label||'Botão'}</span>`;
      if(btn.description)el.title=btn.description;
      el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();executeAction(btn)});
      content.appendChild(el);
    });

    blocoAcoes.parentElement.insertBefore(accordion, blocoAcoes);

    accordion.querySelector('#brk-w-toggle').addEventListener('click', () => {
        const ic = accordion.querySelector('#brk-w-icon');
        if (content.style.display === 'none') {
            content.style.display = 'block';
            ic.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>`;
        } else {
            content.style.display = 'none';
            ic.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`;
        }
    });

    return true;
  }



  // ── Init ──
  async function init(){
    await fetchButtons();

    // Espera um pouco para o script antigo carregar primeiro
    setTimeout(()=>{
      let tries=0;
      (function try_(){tries++;if(!renderButtons()&&tries<50)setTimeout(try_,500)})();
    }, 2000);

    new MutationObserver(()=>{
      if(!document.getElementById('brk-widget-wrap')&&cachedButtons.length)renderButtons();
    }).observe(document.body,{childList:true,subtree:true});

    let last=location.href;
    setInterval(()=>{if(location.href!==last){last=location.href;fetchButtons().then(()=>setTimeout(renderButtons,1500))}},800);

    // Recarrega botões da API a cada 2 min
    setInterval(()=>fetchButtons().then(renderButtons),120000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else setTimeout(init,300);
})();
