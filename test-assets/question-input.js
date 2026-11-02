(function(root){
  const normalize=v=>String(v??'').normalize('NFKC').trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ');
  function forQuestion(section,solution){
    if(Array.isArray(solution?.choices) && solution.choices.length>1){
      return {...section,inputType:'letters',choices:solution.choices,choiceLabels:solution.choiceLabels||{}};
    }
    return section;
  }
  function selected(answer,value,spec){
    if(!normalize(answer))return false;
    if(normalize(answer)===normalize(value))return true;
    const label=spec.choiceLabels?.[value];
    if(!label)return false;
    const clean=v=>normalize(v).replace(/^([a-d])\s*[.):]\s*/, '$1. ');
    if(clean(answer)===clean(label))return true;
    // Restore old typed content only when it identifies exactly one source option.
    const content=v=>normalize(v).replace(/^[a-d]\s*[.):]\s*/,'');
    const same=(a,b)=>a===b || (/^(0|ø|∅|[-–—]|no article)$/.test(a) && /^(ø|∅|[-–—]|no article)$/.test(b));
    const candidates=Object.entries(spec.choiceLabels).filter(([,text])=>same(normalize(answer),content(text)));
    return candidates.length===1 && candidates[0][0]===value;
  }
  root.MTTQuestionInput=Object.freeze({forQuestion,selected});
  if(typeof module==='object'&&module.exports)module.exports=root.MTTQuestionInput;
})(typeof globalThis!=='undefined'?globalThis:this);
