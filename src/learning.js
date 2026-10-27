/* Small, deterministic lesson scenarios. Every movement uses the real map engine. */
(function(root){
'use strict';
const E=typeof module!=='undefined'&&module.exports?require('./engine'):root.MapEngine;
const I=typeof module!=='undefined'&&module.exports?require('./instructions'):root.MapInstructions;
const groups=[
 {id:'distance',name:'行幾遠？喺邊停？',hint:'同一起點，換一句，停嘅位置就唔同。',ids:['forward','junction','end','crossing']},
 {id:'ordinal',name:'第幾條街先轉？',hint:'由起點向前數。到指定街口，先轉向左／右。',ids:['first-right','second-right','third-right','first-left','second-left','third-left']},
 {id:'facing',name:'左、右、回頭、停低',hint:'睇旅人面向，唔好用自己嘅左右。呢四句先示範面向。',ids:['left','right','back','stop']},
 {id:'street',name:'沿邊條街？喺邊轉？',hint:'pela + 街名：沿住條街行；na + 街名：喺嗰條街轉。',ids:['central','mercado-right']}
];
const notes={
 forward:'向前行一段。呢個練習每次行一小段，未到第一個路口就停。',
 junction:'行到第一個十字路口就停，唔穿過去。',
 end:'經過三個十字路口，直到 Rua Central 盡頭先停。',
 crossing:'穿過第一個十字路口，停喺路口另一邊。',
 left:'位置冇變；旅人轉向自己嘅左邊。下一句再決定行幾遠。',
 right:'位置冇變；旅人轉向自己嘅右邊。下一句再決定行幾遠。',
 back:'位置冇變，轉身面向來路。',stop:'留喺原位，停止行動。',
 central:'沿 Rua Central 向前行一段。街名話畀我哋知沿邊條路行。',
 'mercado-right':'先經過 Rua do Jardim，到 Rua do Mercado 先轉向右邊。'
};
function origin(){return E.initial('','worksheet');}
function result(id){return I.run(origin(),id);}
function points(s){const g=E.graph(s),p=s.path.map(id=>({x:g[id].x,y:g[id].y}));if(s.edge)p.push(I.position(s));return p;}
function explain(id){
 if(notes[id])return notes[id];
 const m=id.match(/^(first|second|third)-(left|right)$/);
 return `經過前面嘅街口，數到第 ${{first:1,second:2,third:3}[m[1]]} 條可轉${m[2]==='left'?'左':'右'}嘅街先轉向。所在路口唔計。`;
}
const questions=[
 {id:'q-junction',command:'junction',options:['end','forward','junction'],hint:'留意 até ao：行到某個位置就停。'},
 {id:'q-end',command:'end',options:['junction','end','forward'],hint:'ao fim da rua 係街道盡頭，途中嘅路口唔係終點。'},
 {id:'q-forward',command:'forward',options:['forward','junction','end'],hint:'呢句冇講行到路口。先向前行一小段。'},
 {id:'q-second',command:'second-right',options:['first-right','third-right','second-right'],hint:'segunda 係第二。經過第一條街先。'},
 {id:'q-third',command:'third-left',options:['second-left','third-left','first-left'],hint:'terceira 係第三。數三條可轉左嘅街。'},
 {id:'q-first',command:'first-right',options:['third-right','first-right','second-right'],hint:'primeira 係第一。最近嗰條可轉右嘅街。'},
 {id:'q-cross',command:'crossing',options:['junction','forward','crossing'],hint:'Atravesse 係穿過；要行到路口另一邊。'},
 {id:'q-named',command:'mercado-right',options:['first-right','mercado-right','third-right'],hint:'唔好喺第一條街轉；搵 Rua do Mercado。'}
];
function answer(questionId,index){const q=questions.find(q=>q.id===questionId);return !!q&&q.options[index]===q.command;}
const api={groups,origin,result,points,explain,questions,answer};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MapLearning=api;
})(typeof globalThis!=='undefined'?globalThis:this);
