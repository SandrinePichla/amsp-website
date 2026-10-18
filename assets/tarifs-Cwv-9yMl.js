import{c}from"./Layout-DJh3ZGPR.js";const n=`*[_type == "grilleTarifs"][0]{
  disciplinesAuChoix[]-> { _id, nom },
  tarifsAuChoix[] { nombreActivites, total, cheque1, cheque3x },
  disciplineKarate-> { _id, nom },
  tarifsKarate[] { label, total, cheque1, cheque3x },
  remiseFamille2,
  remiseFamille3,
}`,r=()=>c.fetch(n),m=.1,u=(i,t)=>i?t>=3?(i.remiseFamille3||0)/100:t===2?(i.remiseFamille2||0)/100:0:0,f=(i,t)=>{if(!i||i.tarifsAuChoix.length===0||t<=0)return null;const e=Math.max(...i.tarifsAuChoix.map(a=>a.nombreActivites)),s=Math.min(t,e);return i.tarifsAuChoix.find(a=>a.nombreActivites===s)||null},h=(i,t)=>!!(i!=null&&i.disciplineKarate)&&i.disciplineKarate._id===t,A=(i,t)=>{var e;return!!((e=i==null?void 0:i.disciplinesAuChoix)!=null&&e.some(s=>s._id===t))};export{m as R,A as a,h as e,r as f,u as r,f as t};
