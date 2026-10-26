import {candidates} from './pinyin.mjs';
export function keyboard(root, signal) {
  let target=null, chinese=false, shift=false, composing='', page=0;
  const bar=root.querySelector('.fb-candidates'), keys=root.querySelector('.fb-keys');
  const rows=[
    ['Escape','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'],
    ['`','1','2','3','4','5','6','7','8','9','0','-','=','Backspace'],
    ['Tab','q','w','e','r','t','y','u','i','o','p','[',']','\\'],
    ['CapsLock','a','s','d','f','g','h','j','k','l',';','"','Enter'],
    ['Shift','z','x','c','v','b','n','m',',','.','/','ShiftRight'],
    ['中 / EN','Control','Alt','Meta','Space','MetaRight','AltRight','ArrowLeft','ArrowDown','ArrowUp','ArrowRight']
  ];
  const labels={Escape:'esc',Backspace:'⌫',Enter:'return',Shift:'shift',Space:'space',ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',CapsLock:'caps lock',ShiftRight:'shift',Control:'control',Alt:'option',AltRight:'option',Meta:'command',MetaRight:'command'};
  for(const row of rows) {
    const line=document.createElement('div'); line.className='fb-keyrow';
    for(const key of row) { const b=document.createElement('button'); b.type='button'; b.dataset.key=key; b.textContent=labels[key]||key; if(key==='Space') b.className='fb-space'; b.setAttribute('aria-label',labels[key]||key); line.append(b); }
    keys.append(line);
  }
  const editable=el=>el?.matches('textarea,input:not([type]),input[type=text],input[type=search],input[type=url],input[type=tel],input[type=password]')&&!el.disabled&&!el.readOnly;
  document.addEventListener('focusin', e=>{if(editable(e.target)){target=e.target; composing=''; render();}}, {signal});
  function edit(text, type='insertText') {
    if(!target?.isConnected) return;
    const a=target.selectionStart??target.value.length, b=target.selectionEnd??a;
    if(!target.dispatchEvent(new InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:type,data:text}))) return;
    target.setRangeText(text,a,b,'end');
    target.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:type,data:text}));
  }
  function render() {
    bar.dataset.composing=String(Boolean(composing));
    bar.replaceChildren();
    const status=document.createElement('span'); status.textContent=composing|| (chinese?'拼音 · 点击输入框开始':'EN · 点击输入框开始'); bar.append(status);
    const list=candidates(composing);
    list.slice(page*5,page*5+5).forEach((word,i)=>{const b=document.createElement('button'); b.textContent=`${i+1} ${word}`; b.addEventListener('click',()=>commit(word));bar.append(b);});
    if(list.length>5) for(const [label,delta] of [['‹',-1],['›',1]]) {const b=document.createElement('button');b.textContent=label;b.onclick=()=>{page=(page+delta+Math.ceil(list.length/5))%Math.ceil(list.length/5);render();};bar.append(b);}
    if(composing&&!list.length) {const hint=document.createElement('span');hint.textContent='回车输入拼音';bar.append(hint);}
    root.querySelector('[data-key="中 / EN"]').textContent=chinese?'中 · 拼音':'EN / 中';
    root.querySelector('[data-key="Shift"]').setAttribute('aria-pressed',String(shift));
  }
  function commit(word) {edit(word);composing='';page=0;render();}
  function press(key) {
    if(key==='中 / EN'){if(composing)commit(composing);chinese=!chinese;render();return;}
    if(['Shift','ShiftRight','CapsLock'].includes(key)){shift=!shift;render();return;}
    if(key==='Escape'){composing='';render();return;}
    if(/^(F\d+|Control|Alt|AltRight|Meta|MetaRight)$/.test(key)){target?.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));return;}
    if(!target?.isConnected) return;
    if(composing) {
      if(key==='Backspace') composing=composing.slice(0,-1);
      else if(key==='Space'||key==='Enter') {commit(candidates(composing)[page*5]||composing);return;}
      else if(/^[1-5]$/.test(key)){const word=candidates(composing)[page*5+Number(key)-1];if(word)commit(word);return;}
      else if(/^[a-z']$/i.test(key))composing+=key.toLowerCase();
      else {commit(candidates(composing)[page*5]||composing);press(key);return;}
      page=0;render();return;
    }
    if(chinese&&/^[a-z]$/i.test(key)){composing=key.toLowerCase();render();return;}
    let a=target.selectionStart??0,b=target.selectionEnd??a;
    if(key==='Backspace') {if(a===b&&a>0) {a-=Array.from(target.value.slice(0,a)).at(-1).length;target.setSelectionRange(a,b);}edit('','deleteContentBackward');}
    else if(key==='Enter') {if(target.tagName==='TEXTAREA')edit('\n','insertLineBreak');else if(target.form)target.form.requestSubmit();else target.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));}
    else if(key==='Tab'){const all=[...document.querySelectorAll('#foldbook input,#foldbook textarea,.fb-content input,.fb-content textarea')].filter(editable);const next=all[(all.indexOf(target)+1)%all.length];next?.focus({preventScroll:true});}
    else if(key.startsWith('Arrow')){const n=key==='ArrowLeft'?-1:key==='ArrowRight'?1:key==='ArrowUp'?-target.value.length:target.value.length;target.setSelectionRange(Math.max(0,Math.min(target.value.length,a+n)),Math.max(0,Math.min(target.value.length,a+n)));}
    else edit(key==='Space'?' ':shift?key.toUpperCase():key);
  }
  root.querySelector('.fb-base').addEventListener('pointerdown',e=>{if(e.target.closest('button'))e.preventDefault();},{signal});
  keys.addEventListener('click',e=>{const b=e.target.closest('[data-key]');if(b)press(b.dataset.key);},{signal});
  document.addEventListener('keydown',e=>{if(!editable(e.target)&&e.key==='Escape')root.querySelector('.fb-context')?.remove();},{signal});
  render();
  return {press};
}
