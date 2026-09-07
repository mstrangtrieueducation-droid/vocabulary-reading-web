document.querySelectorAll('[data-speaking-selector]').forEach(select=>select.addEventListener('change',()=>{const target=select.value;if(target)location.assign(new URL(target,location.href).href)}));
