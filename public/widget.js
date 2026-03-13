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
  function findAnchor(){
    for(const el of document.querySelectorAll('span,div,p,h3,h4,strong')){
      const t=(el.textContent||'').trim().toLowerCase();
      if(t==='ações da conversa'||t==='conversation actions')return el;
    }return null;
  }
  function findAgentField(){
    for(const el of document.querySelectorAll('span,div,p,label,h6')){
      const t=(el.textContent||'').trim().toLowerCase();
      if(t==='agente atribuído'||t==='assigned agent'||t==='agente atribuido')return el;
    }return null;
  }
  function findSectionContent(anchor){
    if(!anchor)return null;
    const agentEl=findAgentField();if(!agentEl)return null;
    let node=agentEl;
    for(let d=0;d<15;d++){node=node.parentElement;if(!node||node===document.body)break;const p=node.parentElement;if(!p)continue;if(p.contains(anchor)&&!node.contains(anchor))return{content:node}}
    let h=anchor;for(let i=0;i<8;i++){const s=h.nextElementSibling;if(s&&s.querySelector&&!s.textContent.includes('Macros'))return{content:s};h=h.parentElement;if(!h)break}
    return null;
  }

  // ── Renderizar botões NOVOS (abaixo dos hardcoded) ──
  function renderButtons(){
    injectCSS();

    // Remove widget antigo se existir
    document.getElementById('brk-widget-wrap')?.remove();

    if(!cachedButtons.length)return false;

    // Filtra visibilidade (vazio = todos)
    const visible=cachedButtons.filter(b=>!b.visible_to||!b.visible_to.length||b.visible_to.length===0);
    if(!visible.length)return false;

    // Espera o script antigo injetar primeiro (brk-tools-right)
    const existingPanel=document.getElementById('brk-tools-right');

    if(existingPanel){
      // O script antigo já injetou — adiciona os botões NOVOS abaixo do painel existente
      const wrap=document.createElement('div');
      wrap.id='brk-widget-wrap';
      wrap.style.cssText='border-top:1px solid rgba(255,255,255,.06);margin-top:2px;padding-top:2px;';

      visible.forEach(btn=>{
        const el=document.createElement('button');el.type='button';el.className='brk-btn';
        el.innerHTML=`<span class="brk-ic">${btn.icon||'🔘'}</span><span>${btn.label||'Botão'}</span>`;
        if(btn.description)el.title=btn.description;
        el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();executeAction(btn)});
        wrap.appendChild(el);
      });

      // Insere depois do painel existente
      existingPanel.after(wrap);
      return true;
    }

    // Se o script antigo NÃO existe, cria o painel do zero
    const anchor=findAnchor();if(!anchor)return false;
    const found=findSectionContent(anchor);if(!found)return false;

    const panel=document.createElement('div');panel.id='brk-widget-wrap';

    visible.forEach(btn=>{
      const el=document.createElement('button');el.type='button';el.className='brk-btn';
      el.innerHTML=`<span class="brk-ic">${btn.icon||'🔘'}</span><span>${btn.label||'Botão'}</span>`;
      if(btn.description)el.title=btn.description;
      el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();executeAction(btn)});
      panel.appendChild(el);
    });

    found.content.insertBefore(panel,found.content.firstChild);
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
