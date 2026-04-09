(function(){
  'use strict';
  if(window.__BRK_WIDGET__)return;
  window.__BRK_WIDGET__=true;

  const API_BASE=window.__BRK_API_BASE||'https://n8n-brk-buttons.pqcilq.easypanel.host';
  let cachedButtons=[];

  // ══════════════════════════════════════════════════════════════
  // TEMA + HELPERS
  // ══════════════════════════════════════════════════════════════
  function isDark(){return document.documentElement.classList.contains('dark')||document.body.classList.contains('dark')}
  function T(){const d=isDark();return{d,bg:d?'#151b26':'#fff',bg2:d?'#1a2233':'#f8fafc',surface2:d?'#252e3d':'#f1f5f9',border:d?'#2d3a4d':'#e2e8f0',text:d?'#e8eaf6':'#1e293b',sub:d?'#8b95a5':'#64748b',accent:'#1f93ff',success:'#44ce4b',inputBg:d?'#131a27':'#fff',headerBg:d?'#0f1623':'#1e293b'}}

  const onlyDigits=s=>(s||'').toString().replace(/\D+/g,'');
  const isEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v||'').trim());
  const formatBRL=val=>((Number(onlyDigits(val))||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const parseBRL=val=>{const n=Number((val||'').replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.'));return isFinite(n)?n:0};
  const attachBRL=el=>{el.addEventListener('input',()=>{el.value=formatBRL(onlyDigits(el.value))});el.value=formatBRL('0')};

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

  // ══════════════════════════════════════════════════════════════
  // CONTEXTO CHATWOOT
  // ══════════════════════════════════════════════════════════════
  function getConversationId(){return(location.href.match(/\/conversations\/(\d+)/)||[])[1]||null}
  function getContactId(){const l=document.querySelector('a[href*="/contacts/"]');return l?(l.href.match(/\/contacts\/(\d+)/)||[])[1]||null:null}
  function getContactName(){const el=document.querySelector('.contact--name,[class*="contact-name"]');if(el)return el.textContent.trim();const l=document.querySelector('a[href*="/contacts/"]');if(l){const t=l.textContent.trim();if(t.length>1)return t}return null}
  function brkContext(){return{conversation:getConversationId(),contact:getContactId(),contact_name:getContactName(),page_url:location.href,timestamp:new Date().toISOString()}}

  // ══════════════════════════════════════════════════════════════
  // MODAL AVANÇADO (com drag, close, resize)
  // ══════════════════════════════════════════════════════════════
  function createModal(id,title,opts){
    document.getElementById(id)?.remove();document.getElementById(id+'-ov')?.remove();
    const t=T();
    const ov=document.createElement('div');ov.id=id+'-ov';ov.className='brk-wdg-overlay';
    const root=document.createElement('div');root.id=id;root.className='brk-wdg-modal';
    const width=(opts&&opts.width)||'380px';
    const card=document.createElement('div');
    Object.assign(card.style,{width,maxWidth:'95vw',background:t.bg,borderRadius:'12px',boxShadow:t.d?'0 20px 60px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.06)':'0 20px 60px rgba(0,0,0,.15),0 0 0 1px rgba(0,0,0,.05)',overflow:'hidden'});
    const hdr=document.createElement('div');
    Object.assign(hdr.style,{background:t.d?'#1a2233':'#f8fafc',padding:'14px 44px 14px 20px',fontWeight:'600',fontSize:'15px',color:t.text,cursor:'move',userSelect:'none',position:'relative',borderBottom:`1px solid ${t.border}`,letterSpacing:'-0.01em'});
    hdr.textContent=title;
    const x=document.createElement('button');
    x.innerHTML=`<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    Object.assign(x.style,{position:'absolute',top:'50%',right:'12px',transform:'translateY(-50%)',width:'32px',height:'32px',border:'none',borderRadius:'8px',background:'transparent',color:t.sub,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all .15s'});
    x.onmouseenter=()=>{x.style.background=t.d?'rgba(255,255,255,.08)':'rgba(0,0,0,.05)';x.style.color=t.text};
    x.onmouseleave=()=>{x.style.background='transparent';x.style.color=t.sub};
    const close=()=>{root.remove();ov.remove()};
    x.onclick=close;ov.onclick=close;hdr.appendChild(x);
    const body=document.createElement('div');Object.assign(body.style,{padding:'20px',color:t.text});
    card.append(hdr,body);root.appendChild(card);
    const orig=root.remove.bind(root);root.remove=()=>{orig();ov.remove()};
    document.body.append(ov,root);
    // Drag
    let ox=0,oy=0,drag=false;
    hdr.addEventListener('mousedown',ev=>{if(ev.target===x||x.contains(ev.target))return;drag=true;const r=root.getBoundingClientRect();ox=ev.clientX-r.left;oy=ev.clientY-r.top;root.style.transform='none';root.style.left=r.left+'px';root.style.top=r.top+'px';document.body.style.userSelect='none'});
    window.addEventListener('mousemove',ev=>{if(!drag)return;root.style.left=(ev.clientX-ox)+'px';root.style.top=(ev.clientY-oy)+'px'});
    window.addEventListener('mouseup',()=>{drag=false;document.body.style.userSelect=''});
    return{root,body,close};
  }

  function loadingHTML(msg){const t=T();return`<div style="text-align:center;padding:36px 20px"><div style="width:36px;height:36px;border:3px solid ${t.d?'rgba(31,147,255,.15)':'rgba(31,147,255,.2)'};border-left-color:#1f93ff;border-radius:50%;animation:brk-spin .8s linear infinite;margin:0 auto 18px"></div><div style="font-size:13px;color:${t.sub};font-weight:500">${msg}</div></div>`}
  function successHTML(msg){const t=T();return`<div style="text-align:center;padding:36px 20px"><div style="width:44px;height:44px;border-radius:50%;background:rgba(68,206,75,.1);display:flex;align-items:center;justify-content:center;margin:0 auto 14px"><svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M6 11.5L9.5 15L16 7" stroke="#44ce4b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div style="font-size:14px;font-weight:600;color:${t.text}">${msg}</div></div>`}

  async function postJSON(url,payload){return fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})}

  // ── UI Helpers ──
  function uiStyles(){
    const t=T();
    return{
      t,
      inputStyle:`width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid ${t.border};border-radius:8px;outline:none;background:${t.inputBg};color:${t.text};font-size:13px;transition:border-color .2s,box-shadow .2s;`,
      labelStyle:`display:block;font-size:12px;font-weight:600;color:${t.sub};margin:12px 0 4px;letter-spacing:.02em;text-transform:uppercase;`,
      hintStyle:`display:block;font-size:11px;color:${t.sub};margin:4px 0 0;`,
      btnPrimary:`box-sizing:border-box;padding:10px 20px;border:none;border-radius:8px;font:600 13px -apple-system,system-ui,sans-serif;cursor:pointer;background:${t.accent};color:#fff;transition:all .15s;`,
      btnSecondary:`box-sizing:border-box;padding:10px 20px;border:1px solid ${t.border};border-radius:8px;font:600 13px -apple-system,system-ui,sans-serif;cursor:pointer;background:${t.d?'rgba(255,255,255,.04)':'#fff'};color:${t.text};transition:all .15s;`,
      btnSuccess:`box-sizing:border-box;padding:10px 20px;border:none;border-radius:8px;font:600 13px -apple-system,system-ui,sans-serif;cursor:pointer;background:${t.success};color:#fff;transition:all .15s;`,
    };
  }
  function mkInput(id,label,ui){return`<label for="${id}" style="${ui.labelStyle}">${label}</label><input id="${id}" placeholder="${label}" style="${ui.inputStyle}" />`}
  function mkSelect(id,label,opts,ui){return`<label for="${id}" style="${ui.labelStyle}">${label}</label><select id="${id}" style="${ui.inputStyle}"><option value="">Selecione...</option>${opts.map(o=>`<option value="${o.v}">${o.l}</option>`).join('')}</select>`}
  function mkDate(id,label,ui){return`<label for="${id}" style="${ui.labelStyle}">${label}</label><input id="${id}" type="date" style="${ui.inputStyle}" />`}
  function mkRow(...btns){return`<div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">${btns.join('')}</div>`}
  function focusStyle(el,border){el.addEventListener('focus',()=>{el.style.borderColor='#1f93ff';el.style.boxShadow='0 0 0 3px rgba(31,147,255,.15)'});el.addEventListener('blur',()=>{el.style.borderColor=border;el.style.boxShadow='none'})}
  function applyFocus(body,{t}){body.querySelectorAll('input,select').forEach(el=>focusStyle(el,t.border))}

  // ── Countdown ──
  function countdown(body,seconds,msg,onDone){
    const t=T();
    body.innerHTML=`<div style="text-align:center;padding:28px 20px;"><div style="font-weight:600;font-size:14px;color:${t.text};margin-bottom:20px;">${msg}</div><div style="position:relative;width:90px;height:90px;margin:0 auto;"><svg viewBox="0 0 80 80" style="width:90px;height:90px;transform:rotate(-90deg);"><circle cx="40" cy="40" r="34" stroke="${t.d?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)'}" stroke-width="5" fill="none"/><circle id="brk-arc" cx="40" cy="40" r="34" stroke="${t.accent}" stroke-width="5" fill="none" stroke-linecap="round"/></svg><div id="brk-cd" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:${t.text};"></div></div><div style="margin-top:14px;font-size:12px;color:${t.sub};">Redirecionando em breve…</div></div>`;
    const arc=body.querySelector('#brk-arc'),lbl=body.querySelector('#brk-cd');
    const C=2*Math.PI*34;arc.setAttribute('stroke-dasharray',C);
    const total=seconds*1000,start=performance.now();
    (function tick(now){const el=Math.min(now-start,total),rem=Math.ceil((total-el)/1000),p=el/total;lbl.textContent=rem;arc.setAttribute('stroke-dashoffset',String(p*C));if(el<total)requestAnimationFrame(tick);else onDone?.()})(start);
  }

  // ══════════════════════════════════════════════════════════════
  // BRK_API — API pública para scripts colados no painel
  // ══════════════════════════════════════════════════════════════
  window.BRK_API={
    context:brkContext,
    theme:T,
    isDark,
    createModal,
    loading:loadingHTML,
    success:successHTML,
    postJSON,
    onlyDigits,
    isEmail,
    formatBRL,
    parseBRL,
    attachBRL,
    uiStyles,
    mkInput,
    mkSelect,
    mkDate,
    mkRow,
    focusStyle,
    applyFocus,
    countdown,
  };

  // ══════════════════════════════════════════════════════════════
  // EXECUTE SCRIPTS INSIDE MODAL HTML
  // ══════════════════════════════════════════════════════════════
  function evalScripts(container){
    const scripts=container.querySelectorAll('script');
    scripts.forEach(old=>{
      const ns=document.createElement('script');
      if(old.src){ns.src=old.src}else{ns.textContent=old.textContent}
      old.parentNode.replaceChild(ns,old);
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CARREGAR BOTÕES DA API
  // ══════════════════════════════════════════════════════════════
  async function fetchButtons(){
    try{
      const r=await fetch(API_BASE+'/api/buttons/active');
      const j=await r.json();
      cachedButtons=j.data||[];
    }catch(e){console.error('[BRK Widget] Fetch error',e);cachedButtons=[]}
  }

  // ══════════════════════════════════════════════════════════════
  // EXECUTAR AÇÃO DO BOTÃO
  // ══════════════════════════════════════════════════════════════
  async function executeAction(btn){
    // Analytics (Fire and forget)
    fetch(API_BASE+'/api/analytics/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ button_id: btn.id, user_email: window.__brkCurrentUserEmail || '' })
    }).catch(e => console.error('[BRK Analytics Error]', e));

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
      // Executa scripts embutidos no modal_html
      evalScripts(body);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // LOCALIZAÇÃO NO SIDEBAR
  // ══════════════════════════════════════════════════════════════
  function findBlocoAcoes() {
    const nativo = document.querySelector('.conversation--actions');
    if (nativo) return nativo;
    
    // Procura por textos de seções comuns no sidebar
    const textos = document.querySelectorAll('span,div,p,h3,h4,strong,button,legend');
    for (let i = 0; i < textos.length; i++) {
        if (textos[i].children.length > 1) continue; // Ignora wrappers com muitos filhos
        
        const t = (textos[i].textContent || '').trim().toLowerCase();
        if (t === 'ações da conversa' || t === 'conversation actions' || t === 'agente atribuído' || t === 'assigned agent') {
            let parent = textos[i].parentElement;
            // Tenta subir no DOM até achar a raiz do componente (Accordion ou Section)
            for (let j = 0; j < 8; j++) {
                if (!parent) break;
                
                if (parent.tagName === 'SECTION' || 
                    parent.classList.contains('border-b') || 
                    parent.classList.contains('mb-4') || 
                    parent.classList.contains('conversation--actions') ||
                    (parent.parentElement && parent.parentElement.classList.contains('flex-col'))) {
                    return parent;
                }
                parent = parent.parentElement;
            }
            // Fallback se não encontrou um pai estrutural óbvio
            if (textos[i].parentElement && textos[i].parentElement.parentElement) {
                return textos[i].parentElement.parentElement;
            }
        }
    }
    
    // Fallback absoluto: tenta achar o wrapper principal do sidebar
    const rightSidebar = document.querySelector('.conversation-settings, [data-testid="conversation-sidebar"], .conversation-sidebar-wrap');
    if (rightSidebar && rightSidebar.firstElementChild) {
       // pula o primeiro card (perfil) e insere depois
       return rightSidebar.children.length > 1 ? rightSidebar.children[1] : rightSidebar.firstElementChild;
    }
    
    return null;
  }

  // ══════════════════════════════════════════════════════════════
  // RENDERIZAR BOTÕES
  // ══════════════════════════════════════════════════════════════
  function renderButtons(){
    injectCSS();

    if(!cachedButtons.length) {
      document.getElementById('brk-widget-wrap')?.remove();
      return false;
    }
    
    // Filtra botões visíveis para o usuário atual
    const visible = cachedButtons.filter(b => {
      if (!b.visible_to || b.visible_to.length === 0) return true; // Todos
      
      // Checa se o email do usuário logado está na lista
      const emailMatch = window.__brkCurrentUserEmail && b.visible_to.includes(window.__brkCurrentUserEmail);
      if (emailMatch) return true;
      
      // Checa times/grupos, caso o array de times do usuário tenha sido populado no Chatwoot (window.__brkCurrentUserTeams)
      const userTeams = window.__brkCurrentUserTeams || [];
      const teamMatch = b.visible_to.some(val => {
        if (val.startsWith('team:')) {
           const teamName = val.substring(5).toLowerCase();
           return userTeams.some(ut => ut.toLowerCase() === teamName);
        }
        return false;
      });
      
      return teamMatch;
    });

    if(!visible.length) {
      document.getElementById('brk-widget-wrap')?.remove();
      return false;
    }

    if(window.__BRK_SCRIPT3_V4__){
      const existingPanel=document.getElementById('brk-tools-right');
      if(existingPanel){
        let wrap = document.getElementById('brk-widget-wrap');
        if (wrap && wrap.previousElementSibling === existingPanel) return true;
        wrap?.remove();
        
        wrap=document.createElement('div');
        wrap.id='brk-widget-wrap';
        wrap.style.cssText='border-top:1px solid rgba(255,255,255,.06);margin-top:2px;padding-top:2px;';
        const grouped = {};
        const noGroup = [];
        visible.forEach(btn => {
          const g = (btn.group_name || '').trim();
          if (!g) noGroup.push(btn);
          else { if (!grouped[g]) grouped[g] = []; grouped[g].push(btn); }
        });

        const createBtnEl = (btn) => {
          const el=document.createElement('button');el.type='button';el.className='brk-btn';
          el.innerHTML=`<span class="brk-ic">${btn.icon||'🔘'}</span><span>${btn.label||'Botão'}</span>`;
          if(btn.description)el.title=btn.description;
          el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();executeAction(btn)});
          return el;
        };

        const renderGrp = (title, btns) => {
          if (!btns.length) return;
          if (title) {
            const h = document.createElement('div');
            h.style.cssText = `font-size:11px;font-weight:700;padding:12px 4px 4px 4px;color:${isDark()?'#8b95a5':'#64748b'};text-transform:uppercase;letter-spacing:0.04em;`;
            h.textContent = title;
            wrap.appendChild(h);
          }
          btns.forEach(btn => wrap.appendChild(createBtnEl(btn)));
        };

        renderGrp(null, noGroup);
        Object.keys(grouped).forEach(g => renderGrp(g, grouped[g]));
        existingPanel.after(wrap);
        return true;
      }
      return false;
    }

    const blocoAcoes = findBlocoAcoes();

    let existingAccordion = document.getElementById('brk-widget-wrap');
    if (existingAccordion) {
        if (blocoAcoes && existingAccordion.nextElementSibling === blocoAcoes) {
            return true; // Já está no lugar certo
        } else {
            existingAccordion.remove();
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
            <h4 style="font-weight: 500; font-size: 14px; color: ${isDark() ? '#f1f5f9' : '#1f2d3d'}; margin: 0; font-family: inherit;">Botões de Ação</h4>
            <div style="display: flex; align-items: center; justify-content: center; color: #1f93ff;" id="brk-w-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>
            </div>
        </div>
        <div style="padding: 0 14px 12px 14px;" id="brk-w-content"></div>
    `;

    const content = accordion.querySelector('#brk-w-content');
    
    const grouped = {};
    const noGroup = [];
    visible.forEach(btn => {
      const g = (btn.group_name || '').trim();
      if (!g) noGroup.push(btn);
      else { if (!grouped[g]) grouped[g] = []; grouped[g].push(btn); }
    });

    const createBtnEl = (btn) => {
      const el=document.createElement('button');el.type='button';el.className='brk-btn';
      el.innerHTML=`<span class="brk-ic">${btn.icon||'🔘'}</span><span>${btn.label||'Botão'}</span>`;
      if(btn.description)el.title=btn.description;
      el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();executeAction(btn)});
      return el;
    };

    const renderGrp = (title, btns) => {
      if (!btns.length) return;
      if (title) {
        const h = document.createElement('div');
        h.style.cssText = `font-size:11px;font-weight:700;padding:12px 0 4px 4px;color:${isDark()?'#8b95a5':'#64748b'};text-transform:uppercase;letter-spacing:0.04em;`;
        h.textContent = title;
        content.appendChild(h);
      }
      btns.forEach(btn => content.appendChild(createBtnEl(btn)));
    };

    renderGrp(null, noGroup);
    Object.keys(grouped).forEach(g => renderGrp(g, grouped[g]));

    // Attach strategy (Garante que vai aparecer em algum lugar)
    if (blocoAcoes && blocoAcoes.parentElement) {
        blocoAcoes.parentElement.insertBefore(accordion, blocoAcoes);
    } else {
        const rs = document.querySelector('.conversation-settings, [data-testid="conversation-sidebar"], .conversation-sidebar-wrap');
        if (rs) {
           rs.appendChild(accordion);
        } else {
           accordion.style.position = 'fixed';
           accordion.style.bottom = '20px';
           accordion.style.right = '20px';
           accordion.style.zIndex = '999999';
           accordion.style.width = '300px';
           document.body.appendChild(accordion);
           console.warn('[BRK Widget] Ancorado como Flutuante porque o Sidebar não foi localizado.');
        }
    }

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

  // ══════════════════════════════════════════════════════════════
  // CURRENT USER DATA
  // ══════════════════════════════════════════════════════════════
  function getAuthToken() {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith('cw_d_session_info=')) {
            try { return JSON.parse(decodeURIComponent(cookie.substring('cw_d_session_info='.length))); } catch (e) {}
        }
    }
    return null;
  }

  async function fetchCurrentUserEmail() {
    if (window.__brkCurrentUserEmail) return window.__brkCurrentUserEmail;
    const auth = getAuthToken();
    if (!auth || !auth['access-token']) {
      // Tenta pegar da store do Vue, caso o cookie não exista e seja localStorage
      const ls = localStorage.getItem('auth');
      if (ls) {
        try {
          const email = JSON.parse(ls).currentUser?.email;
          if (email) return email.toLowerCase();
        } catch(e){}
      }
      return null;
    }
    try {
        const res = await fetch('/api/v1/profile', { headers: { 'access-token': auth['access-token'], 'client': auth['client'], 'uid': auth['uid'] } });
        if (!res.ok) return null;
        const data = await res.json();
        return data.email ? data.email.toLowerCase() : null;
    } catch (err) { return null; }
  }

  async function fetchCurrentUserTeams() {
    if (window.__brkCurrentUserTeams) return window.__brkCurrentUserTeams;
    const auth = getAuthToken();
    if (!auth || !auth['access-token']) return [];
    try {
        const match = location.pathname.match(/\/accounts\/(\d+)/);
        const accountId = match ? match[1] : 1;
        const res = await fetch('/api/v1/accounts/' + accountId + '/teams', {
            headers: { 'access-token': auth['access-token'], 'client': auth['client'], 'uid': auth['uid'] }
        });
        if (!res.ok) return [];
        const data = await res.json();
        if (Array.isArray(data)) {
            return data.filter(t => t.is_member).map(t => t.name);
        }
        return [];
    } catch (err) { return []; }
  }

  // ══════════════════════════════════════════════════════════════
  // INIT
  // ══════════════════════════════════════════════════════════════
  async function init(){
    window.__brkCurrentUserEmail = await fetchCurrentUserEmail();
    window.__brkCurrentUserTeams = await fetchCurrentUserTeams();
    await fetchButtons();

    setTimeout(()=>{
      let tries=0;
      (function try_(){tries++;if(!renderButtons()&&tries<50)setTimeout(try_,500)})();
    }, 2000);

    new MutationObserver(()=>{
      if(!document.getElementById('brk-widget-wrap')&&cachedButtons.length)renderButtons();
    }).observe(document.body,{childList:true,subtree:true});

    let last=location.href;
    setInterval(()=>{if(location.href!==last){last=location.href;fetchButtons().then(()=>setTimeout(renderButtons,1500))}},800);

    setInterval(()=>fetchButtons().then(renderButtons),120000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else setTimeout(init,300);
})();
