document.querySelectorAll('[data-remaining-unit]').forEach(select=>select.addEventListener('change',()=>{if(select.value)location.href=select.value;}));
