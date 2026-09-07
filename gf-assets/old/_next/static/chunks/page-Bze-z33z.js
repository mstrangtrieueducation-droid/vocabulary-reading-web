/* Compatibility for cached Grammar lesson pages; no course data is bundled. */
const session=document.documentElement.dataset.session;
if(!/^\d{2}$/.test(session||''))throw new Error('Missing current lesson');
const lesson=await import(new URL('../../../isolated/session-'+session+'.mjs',import.meta.url).href);
export default lesson.default;
