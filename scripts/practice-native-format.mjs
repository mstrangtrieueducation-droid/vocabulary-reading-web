// Native formatting policy derived from the established Practice Test template.
// Preserve text, red vocabulary, bold reading targets, watermarks and links.
export default function formatNative(doc,kind){
const tab=doc.tabs[0],body=tab.body.content,last=body.at(-1).endIndex-1,range=(s,e)=>({startIndex:s,endIndex:e,tabId:tab.tabId}),requests=[];
const pt=x=>({magnitude:x,unit:"PT"}),blue={color:{rgbColor:{blue:1}}},red={color:{rgbColor:{red:1}}};
const text=(r,s)=>requests.push({updateTextStyle:{range:r,textStyle:s,fields:Object.keys(s).join(",")}});
const paragraph=(r,s)=>requests.push({updateParagraphStyle:{range:r,paragraphStyle:s,fields:Object.keys(s).join(",")}});
const margins={marginTop:pt(36),marginBottom:pt(36),marginLeft:pt(36),marginRight:pt(36),pageSize:{width:pt(595.2755905511812),height:pt(841.8897637795277)}};
requests.push({updateDocumentStyle:{documentStyle:margins,fields:Object.keys(margins).join(",")}});
function paras(o){if(!o||typeof o!=="object")return [];if(o.paragraph)return [o];return Object.values(o).flatMap(x=>Array.isArray(x)?x.flatMap(paras):paras(x));}
const ps=paras(tab.body);
if(kind==="student"){
 text(range(1,last),{weightedFontFamily:{fontFamily:"Tahoma"},fontSize:pt(10)});
 for(const p of ps){
 const value=p.paragraph.elements.map(e=>e.textRun?.content||"").join(""),m=value.match(/PRACTICE TEST:?\s*\d+/);
 if(m){text(range(p.startIndex+m.index,p.startIndex+m.index+m[0].length),{fontSize:pt(18),bold:true,foregroundColor:red});paragraph(range(p.startIndex,p.endIndex),{alignment:"CENTER"});}
 for(const e of p.paragraph.elements)if(e.textRun&&!e.textRun.content.trim()&&(e.textRun.textStyle?.fontSize?.magnitude||10)<8)text(range(e.startIndex,e.endIndex),{fontSize:e.textRun.textStyle.fontSize});
 }
 return requests;
}
const t=body.find(x=>x.table);if(!t||t.table.tableRows.length!==101)throw Error("Expected 101-row table");
const rows=t.table.tableRows,full=range(t.startIndex+1,t.endIndex-1);
text(full,{weightedFontFamily:{fontFamily:"Tahoma"},fontSize:pt(11),bold:false});
paragraph(full,{lineSpacing:115,spaceAbove:pt(0),spaceBelow:pt(0),indentEnd:pt(0)});
requests.push({updateTableRowStyle:{tableStartLocation:{index:t.startIndex,tabId:tab.tabId},tableRowStyle:{preventOverflow:true},fields:"preventOverflow"}});
requests.push({pinTableHeaderRows:{tableStartLocation:{index:t.startIndex,tabId:tab.tabId},pinnedHeaderRowsCount:1}});
const widths=[47.25,156.75,319.2755905511812];
widths.forEach((w,i)=>requests.push({updateTableColumnProperties:{tableStartLocation:{index:t.startIndex,tabId:tab.tabId},columnIndices:[i],tableColumnProperties:{widthType:"FIXED_WIDTH",width:pt(w)},fields:"widthType,width"}}));
const border={color:{color:{rgbColor:{red:0.65,green:0.78,blue:0.88}}},width:pt(.5),dashStyle:"SOLID"};
requests.push({updateTableCellStyle:{tableRange:{tableCellLocation:{tableStartLocation:{index:t.startIndex,tabId:tab.tabId},rowIndex:0,columnIndex:0},rowSpan:101,columnSpan:3},tableCellStyle:{paddingTop:pt(5),paddingBottom:pt(5),paddingLeft:pt(5),paddingRight:pt(5),contentAlignment:"TOP",borderTop:border,borderBottom:border,borderLeft:border,borderRight:border},fields:"paddingTop,paddingBottom,paddingLeft,paddingRight,contentAlignment,borderTop,borderBottom,borderLeft,borderRight"}});
for(let i=0;i<rows.length;i++)for(let k=0;k<3;k++){
 const c=rows[i].tableCells[k],r=range(c.content[0].startIndex,c.content.at(-1).endIndex-1);if(r.endIndex<=r.startIndex)continue;
 if(i===0){text(r,{fontSize:pt(12),bold:true,foregroundColor:blue});paragraph(r,{alignment:"CENTER",indentStart:pt(0),indentFirstLine:pt(0)});}
 else if(k===0){text(r,{fontSize:pt(10),bold:true,foregroundColor:blue});paragraph(r,{alignment:"CENTER"});}
 else if(k===1){const value=c.content.flatMap(x=>x.paragraph?.elements||[]).map(e=>e.textRun?.content||"").join("").trim();text(r,{fontSize:pt(/^[A-D]$/.test(value)?16:11),bold:true});paragraph(r,{alignment:/^[A-D]$/.test(value)?"CENTER":"START",indentStart:pt(0),indentFirstLine:pt(0)});}
 else {paragraph(r,{alignment:"START",indentStart:pt(0),indentFirstLine:pt(0)});
 for(const e of c.content.flatMap(x=>x.paragraph?.elements||[])){const s=e.textRun?.textStyle,x=s?.foregroundColor?.color?.rgbColor;if(x&&x.red>.5&&(x.green||0)<.4&&(x.blue||0)<.4&&s.bold)text(range(e.startIndex,e.endIndex),{bold:true});}
 }
}
for(const p of ps.filter(x=>x.startIndex<t.startIndex)){
const value=p.paragraph.elements.map(e=>e.textRun?.content||"").join(""),m=value.match(/PRACTICE TEST:?\s*(\d+)/);
if(m){const start=p.startIndex+m.index;paragraph(range(p.startIndex,p.endIndex),{alignment:"CENTER"});text(range(start,start+m[0].length),{weightedFontFamily:{fontFamily:"Tahoma"},fontSize:pt(20),bold:true,foregroundColor:{color:{rgbColor:{red:.8}}}});const ix=m[0].lastIndexOf(m[1]);text(range(start+ix,start+ix+m[1].length),{fontSize:pt(30),foregroundColor:blue});}
}
return requests;
}
