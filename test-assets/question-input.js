(function(root){
  const normalize=v=>String(v??'').normalize('NFKC').trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ');
  function forQuestion(section,solution){
    if(Array.isArray(solution?.choices) && solution.choices.length>1){
      return {...section,inputType:'letters',choices:solution.choices,choiceLabels:solution.choiceLabels||{}};
    }
    return section;
  }
  function selected(answer,value,spec){
    if(normalize(answer)===normalize(value))return true;
    const label=spec.choiceLabels?.[value];
    if(!label)return false;
    return normalize(answer).replace(/^([a-d])[.):]\s*/, '$1. ')===normalize(label);
  }
  root.MTTQuestionInput=Object.freeze({forQuestion,selected});
  if(typeof module==='object'&&module.exports)module.exports=root.MTTQuestionInput;
})(typeof globalThis!=='undefined'?globalThis:this);
