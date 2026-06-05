import { useState, useEffect, useRef } from “react”;
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid, ReferenceLine } from “recharts”;

// ─── Design Tokens ────────────────────────────────────────────────────────────
const D={bg:’#0C1020’,s1:’#111826’,s2:’#172030’,s3:’#1E2A3C’,b1:’#243048’,b2:’#2E3C58’,b3:’#3A4E6C’,t1:’#EDE8DC’,t2:’#7A90AC’,t3:’#4A5E74’,acc:’#C9A040’,sv:’#4AACCC’,sp:’#6AB89A’,gv:’#C9A040’,inv:’#8080CC’,pos:’#5AB87A’,neg:’#CC5858’,wrn:’#C9A040’};

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS=[‘January’,‘February’,‘March’,‘April’,‘May’,‘June’,‘July’,‘August’,‘September’,‘October’,‘November’,‘December’];
const SHORT=MONTHS.map(m=>m.slice(0,3));
const BK={saving:0.15,spending:0.55,giving:0.10,investing:0.20};
const BKEYS=[‘saving’,‘spending’,‘giving’,‘investing’];
const BC={saving:D.sv,spending:D.sp,giving:D.gv,investing:D.inv};
const CC=[D.sv,’#9BB89B’,D.gv,D.inv,’#C09090’,’#7A9AB4’,’#B4A07A’,’#8EA88E’,’#A898B8’,’#B8A890’];

const DEF_SPEND=[{id:‘housing’,name:‘Housing & Rent’,pct:0.32},{id:‘transport’,name:‘Transportation’,pct:0.12},{id:‘groceries’,name:‘Groceries’,pct:0.12},{id:‘dining’,name:‘Dining & Entertainment’,pct:0.10},{id:‘bills’,name:‘Bills & Subscriptions’,pct:0.08},{id:‘health’,name:‘Health & Personal’,pct:0.10},{id:‘lifestyle’,name:‘Lifestyle & Hobbies’,pct:0.08},{id:‘misc’,name:‘Miscellaneous’,pct:0.08}];
const DEF_GIVE=[{id:‘g_tithe’,name:‘Tithe’,pct:0.80},{id:‘g_church’,name:‘Church Giving’,pct:0.10},{id:‘g_other’,name:‘Personal Giving’,pct:0.10}];
const DEF_SAVE=[{id:‘sv_emerg’,name:‘Emergency Fund’,pct:0.60},{id:‘sv_liq’,name:‘Liquid Savings’,pct:0.40}];
const DEF_POS=[
{id:‘tec’,ticker:‘TEC.TO’,name:‘CI Tech Giants ETF’,category:‘ETF’,currency:‘CAD’,shares:0,avgCost:0,currentPrice:0,thesis:‘Core TFSA holding. Broad mega-cap US tech exposure with Canadian tax efficiency.’},
{id:‘smh’,ticker:‘SMH’,name:‘VanEck Semiconductor ETF’,category:‘Semiconductor’,currency:‘USD’,shares:0,avgCost:0,currentPrice:0,thesis:‘Semiconductor layer of the AI value chain. Chips are the picks-and-shovels of the AI buildout.’},
{id:‘googl’,ticker:‘GOOGL’,name:‘Alphabet Inc.’,category:‘Tech’,currency:‘USD’,shares:0,avgCost:0,currentPrice:0,thesis:‘Search monopoly + GCP + Gemini AI. Berkshire accumulation confirms institutional conviction.’},
{id:‘msft’,ticker:‘MSFT’,name:‘Microsoft Corp.’,category:‘Tech’,currency:‘USD’,shares:0,avgCost:0,currentPrice:0,thesis:‘Azure cloud leadership + OpenAI partnership + Office moat. AI at every enterprise layer.’},
{id:‘tsm’,ticker:‘TSM’,name:‘Taiwan Semiconductor’,category:‘Semiconductor’,currency:‘USD’,shares:0,avgCost:0,currentPrice:0,thesis:‘Irreplaceable foundry. Every advanced chip runs through TSMC. No substitute exists.’},
{id:‘btc’,ticker:‘BTC’,name:‘Bitcoin’,category:‘Crypto’,currency:‘USD’,shares:0,avgCost:0,currentPrice:0,thesis:‘Long-term digital currency / store of value thesis.’},
];
const DEF_THESIS=‘AI value chain thesis: mapping capital across three layers — (1) Semiconductors (compute), (2) Cloud/hyperscalers (platform), (3) Software/applications (value capture). Positioned for the multi-year AI infrastructure buildout.’;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt=n=>`$${Math.round(n??0).toLocaleString('en-CA')}`;
const fmtK=n=>Math.abs(n)>=1000?`$${(n/1000).toFixed(1)}k`:`$${Math.round(Math.abs(n))}`;
const fmtPct=(n,d=1)=>`${n>=0?'+':''}${n.toFixed(d)}%`;
const mkKey=(y,m)=>`${y}-${String(m+1).padStart(2,'0')}`;
const rgb=hex=>{const r=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);return r?`${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}`:‘136,136,136’;};
const bst=(a,b)=>!b?‘ok’:a/b>1?‘over’:a/b>0.8?‘warn’:‘ok’;
const getCatAmt=(cid,ao)=>{const it=ao?.[cid+’*items’];return Array.isArray(it)&&it.length>0?it.reduce((s,i)=>s+(i.amount||0),0):(ao?.[cid]||0);};
const samp=(arr,max=32)=>{if(!arr||arr.length<=max)return arr||[];const s=Math.ceil(arr.length/max);return arr.filter((*,i)=>i%s===0||i===arr.length-1);};
const TS={background:D.s3,border:`1px solid ${D.b2}`,borderRadius:8,color:D.t1,fontSize:11,fontFamily:”‘Courier Prime’,monospace”,boxShadow:‘0 4px 20px rgba(0,0,0,0.4)’};
const monthsBetween=(a,b)=>Math.max(0,(b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth()));

// ─── Tax Data ─────────────────────────────────────────────────────────────────
const FED_B=[{min:0,max:57375,r:0.15},{min:57375,max:114750,r:0.205},{min:114750,max:158519,r:0.26},{min:158519,max:220000,r:0.29},{min:220000,max:Infinity,r:0.33}];
const PROV={ON:{n:‘Ontario’,bpa:11865,b:[{min:0,max:51446,r:0.0505},{min:51446,max:102894,r:0.0915},{min:102894,max:150000,r:0.1116},{min:150000,max:220000,r:0.1216},{min:220000,max:Infinity,r:0.1316}]},BC:{n:‘British Columbia’,bpa:11981,b:[{min:0,max:45654,r:0.0506},{min:45654,max:91310,r:0.077},{min:91310,max:104835,r:0.105},{min:104835,max:127299,r:0.1229},{min:127299,max:172602,r:0.147},{min:172602,max:240716,r:0.168},{min:240716,max:Infinity,r:0.205}]},AB:{n:‘Alberta’,bpa:21003,b:[{min:0,max:148269,r:0.10},{min:148269,max:177922,r:0.12},{min:177922,max:237230,r:0.13},{min:237230,max:355845,r:0.14},{min:355845,max:Infinity,r:0.15}]},QC:{n:‘Quebec’,bpa:17183,b:[{min:0,max:51780,r:0.14},{min:51780,max:103545,r:0.19},{min:103545,max:126000,r:0.24},{min:126000,max:Infinity,r:0.2575}]}};
const bTax=(inc,brackets)=>{let t=0;for(const b of brackets){if(inc<=b.min)break;t+=(Math.min(inc,b.max)-b.min)*b.r;}return t;};
const margRate=(inc,prov)=>{const fd=FED_B.find(b=>inc>b.min&&inc<=b.max)||FED_B[FED_B.length-1];const pd=PROV[prov]||PROV.ON;const pp=pd.b.find(b=>inc>b.min&&inc<=b.max)||pd.b[pd.b.length-1];return fd.r+pp.r;};
const calcTax=(gross,rrsp,prov=‘ON’)=>{if(gross<=0)return{fed:0,prov:0,cpp:0,cpp2:0,ei:0,total:0,takeHome:gross,effRate:0,margRate:0,net:0};const net=Math.max(0,gross-rrsp);const cpp=gross<=3500?0:Math.min((Math.min(gross,73200)-3500)*0.0595,(73200-3500)*0.0595);const cpp2=gross<=73200?0:Math.min((Math.min(gross,81200)-73200)*0.04,320);const ei=Math.min(gross,65700)*(prov===‘QC’?0.0132:0.0166);const pd=PROV[prov]||PROV.ON;const fedGross=bTax(Math.max(0,net-16129),FED_B);const fedNet=Math.max(0,fedGross-(cpp+cpp2)*0.15-ei*0.15);const provTax=bTax(Math.max(0,net-pd.bpa),pd.b);const total=fedNet+provTax+cpp+cpp2+ei;return{fed:fedNet,prov:provTax,cpp,cpp2,ei,total,takeHome:Math.max(0,gross-total-rrsp),effRate:total/gross*100,margRate:margRate(net,prov),net};};

// ─── Debt Payoff ──────────────────────────────────────────────────────────────
const calcPayoff=(debts,extra,strategy)=>{if(!debts?.length)return null;const sorted=[…debts].filter(d=>parseFloat(d.balance)>0).sort(strategy===‘avalanche’?(a,b)=>parseFloat(b.rate)-parseFloat(a.rate):(a,b)=>parseFloat(a.balance)-parseFloat(b.balance));if(!sorted.length)return null;let bal=sorted.map(d=>({…d,balance:parseFloat(d.balance)||0}));const monthly=[],payoffAt={};let totalInterest=0;for(let m=1;m<=600;m++){if(bal.every(b=>b.balance<=0.01))break;const freed=bal.filter(b=>b.balance<=0.01).reduce((s,b)=>s+(parseFloat(b.minPayment)||0),0);const fi=bal.findIndex(b=>b.balance>0.01);for(let i=0;i<bal.length;i++){if(bal[i].balance<=0.01)continue;const mi=bal[i].balance*(parseFloat(bal[i].rate)||0)/12;totalInterest+=mi;let pmt=(parseFloat(bal[i].minPayment)||0)+(i===fi?((parseFloat(extra)||0)+freed):0);pmt=Math.min(pmt,bal[i].balance+mi);bal[i].balance=Math.max(0,bal[i].balance+mi-pmt);if(bal[i].balance<=0.01&&!payoffAt[bal[i].id])payoffAt[bal[i].id]=m;}monthly.push({month:m,total:Math.round(bal.reduce((s,b)=>s+b.balance,0))});if(bal.every(b=>b.balance<=0.01))break;}return{monthly,totalInterest,months:monthly.length,sorted,payoffAt};};

// ─── Shared Components ────────────────────────────────────────────────────────
const Bar=({a,b,c,showPct})=>{const raw=b>0?(a/b)*100:0,fill=Math.min(raw,100),col=bst(a,b)===‘ok’?c:bst(a,b)===‘warn’?D.wrn:D.neg;return(<div style={{margin:‘7px 0’}}><div style={{position:‘relative’,height:4,background:‘rgba(255,255,255,0.05)’,borderRadius:99,overflow:‘hidden’}}>{[25,50,75].map(t=><div key={t} style={{position:‘absolute’,left:`${t}%`,top:0,bottom:0,width:1,background:‘rgba(0,0,0,0.5)’,zIndex:1}}/>)}<div style={{position:‘absolute’,top:0,left:0,height:‘100%’,width:`${fill}%`,background:col,borderRadius:99,transition:‘width 0.35s ease’}}/></div>{showPct&&b>0&&<div style={{display:‘flex’,justifyContent:‘space-between’,marginTop:3}}><div style={{fontSize:9,color:‘rgba(255,255,255,0.1)’,fontFamily:”‘Courier Prime’,monospace”}}>0···25%···50%···75%···100%</div><div style={{fontSize:10,color:col,fontFamily:”‘Courier Prime’,monospace”,fontWeight:600}}>{Math.round(raw)}%</div></div>}</div>);};
const AmtField=({val,set,narrow,placeholder=‘0’})=>(<div style={{position:‘relative’,width:narrow?112:‘100%’}}><span style={{position:‘absolute’,left:9,top:‘50%’,transform:‘translateY(-50%)’,color:D.t2,fontFamily:”‘Courier Prime’,monospace”,fontSize:12,pointerEvents:‘none’}}>$</span><input type=“number” value={val||’’} onChange={e=>set(e.target.value)} placeholder={placeholder} style={{width:‘100%’,background:D.s2,border:`1px solid ${D.b2}`,borderRadius:7,color:D.t1,fontFamily:”‘Courier Prime’,monospace”,fontSize:13,padding:‘7px 8px 7px 20px’}}/></div>);
const Pill=({n,c})=><span style={{padding:‘2px 7px’,borderRadius:99,background:`rgba(${rgb(c)},0.10)`,color:c,fontSize:10,fontWeight:600,fontFamily:”‘Courier Prime’,monospace”}}>{n}</span>;
const Badge=({s})=>{const cfg={ok:{icon:‘✓’,l:‘On Track’,c:D.pos},warn:{icon:‘◑’,l:‘Nearing’,c:D.wrn},over:{icon:‘✕’,l:‘Over’,c:D.neg}};const{icon,l,c}=cfg[s]||cfg.ok;return(<span style={{display:‘inline-flex’,alignItems:‘center’,gap:3,padding:‘3px 8px’,borderRadius:6,fontSize:9,fontWeight:700,letterSpacing:‘0.05em’,textTransform:‘uppercase’,background:`rgba(${rgb(c)},0.10)`,color:c,border:`1px solid rgba(${rgb(c)},0.18)`}}>{icon} {l}</span>);};
const TrendIcon=({vals,inv=false})=>{if(!vals||vals.filter(v=>v>0).length<2)return null;const last=vals[vals.length-1],prev=vals.slice(0,-1).filter(v=>v>0).slice(-1)[0];if(!prev||prev===0)return null;const up=last>prev*1.02,dn=last<prev*0.98;if(!up&&!dn)return(<span style={{fontSize:9,color:D.t2,fontFamily:”‘Courier Prime’,monospace”,marginLeft:4}}>→</span>);const isGood=inv?up:!up;const pct=Math.round(Math.abs((last-prev)/prev)*100);return(<span style={{fontSize:10,color:isGood?D.pos:D.neg,fontFamily:”‘Courier Prime’,monospace”,fontWeight:600,marginLeft:4}}>{up?‘↑’:‘↓’} {pct}%</span>);};
const PatternChip=({vals})=>{if(!vals||vals.filter(v=>v>0).length<3)return null;const v=vals.slice(-3);const allUp=v[2]>v[1]&&v[1]>v[0]&&v[0]>0;const allDn=v[2]<v[1]&&v[1]<v[0]&&v[1]>0;const spike=v[0]>0&&v[1]>0&&v[2]>Math.max(v[0],v[1])*1.3;const label=allUp?‘↑ 3 Month High’:allDn?‘↓ 3 Month Low’:spike?‘⚡ Spike’:null;if(!label)return null;const c=allUp?D.neg:allDn?D.pos:D.wrn;return(<span style={{display:‘inline-flex’,alignItems:‘center’,fontSize:9,fontWeight:700,color:c,background:`rgba(${rgb(c)},0.09)`,border:`1px solid rgba(${rgb(c)},0.22)`,borderRadius:5,padding:‘2px 6px’,marginLeft:5,letterSpacing:‘0.02em’}}>{label}</span>);};
const MicroInsight=({text,type=‘info’})=>{if(!text)return null;const cfg={info:{c:D.t2,icon:’’},warn:{c:D.wrn,icon:’◐ ’},good:{c:D.pos,icon:’✓ ’},bad:{c:D.neg,icon:’✕ ’}};const{c,icon}=cfg[type]||cfg.info;return(<div style={{display:‘flex’,alignItems:‘flex-start’,gap:3,fontSize:10,color:c,marginTop:4,lineHeight:1.5}}><span style={{flexShrink:0}}>{icon}</span><span>{text}</span></div>);};
const Stat=({label,val,sub,color})=><div style={{background:D.s1,border:`1px solid ${D.b1}`,borderRadius:12,padding:‘12px 14px’}}><div style={{fontSize:10,fontWeight:600,letterSpacing:‘0.08em’,textTransform:‘uppercase’,color:D.t2,marginBottom:4}}>{label}</div><div style={{fontFamily:”‘Bebas Neue’,sans-serif”,fontSize:20,fontWeight:700,color:color||D.t1}}>{val}</div>{sub&&<div style={{fontSize:11,color:D.t2,marginTop:2}}>{sub}</div>}</div>;

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App(){
const T=new Date();
const [yr,setYr]=useState(T.getFullYear());
const [mo,setMo]=useState(T.getMonth());
const [tab,setTab]=useState(‘overview’);
const [edit,setEdit]=useState(false);
const [open,setOpen]=useState(new Set());
const [spendView,setSpendView]=useState(‘list’);
const [showThesis,setShowThesis]=useState(false);
const [expandedPos,setExpandedPos]=useState(new Set());
const [refreshing,setRefreshing]=useState(false);
const [lastRefresh,setLastRefresh]=useState(null);

const [base,setBase]=useState(’’);
const [streams,setStreams]=useState([]);
const [sCats,setSCats]=useState(DEF_SPEND);
const [gCats,setGCats]=useState(DEF_GIVE);
const [vCats,setVCats]=useState(DEF_SAVE);
const [emerGoal,setEmerGoal]=useState({months:6,balance:’’});
const [goals,setGoals]=useState([]);
const [sinks,setSinks]=useState([]);
const [rrspData,setRrspData]=useState({room:’’,ytd:’’,balance:’’,empPct:‘4’,matchPct:‘4’});
const [positions,setPositions]=useState(DEF_POS);
const [portThesis,setPortThesis]=useState(DEF_THESIS);
const [fxRate,setFxRate]=useState(‘1.36’);
const [debts,setDebts]=useState([]);
const [debtStrategy,setDebtStrategy]=useState(‘avalanche’);
const [debtExtra,setDebtExtra]=useState(’’);
const [nwExtras,setNwExtras]=useState({liquid:’’,chequing:’’,other:[]});
const [tfsaRoom,setTfsaRoom]=useState(‘52986’);
const [province,setProvince]=useState(‘ON’);
const [data,setData]=useState({});
const [nwHistory,setNwHistory]=useState({});
const [ready,setReady]=useState(false);
const autoRef=useRef(new Set());

// ── Derived ──────────────────────────────────────────────────────────────────
const key=mkKey(yr,mo),md=data[key]||{},acts=md.actuals||{},notes=md.notes||’’;
const vari=md.variable||0;
const baseInc=parseFloat(base)||0;
const streamFixedInc=streams.filter(s=>s.freq===‘fixed’).reduce((t,s)=>t+(parseFloat(s.amount)||0),0);
const streamVarInc=streams.filter(s=>s.freq===‘variable’).reduce((t,s)=>t+(md.extraIncome?.[s.id]||0),0);
const inc=baseInc+vari+streamFixedInc+streamVarInc;
const tgt={saving:inc*0.15,spending:inc*0.55,giving:inc*0.10,investing:inc*0.20};
const act={saving:vCats.reduce((s,c)=>s+(acts[c.id]||0),0),spending:sCats.reduce((s,c)=>s+getCatAmt(c.id,acts),0),giving:gCats.reduce((s,c)=>s+(acts[c.id]||0),0),investing:acts.investing||0};
const unalloc=inc-Object.values(act).reduce((s,v)=>s+v,0);
const pm=mo===0?11:mo-1,py=mo===0?yr-1:yr,pActs=data[mkKey(py,pm)]?.actuals||{};
const pAct={saving:vCats.reduce((s,c)=>s+(pActs[c.id]||0),0),spending:sCats.reduce((s,c)=>s+getCatAmt(c.id,pActs),0),giving:gCats.reduce((s,c)=>s+(pActs[c.id]||0),0),investing:pActs.investing||0};

// Portfolio with FX
const fxVal=parseFloat(fxRate)||1.36;
const posCAD=p=>(parseFloat(p.currentPrice)||0)*(parseFloat(p.shares)||0)*(p.currency===‘USD’?fxVal:1);
const posCostCAD=p=>(parseFloat(p.avgCost)||0)*(parseFloat(p.shares)||0)*(p.currency===‘USD’?fxVal:1);
const portTotal=positions.reduce((s,p)=>s+posCAD(p),0);
const portCost=positions.reduce((s,p)=>s+posCostCAD(p),0);
const portPnL=portTotal-portCost;
const portPnLPct=portCost>0?(portPnL/portCost)*100:0;

// RRSP
const grossMonthly=(parseFloat(base)||0)/12;
const rrspEmpMo=grossMonthly*(parseFloat(rrspData.empPct)||0)/100;
const rrspMatchMo=grossMonthly*(parseFloat(rrspData.matchPct)||0)/100;
const rrspTotalMo=rrspEmpMo+rrspMatchMo;
const rrspYTDVal=parseFloat(rrspData.ytd)||0;
const rrspRoomVal=parseFloat(rrspData.room)||0;
const rrspRoomLeft=Math.max(0,rrspRoomVal-rrspYTDVal);

// Tax for insights
const grossAnnual=baseInc*12+(vari*12);
const txResult=calcTax(grossAnnual,rrspYTDVal,province);

// Emergency fund
const avgExp=(()=>{const v=[1,2,3].map(off=>{let m=mo-off,y=yr;while(m<0){m+=12;y–;}return sCats.reduce((s,c)=>s+getCatAmt(c.id,data[mkKey(y,m)]?.actuals||{}),0);}).filter(v=>v>0);return v.length?v.reduce((s,x)=>s+x,0)/v.length:(tgt.spending||inc*0.55);})();
const emerTgt=avgExp*(emerGoal.months||6),emerBal=parseFloat(emerGoal.balance)||0,emerPct=emerTgt>0?(emerBal/emerTgt)*100:0;

// Net worth
const nwLiquid=parseFloat(nwExtras.liquid)||0,nwChequing=parseFloat(nwExtras.chequing)||0;
const nwOther=(nwExtras.other||[]).reduce((s,a)=>s+(parseFloat(a.value)||0),0);
const nwRrsp=parseFloat(rrspData.balance)||0;
const totalAssets=portTotal+nwRrsp+emerBal+nwLiquid+nwChequing+nwOther;
const totalDebt=debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
const netWorth=totalAssets-totalDebt;

// Debt payoff
const payoff=calcPayoff(debts,parseFloat(debtExtra)||0,debtStrategy);

// TFSA
const tfsaRoomVal=parseFloat(tfsaRoom)||0;
const mLeft=Math.max(1,12-mo);

// Sinking funds
const sinkMonthly=sinks.reduce((s,sf)=>(parseFloat(sf.annual)||0)/12+s,0);

// Goals monthly needed
const goalMonthly=goals.reduce((s,g)=>{const target=parseFloat(g.target)||0,saved=parseFloat(g.saved)||0,rem=Math.max(0,target-saved);if(!g.date||rem<=0)return s;const ml=Math.max(1,monthsBetween(T,new Date(g.date)));return s+rem/ml;},0);

// Annual rows
const aRows=MONTHS.map((_,i)=>{const mk=mkKey(yr,i),mdt=data[mk]||{},ma=mdt.actuals||{},mv=mdt.variable||0,msi=(streams.filter(s=>s.freq===‘fixed’).reduce((t,s)=>t+(parseFloat(s.amount)||0),0))+(streams.filter(s=>s.freq===‘variable’).reduce((t,s)=>t+(mdt.extraIncome?.[s.id]||0),0)),mi=(parseFloat(base)||0)+mv+msi;return{m:SHORT[i],inc:mi,saving:{t:mi*0.15,a:vCats.reduce((s,c)=>s+(ma[c.id]||0),0)},spending:{t:mi*0.55,a:sCats.reduce((s,c)=>s+getCatAmt(c.id,ma),0)},giving:{t:mi*0.10,a:gCats.reduce((s,c)=>s+(ma[c.id]||0),0)},investing:{t:mi*0.20,a:ma.investing||0}};});
const ySum=aRows.reduce((acc,r)=>({inc:acc.inc+r.inc,saving:{t:acc.saving.t+r.saving.t,a:acc.saving.a+r.saving.a},spending:{t:acc.spending.t+r.spending.t,a:acc.spending.a+r.spending.a},giving:{t:acc.giving.t+r.giving.t,a:acc.giving.a+r.giving.a},investing:{t:acc.investing.t+r.investing.t,a:acc.investing.a+r.investing.a}}),{inc:0,saving:{t:0,a:0},spending:{t:0,a:0},giving:{t:0,a:0},investing:{t:0,a:0}});

// YTD giving
const ytdGiven=aRows.slice(0,mo+1).reduce((s,r)=>s+r.giving.a,0);
const ytdGivingTarget=aRows.slice(0,mo+1).reduce((s,r)=>s+r.giving.t,0);

// Pattern analysis
const getVals=(fn,n=4)=>{const r=[];for(let i=n-1;i>=0;i–){let m=mo-i,y=yr;while(m<0){m+=12;y–;}r.push(fn(data[mkKey(y,m)]?.actuals||{},data[mkKey(y,m)]||{}));}return r;};
const catVals=cid=>getVals(a=>getCatAmt(cid,a));

// ── Storage ───────────────────────────────────────────────────────────────────
useEffect(()=>{
(async()=>{
try{const s=await window.storage.get(‘bp4-cfg’);if(s){const p=JSON.parse(s.value);if(p.base!=null)setBase(String(p.base));if(p.streams)setStreams(p.streams);if(p.sCats)setSCats(p.sCats);if(p.gCats)setGCats(p.gCats);if(p.vCats)setVCats(p.vCats);if(p.emerGoal)setEmerGoal(p.emerGoal);if(p.goals)setGoals(p.goals);if(p.sinks)setSinks(p.sinks);if(p.rrspData)setRrspData(p.rrspData);if(p.positions)setPositions(p.positions);if(p.portThesis)setPortThesis(p.portThesis);if(p.fxRate)setFxRate(p.fxRate);if(p.debts)setDebts(p.debts);if(p.debtStrategy)setDebtStrategy(p.debtStrategy);if(p.debtExtra)setDebtExtra(p.debtExtra);if(p.nwExtras)setNwExtras(p.nwExtras);if(p.tfsaRoom)setTfsaRoom(p.tfsaRoom);if(p.province)setProvince(p.province);}}catch{}
try{const d=await window.storage.get(‘bp4-data’);if(d)setData(JSON.parse(d.value));}catch{}
try{const n=await window.storage.get(‘bp4-nw’);if(n)setNwHistory(JSON.parse(n.value));}catch{}
setReady(true);
})();
},[]);
useEffect(()=>{if(!ready)return;window.storage.set(‘bp4-cfg’,JSON.stringify({base:parseFloat(base)||0,streams,sCats,gCats,vCats,emerGoal,goals,sinks,rrspData,positions,portThesis,fxRate,debts,debtStrategy,debtExtra,nwExtras,tfsaRoom,province}));},[base,streams,sCats,gCats,vCats,emerGoal,goals,sinks,rrspData,positions,portThesis,fxRate,debts,debtStrategy,debtExtra,nwExtras,tfsaRoom,province,ready]);
useEffect(()=>{if(!ready)return;window.storage.set(‘bp4-data’,JSON.stringify(data));},[data,ready]);
useEffect(()=>{if(!ready)return;window.storage.set(‘bp4-nw’,JSON.stringify(nwHistory));},[nwHistory,ready]);

// Auto-populate recurring items
useEffect(()=>{
if(!ready||autoRef.current.has(key))return;autoRef.current.add(key);
const cur=data[key]?.actuals||{},updates={};
for(const cat of sCats){const ik=cat.id+’_items’;if(Array.isArray(cur[ik])&&cur[ik].length>0)continue;for(let off=1;off<=12;off++){let lm=mo-off,ly=yr;while(lm<0){lm+=12;ly–;}const past=data[mkKey(ly,lm)]?.actuals?.[ik];if(Array.isArray(past)&&past.length>0){const rec=past.filter(i=>i.recurring);if(rec.length>0)updates[ik]=rec.map(i=>({…i,id:`${i.id}_${Date.now()}_${Math.random().toString(36).slice(2)}`}));break;}}}
if(Object.keys(updates).length>0)setData(p=>({…p,[key]:{…p[key],actuals:{…p[key]?.actuals,…updates}}}));
},[key,ready]);

// Auto-save net worth snapshot when visiting networth tab
useEffect(()=>{
if(tab!==‘networth’||!ready)return;
setNwHistory(p=>({…p,[key]:{assets:Math.round(totalAssets),liabilities:Math.round(totalDebt),netWorth:Math.round(netWorth),ts:Date.now()}}));
},[tab,key,portTotal,totalDebt,emerBal,nwRrsp,nwLiquid,nwChequing,nwOther]);

// Auto-save net worth snapshot on app open (when data finishes loading)
useEffect(()=>{
if(!ready||totalAssets===0)return;
setNwHistory(p=>({…p,[key]:{assets:Math.round(totalAssets),liabilities:Math.round(totalDebt),netWorth:Math.round(netWorth),ts:Date.now()}}));
},[ready]);

// ── Updaters ──────────────────────────────────────────────────────────────────
const setA=(id,v)=>setData(p=>({…p,[key]:{…p[key],actuals:{…p[key]?.actuals,[id]:parseFloat(v)||0}}}));
const setAny=(id,v)=>setData(p=>({…p,[key]:{…p[key],actuals:{…p[key]?.actuals,[id]:v}}}));
const setVar=v=>setData(p=>({…p,[key]:{…p[key],variable:parseFloat(v)||0}}));
const setNotes=v=>setData(p=>({…p,[key]:{…p[key],notes:v}}));
const setExtraIncome=(sid,v)=>setData(p=>({…p,[key]:{…p[key],extraIncome:{…p[key]?.extraIncome,[sid]:parseFloat(v)||0}}}));
const toggleOpen=id=>setOpen(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
const addItem=cid=>{const items=acts[cid+’_items’]||[];setAny(cid+’_items’,[…items,{id:`${cid}_${Date.now()}`,name:’’,amount:0,recurring:false}]);setOpen(p=>new Set(p).add(cid));};
const updItem=(cid,iid,f,v)=>setAny(cid+’_items’,(acts[cid+’_items’]||[]).map(i=>i.id===iid?{…i,[f]:f===‘amount’?(parseFloat(v)||0):v}:i));
const togRec=(cid,iid)=>setAny(cid+’_items’,(acts[cid+’_items’]||[]).map(i=>i.id===iid?{…i,recurring:!i.recurring}:i));
const delItem=(cid,iid)=>setAny(cid+’_items’,(acts[cid+’_items’]||[]).filter(i=>i.id!==iid));
const nav=d=>{if(d===-1&&mo===0){setMo(11);setYr(y=>y-1);}else if(d===1&&mo===11){setMo(0);setYr(y=>y+1);}else setMo(m=>m+d);};
const updPos=(id,f,v)=>setPositions(ps=>ps.map(p=>p.id===id?{…p,[f]:[‘shares’,‘avgCost’,‘currentPrice’].includes(f)?(parseFloat(v)||0):v}:p));

// ── Live Price Refresh ────────────────────────────────────────────────────────
const refreshPrices=async()=>{
setRefreshing(true);
try{
const tickers=positions.filter(p=>p.ticker&&p.ticker!==‘BTC’).map(p=>p.ticker).join(’, ‘);
const hasBtc=positions.some(p=>p.ticker===‘BTC’&&(p.shares||0)>0);
const resp=await fetch(‘https://api.anthropic.com/v1/messages’,{method:‘POST’,headers:{‘Content-Type’:‘application/json’},body:JSON.stringify({model:‘claude-sonnet-4-20250514’,max_tokens:1000,tools:[{type:‘web_search_20250305’,name:‘web_search’}],messages:[{role:‘user’,content:`Get current stock prices for: ${tickers}${hasBtc?', Bitcoin (BTC) in USD':''} and current USD to CAD exchange rate. Reply ONLY with a JSON object, no markdown: {"prices":{"GOOGL":180.50,"MSFT":420.00,"SMH":250.00,"TEC.TO":35.00,"TSM":180.00${hasBtc?',"BTC":95000':''}},"USDCAD":1.3650}`}]})});
const rd=await resp.json();
const txt=rd.content.filter(b=>b.type===‘text’).map(b=>b.text).join(’’);
const match=txt.match(/{[\s\S]*}/);
if(match){const parsed=JSON.parse(match[0]);if(parsed.prices)setPositions(prev=>prev.map(p=>parsed.prices[p.ticker]?{…p,currentPrice:parsed.prices[p.ticker]}:p));if(parsed.USDCAD)setFxRate(String(parsed.USDCAD));setLastRefresh(new Date().toLocaleTimeString());}
}catch(e){console.error(‘Refresh failed’,e);}
setRefreshing(false);
};

// ── Style tokens ──────────────────────────────────────────────────────────────
const card={background:D.s1,border:`1px solid ${D.b1}`,borderRadius:14,padding:‘18px 20px’,marginBottom:12};
const lbl={fontSize:9,fontWeight:700,letterSpacing:‘0.10em’,textTransform:‘uppercase’,color:D.t3};
const mono={fontFamily:”‘Courier Prime’,monospace”};
const pj={fontFamily:”‘Inter’,sans-serif”};
const pd={fontFamily:”‘Bebas Neue’,sans-serif”,letterSpacing:‘0.04em’};
const tbtn=on=>({padding:‘8px 14px’,borderRadius:8,fontSize:11,fontWeight:600,cursor:‘pointer’,border:‘none’,outline:‘none’,background:on?`rgba(${rgb(D.acc)},0.10)`:‘transparent’,color:on?D.acc:D.t2,whiteSpace:‘nowrap’,flexShrink:0,transition:‘all 0.15s’,letterSpacing:‘0.02em’,borderBottom:on?`1px solid rgba(${rgb(D.acc)},0.4)`:‘1px solid transparent’});
const navB={background:D.s2,border:`1px solid ${D.b2}`,borderRadius:8,color:D.acc,width:32,height:32,cursor:‘pointer’,display:‘flex’,alignItems:‘center’,justifyContent:‘center’,fontSize:16,outline:‘none’,transition:‘all 0.15s’};
const inB={width:‘100%’,background:D.s2,border:`1px solid ${D.b2}`,borderRadius:8,color:D.t1,fontSize:12,padding:‘8px 10px’,outline:‘none’,fontFamily:”‘Inter’,sans-serif”,transition:‘border-color 0.15s’};
const smBtn=(on,c=D.acc)=>({padding:‘6px 14px’,borderRadius:8,fontSize:11,fontWeight:600,cursor:‘pointer’,border:`1px solid ${on?c:D.b2}`,background:on?`rgba(${rgb(c)},0.12)`:D.s2,color:on?c:D.t2,outline:‘none’,transition:‘all 0.15s’});

// ── Insights builder ─────────────────────────────────────────────────────────
const buildInsights=()=>{
const ins=[];
const add=(p,icon,title,body,action)=>ins.push({p,icon,title,body,action});
// Surplus/deficit
if(inc>0){
if(unalloc>50){const toE=emerPct<100?Math.min(unalloc,emerTgt-emerBal):0,toT=emerPct>=100?Math.min(unalloc,Math.max(tgt.investing-act.investing,0)):0;add(‘high’,‘💰’,`${fmt(unalloc)} Surplus This Month`,emerPct<100?`Emergency fund at ${Math.round(emerPct)}% — surplus goes here first.`:act.investing<tgt.investing?`All priorities met except TFSA. ${fmt(tgt.investing-act.investing)} short.`:`All targets hit.`,toE>0?`→ Add ${fmt(toE)} to Emergency Fund`:toT>0?`→ Top up TFSA by ${fmt(toT)}`:`→ Deploy to highest-priority goal`);}
else if(unalloc<-50)add(‘high’,‘🔴’,`${fmt(Math.abs(unalloc))} Over-Allocated`,`Tracked expenses exceed take-home. Drawing on reserves.`,`→ Review Spending tab and cut the over-budget category`);
}
// Emergency fund
if(inc>0){if(emerBal===0)add(‘high’,‘🚨’,‘Emergency Fund Not Started’,`Target: ${fmt(emerTgt)} (${emerGoal.months} months × ${fmt(avgExp)}/mo). Critical safety net.`,`→ Direct full saving bucket (${fmt(tgt.saving)}/mo) here first`);else if(emerPct<100){const ml=act.saving>0?Math.ceil((emerTgt-emerBal)/act.saving):null;add(emerPct<50?‘high’:‘medium’,‘🛡’,`Emergency Fund — ${Math.round(emerPct)}%`,`${fmt(emerBal)} of ${fmt(emerTgt)}.${ml?` ~${ml} months to full coverage.`:''}`,emerPct<50?`→ Prioritize before increasing TFSA`:`→ On track`);}else add(‘ok’,‘🎯’,‘Emergency Fund Complete’,`${fmt(emerBal)} — ${emerGoal.months}-month net fully funded.`,`→ Redirect surplus to TFSA or goals`);}
// TFSA
if(inc>0){const ytdTFSA=ySum.investing.a;const tfsaLeft=Math.max(0,tfsaRoomVal-ytdTFSA);if(act.investing===0)add(‘high’,‘📊’,‘No TFSA Contribution Logged’,`Target: ${fmt(tgt.investing)}/mo. Room remaining: ${fmt(tfsaLeft)}.`,`→ Log your contribution in Overview`);else if(act.investing<tgt.investing*0.8)add(‘medium’,‘📊’,`TFSA at ${Math.round(act.investing/tgt.investing*100)}% of Target`,`${fmt(act.investing)} of ${fmt(tgt.investing)}.`,`→ Top up before month end`);}
// RRSP
if(inc>0&&rrspRoomVal>0&&txResult.margRate>=0.33&&rrspYTDVal<rrspRoomVal*0.5)add(‘medium’,‘🏦’,‘RRSP Under-Utilized at High Marginal Rate’,`At ${Math.round(txResult.margRate*100)}% marginal rate, each $1k to RRSP saves ${fmt(Math.round(1000*txResult.margRate))} in tax.`,`→ Increase RRSP contributions — employer match makes this more powerful`);
// Commission buffer
if(vari>0||streams.some(s=>s.freq===‘variable’))add(‘medium’,‘💼’,‘Commission Tax Buffer’,`Set aside ${Math.round(txResult.margRate*100)}% of variable income for taxes. Employer withholding may be lower than your marginal rate.`,`→ Hold ${fmt(Math.round((vari+streamVarInc)*txResult.margRate))} from this month's variable income`);
// TFSA vs RRSP
if(inc>0)add(txResult.margRate>=0.33?‘medium’:‘low’,txResult.margRate>=0.33?‘🏦’:‘💎’,`${txResult.margRate>=0.33?'RRSP Priority':'TFSA Priority'} at ${Math.round(txResult.margRate*100)}% Marginal Rate`,txResult.margRate>=0.33?‘High marginal rate — RRSP deduction is significant today. Max RRSP before adding to TFSA.’:txResult.margRate>=0.26?‘Balanced decision — consider splitting between RRSP and TFSA.’:‘Lower marginal rate — TFSA preferred. Tax savings from RRSP modest now; you may face higher rates later.’,`→ ${txResult.margRate>=0.33?'Prioritize RRSP, then TFSA':txResult.margRate>=0.26?'Split contributions 50/50':'Max TFSA first'}`);
// Spending trends
for(const cat of sCats){const vals=catVals(cat.id);if(!vals.some(v=>v>0))continue;const cb=tgt.spending*cat.pct;const v=vals.slice(-3);const allUp=v[2]>v[1]&&v[1]>v[0]&&v[0]>0;const over=vals[vals.length-1]>cb&&cb>0;if(allUp)add(‘medium’,‘📈’,`${cat.name} Rising 3 Months`,`Up ${fmt(vals[vals.length-1]-vals[0])} over 3 months. Now ${fmt(vals[vals.length-1])} vs ${fmt(cb)} budget.`,over?`→ ${Math.round((vals[vals.length-1]/cb-1)*100)}% over — cut here`:`→ Watch before it hits ceiling`);else if(over)add(‘medium’,‘⚡’,`${cat.name} Over Budget`,`${fmt(vals[vals.length-1])} vs ${fmt(cb)}.`,`→ Cut or reallocate ${fmt(vals[vals.length-1]-cb)}`);}
// Giving pace
if(inc>0&&ytdGivingTarget>0&&ytdGiven<ytdGivingTarget*0.9)add(‘medium’,‘🤲’,‘Giving Behind Annual Pace’,`Given ${fmt(ytdGiven)} of ${fmt(ytdGivingTarget)} YTD target. ${fmt(ytdGivingTarget-ytdGiven)} behind.`,`→ Catch up commitment before year end`);
// Debt
if(totalDebt>0&&payoff)add(‘medium’,‘💳’,`${fmt(totalDebt)} Debt — ${payoff.months} Months to Clear`,`${debtStrategy==='avalanche'?'Avalanche':'Snowball'} strategy. ${fmt(Math.round(payoff.totalInterest))} in total interest remaining.`,`→ Extra payment accelerates payoff significantly — check Debt tab`);
// Net worth
const prevNW=nwHistory[mkKey(py,pm)]?.netWorth;if(prevNW&&netWorth>0){const nwChg=netWorth-prevNW;add(nwChg>=0?‘low’:‘medium’,nwChg>=0?‘📈’:‘📉’,`Net Worth ${nwChg>=0?'Growing':'Declining'}`,`${fmt(netWorth)} total. ${nwChg>=0?'+':''}${fmt(nwChg)} vs last month.`,nwChg>=0?`→ On track — visit Net Worth to log snapshot`:`→ Review spending and debt — net worth declining`);}
// Goals
for(const g of goals){const target=parseFloat(g.target)||0,saved=parseFloat(g.saved)||0,pctDone=target>0?(saved/target)*100:0;if(pctDone>=100)continue;if(g.date){const ml=Math.max(1,monthsBetween(T,new Date(g.date)));const needed=(target-saved)/ml;if(needed>tgt.saving*0.5)add(‘medium’,‘🎯’,`Goal: ${g.name} — Needs ${fmt(Math.round(needed))}/mo`,`${Math.round(pctDone)}% saved (${fmt(saved)} of ${fmt(target)}). ${ml} months remaining.`,`→ Allocate ${fmt(Math.round(needed))}/mo from saving bucket`);}}
// Sinking funds shortfall
if(sinkMonthly>tgt.saving*0.3&&tgt.saving>0)add(‘low’,‘🗓’,‘Sinking Fund Reserve Needed’,`Annual irregular expenses require ${fmt(Math.round(sinkMonthly))}/mo reserved.`,`→ Ensure saving bucket covers ${fmt(Math.round(sinkMonthly))}/mo for sinking funds`);
const order={high:0,medium:1,low:2,ok:3};
return ins.sort((a,b)=>(order[a.p]??3)-(order[b.p]??3));
};

// ══════════════════════════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════════════════════════
const Overview=()=>{
const ytdTFSA=ySum.investing.a;const tfsaLeft=Math.max(0,tfsaRoomVal-ytdTFSA);
const incVals=getVals((_,md)=>(parseFloat(base)||0)+(md?.variable||0));
return(
<div>
{/* Income */}
<div style={card}>
<div style={{display:‘flex’,justifyContent:‘space-between’,alignItems:‘flex-start’,marginBottom:14}}>
<div>
<div style={lbl}>Take-Home Income (After Tax)</div>
<div style={{…pd,fontSize:36,fontWeight:700,color:D.t1,marginTop:4,letterSpacing:’-0.5px’}}>{fmt(inc)}<span style={{fontSize:12,color:D.t2,marginLeft:8,...pj}}>CAD</span></div>
<div style={{fontSize:11,color:D.t2,marginTop:3,...pj}}>Base {fmt(baseInc)} + Variable {fmt(vari)}{streamFixedInc+streamVarInc>0?` + Other ${fmt(streamFixedInc+streamVarInc)}`:’’}</div>
<TrendIcon vals={incVals} inv/>
</div>
<div style={{textAlign:‘right’}}>
<div style={lbl}>Unallocated</div>
<div style={{...mono,fontSize:20,fontWeight:700,color:unalloc>=0?D.pos:D.neg,marginTop:4}}>{fmt(unalloc)}</div>
</div>
</div>
<div style={{display:‘grid’,gridTemplateColumns:‘1fr 1fr’,gap:10,marginBottom:10}}>
<div><div style={{...lbl,marginBottom:4}}>Base Salary /mo</div><AmtField val={base} set={setBase}/></div>
<div><div style={{...lbl,marginBottom:4}}>Variable / Commission</div><AmtField val={vari||’’} set={setVar}/></div>
</div>
{streams.map(s=>(
<div key={s.id} style={{marginBottom:10}}>
<div style={{display:‘grid’,gridTemplateColumns:‘1fr 1fr’,gap:8,marginBottom:6}}>
<input value={s.name} onChange={e=>setStreams(p=>p.map(x=>x.id===s.id?{…x,name:e.target.value}:x))} placeholder=“Income name” style={inB}/>
<select value={s.category} onChange={e=>setStreams(p=>p.map(x=>x.id===s.id?{…x,category:e.target.value}:x))} style={{…inB,cursor:‘pointer’}}>
{[‘Employment’,‘Investment’,‘Rental’,‘Other’].map(cat=><option key={cat} value={cat.toLowerCase()}>{cat}</option>)}
</select>
</div>
<div style={{display:‘grid’,gridTemplateColumns:‘auto 1fr 28px’,gap:8,alignItems:‘center’}}>
<button onClick={()=>setStreams(p=>p.map(x=>x.id===s.id?{…x,freq:s.freq===‘fixed’?‘variable’:‘fixed’}:x))}
style={{…smBtn(s.freq===‘variable’,D.acc),fontSize:10,padding:‘6px 10px’,whiteSpace:‘nowrap’}}>
{s.freq===‘variable’?‘↕ Variable’:‘↔ Fixed’}
</button>
<div>
{s.freq===‘fixed’
?<AmtField val={s.amount} set={v=>setStreams(p=>p.map(x=>x.id===s.id?{…x,amount:v}:x))} placeholder=“Monthly amount”/>
:<AmtField val={md.extraIncome?.[s.id]||’’} set={v=>setExtraIncome(s.id,v)} placeholder=“This month”/>
}
<div style={{fontSize:9,color:D.t3,marginTop:3,...pj}}>
{s.freq===‘fixed’?‘Same every month — enter once’:‘Varies monthly — update each month’}
</div>
</div>
<button onClick={()=>setStreams(p=>p.filter(x=>x.id!==s.id))} style={{background:`rgba(${rgb(D.neg)},0.08)`,border:`1px solid rgba(${rgb(D.neg)},0.18)`,borderRadius:7,color:D.neg,width:28,height:28,cursor:‘pointer’,display:‘flex’,alignItems:‘center’,justifyContent:‘center’,fontSize:14,outline:‘none’,flexShrink:0}}>×</button>
</div>
</div>
))}
<button onClick={()=>setStreams(p=>[…p,{id:`s_${Date.now()}`,name:’’,category:‘other’,freq:‘fixed’,amount:’’}])} style={{…smBtn(false,D.acc),width:‘100%’,padding:‘6px 0’,fontSize:11}}>+ Add Income Stream</button>
<div style={{marginTop:10,padding:‘7px 10px’,background:‘rgba(255,255,255,0.02)’,borderRadius:7,fontSize:10,color:D.t2,…pj}}>After-tax only — deduct income tax, CPP, and EI before entering.</div>
</div>

```
  {/* 4 Bucket cards */}
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
    {BKEYS.map(bk=>{
      const color=BC[bk],t=tgt[bk],a=act[bk],s=bst(a,t),pa=pAct[bk];
      const bkVals=getVals((_,md)=>bk==='spending'?sCats.reduce((s,c)=>s+getCatAmt(c.id,md?.actuals||{}),0):bk==='giving'?gCats.reduce((s,c)=>s+(md?.actuals?.[c.id]||0),0):bk==='saving'?vCats.reduce((s,c)=>s+(md?.actuals?.[c.id]||0),0):(md?.actuals?.investing||0));
      return(
        <div key={bk} onClick={()=>{if(bk==='spending')setTab('spending');else if(bk==='giving')setTab('giving');else if(bk==='saving')setTab('saving');}}
          style={{background:`rgba(${rgb(color)},0.04)`,border:`1px solid rgba(${rgb(color)},0.12)`,borderRadius:12,padding:14,cursor:bk!=='investing'?'pointer':'default'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <div style={{...pj,fontSize:13,fontWeight:600,color:D.t1}}>{bk.charAt(0).toUpperCase()+bk.slice(1)}</div>
            <Pill n={`${Math.round(BK[bk]*100)}%`} c={color}/>
          </div>
          <div style={{...pd,fontSize:22,fontWeight:700,color:D.t1}}>{fmt(t)}</div>
          <div style={{fontSize:10,color:D.t2,marginBottom:2}}>target</div>
          <Bar a={a} b={t} c={color} showPct/>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:4}}>
            <div style={{...mono,fontSize:11,color:D.t2}}>{fmt(a)} <TrendIcon vals={bkVals} inv={bk==='saving'||bk==='investing'}/><PatternChip vals={bkVals}/></div>
            <Badge s={s}/>
          </div>
        </div>
      );
    })}
  </div>

  {/* TFSA Room */}
  <div style={{...card,border:`1px solid rgba(${rgb(D.inv)},0.2)`,background:`rgba(${rgb(D.inv)},0.03)`}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
      <div><div style={{...pj,fontSize:14,fontWeight:600,color:D.t1}}>TFSA — 2026 Room</div><div style={{fontSize:10,color:D.t2,marginTop:2}}>Goal: max {fmt(tfsaRoomVal)} · {mLeft} months left</div></div>
      <Pill n="20%" c={D.inv}/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
      {[{l:'Total Room',v:fmt(tfsaRoomVal),c:D.inv},{l:'YTD Contributed',v:fmt(ytdTFSA),c:D.pos},{l:'Room Left',v:fmt(tfsaLeft),c:tfsaLeft===0?D.pos:D.wrn}].map(x=>(
        <div key={x.l} style={{textAlign:'center',padding:'8px 4px',background:'rgba(255,255,255,0.02)',borderRadius:8,border:`1px solid ${D.b1}`}}>
          <div style={lbl}>{x.l}</div><div style={{...mono,fontSize:14,fontWeight:700,color:x.c,marginTop:3}}>{x.v}</div>
        </div>
      ))}
    </div>
    <Bar a={ytdTFSA} b={tfsaRoomVal} c={D.inv} showPct/>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
      <div style={{fontSize:10,color:D.t2}}>{mLeft} months left · {fmt(Math.round(tfsaLeft/mLeft))}/mo to max</div>
      {tfsaLeft===0&&<div style={{fontSize:10,fontWeight:700,color:D.pos}}>✓ Maxed Out</div>}
    </div>
    <div style={{...lbl,marginBottom:4}}>This Month's TFSA Contribution</div>
    <AmtField val={acts.investing||''} set={v=>setA('investing',v)}/>
    <Bar a={acts.investing||0} b={tgt.investing} c={D.inv} showPct/>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
      <div style={{fontSize:10,color:D.t2}}>{fmt(tgt.investing)} monthly target</div>
      <TrendIcon vals={getVals(a=>a?.investing||0)} inv/>
    </div>
    <div style={{...lbl,marginBottom:4}}>Contribution Room</div>
    <div style={{position:'relative'}}><span style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:D.t2,...mono,fontSize:12,pointerEvents:'none'}}>$</span><input type="number" value={tfsaRoom} onChange={e=>setTfsaRoom(e.target.value)} style={{...inB,paddingLeft:20,...mono}}/></div>
  </div>

  {/* Monthly Notes */}
  <div style={card}>
    <div style={{...lbl,marginBottom:6}}>Monthly Notes — {SHORT[mo]} {yr}</div>
    <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Any context for this month — big commission, unusual expense, etc." style={{...inB,resize:'vertical',lineHeight:1.5,fontSize:12,color:D.t2}}/>
  </div>
</div>
);
```

};

// ══════════════════════════════════════════════════════════════
// SPENDING
// ══════════════════════════════════════════════════════════════
const SpendingTab=()=>{
const pctSum=Math.round(sCats.reduce((s,c)=>s+c.pct,0)*100);
const chartData=sCats.map((cat,i)=>({name:cat.name.length>12?cat.name.slice(0,12)+’…’:cat.name,actual:Math.round(getCatAmt(cat.id,acts)),budget:Math.round(tgt.spending*cat.pct),color:CC[i%CC.length]}));
const spendVals=getVals(a=>sCats.reduce((s,c)=>s+getCatAmt(c.id,a),0));
return(
<div>
<div style={card}>
<div style={{display:‘flex’,justifyContent:‘space-between’,alignItems:‘center’}}>
<div><div style={lbl}>Spending Budget</div><div style={{...pd,fontSize:26,fontWeight:700,color:D.t1,marginTop:2}}>{fmt(tgt.spending)}</div></div>
<div style={{textAlign:‘right’}}>
<div style={{fontSize:10,color:D.t2}}>Spent</div>
<div style={{...mono,fontSize:20,fontWeight:700,color:act.spending>tgt.spending?D.neg:D.pos,marginTop:2}}>{fmt(act.spending)}</div>
<div style={{fontSize:10,color:D.t2}}>{fmt(tgt.spending-act.spending)} left</div>
</div>
</div>
<Bar a={act.spending} b={tgt.spending} c={D.sp} showPct/>
<div style={{display:‘flex’,alignItems:‘center’,gap:6,marginTop:-4}}>
<div style={{fontSize:10,color:D.t2}}>vs last month: {fmt(pAct.spending)}</div>
<TrendIcon vals={spendVals}/><PatternChip vals={spendVals}/>
</div>
</div>
<div style={{display:‘flex’,gap:6,marginBottom:10}}>
<button onClick={()=>setSpendView(‘list’)} style={smBtn(spendView===‘list’,D.sp)}>≡ List</button>
<button onClick={()=>setSpendView(‘breakdown’)} style={smBtn(spendView===‘breakdown’,D.inv)}>◉ Breakdown</button>
</div>
{spendView===‘breakdown’&&(
<div style={{marginBottom:10}}>
<div style={card}>
<div style={{...pj,fontSize:13,fontWeight:600,color:D.t1,marginBottom:12}}>Allocation — Budget vs Actual</div>
<div style={{display:‘grid’,gridTemplateColumns:‘1fr 1fr’,gap:12,alignItems:‘center’}}>
<div>
<ResponsiveContainer width="100%" height={160}>
<PieChart><Pie data={chartData.map(d=>({…d,value:d.actual||d.budget}))} cx=“50%” cy=“50%” innerRadius={40} outerRadius={65} dataKey=“value” paddingAngle={2}>
{chartData.map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
</Pie><Tooltip contentStyle={TS} formatter={(v,n,p)=>[fmt(v),p.payload.name]}/></PieChart>
</ResponsiveContainer>
</div>
<div>{chartData.map((d,i)=><div key={d.name} style={{display:‘flex’,alignItems:‘center’,gap:5,marginBottom:4}}><div style={{width:7,height:7,borderRadius:1,background:CC[i%CC.length],flexShrink:0}}/><div style={{flex:1,fontSize:10,color:D.t2,…pj,overflow:‘hidden’,textOverflow:‘ellipsis’,whiteSpace:‘nowrap’}}>{d.name}</div><div style={{...mono,fontSize:10,color:D.t1}}>{Math.round((d.budget/tgt.spending)*100)}%</div></div>)}</div>
</div>
</div>
<div style={card}>
<div style={{...pj,fontSize:13,fontWeight:600,color:D.t1,marginBottom:10}}>Budget vs Actual</div>
<ResponsiveContainer width="100%" height={190}>
<BarChart data={chartData} barCategoryGap="25%" barGap={2}>
<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
<XAxis dataKey="name" tick={{fontSize:9,fill:D.t2}} axisLine={false} tickLine={false}/>
<YAxis tick={{fontSize:9,fill:D.t2}} axisLine={false} tickLine={false} tickFormatter={v=>fmtK(v)}/>
<Tooltip contentStyle={TS} formatter={(v,n)=>[fmt(v),n===‘budget’?‘Budget’:‘Actual’]}/>
<Bar dataKey="budget" fill="rgba(255,255,255,0.06)" radius={[3,3,0,0]} name="budget"/>
<Bar dataKey="actual" radius={[3,3,0,0]} name="actual">{chartData.map((d,i)=><Cell key={i} fill={d.actual>d.budget?D.neg:CC[i%CC.length]}/>)}</Bar>
</BarChart>
</ResponsiveContainer>
</div>
</div>
)}
{spendView===‘list’&&sCats.map(cat=>{
const cb=tgt.spending*cat.pct,subItems=acts[cat.id+’_items’]||[],hasItems=subItems.length>0;
const ca=hasItems?subItems.reduce((s,i)=>s+(i.amount||0),0):(acts[cat.id]||0);
const prevCa=getCatAmt(cat.id,pActs),isOpen=open.has(cat.id),hasRec=subItems.some(i=>i.recurring);
const vals=catVals(cat.id);
return(
<div key={cat.id} style={{…card,padding:‘13px 14px’}}>
<div style={{display:‘flex’,justifyContent:‘space-between’,alignItems:‘flex-start’,gap:8}}>
<div style={{flex:1}}>
{edit?<input value={cat.name} onChange={e=>setSCats(p=>p.map(c=>c.id===cat.id?{…c,name:e.target.value}:c))} style={{…inB,marginBottom:4}}/>
:<div style={{...pj,fontSize:13,fontWeight:600,color:D.t1}}>{cat.name}{hasRec&&<span style={{marginLeft:5,fontSize:9,color:D.pos,fontWeight:700}}>↺</span>}</div>}
{edit?<div style={{display:‘flex’,alignItems:‘center’,gap:5,marginTop:3}}><span style={{fontSize:10,color:D.t2}}>Alloc:</span><input type=“number” value={Math.round(cat.pct*100)} onChange={e=>setSCats(p=>p.map(c=>c.id===cat.id?{…c,pct:(parseFloat(e.target.value)||0)/100}:c))} style={{…inB,width:44,…mono,fontSize:11,padding:‘2px 5px’}}/><span style={{fontSize:10,color:D.t2}}>% = {fmt(cb)}</span></div>
:<div style={{fontSize:10,color:D.t2,marginTop:2}}>{Math.round(cat.pct*100)}% · {fmt(cb)} target<TrendIcon vals={vals}/><PatternChip vals={vals}/></div>}
</div>
<div style={{display:‘flex’,alignItems:‘center’,gap:5,flexShrink:0}}>
{hasItems?<div style={{...mono,fontSize:14,fontWeight:700,color:ca>cb?D.neg:D.pos,minWidth:76,textAlign:‘right’}}>{fmt(ca)}</div>:<AmtField val={ca||’’} set={v=>setA(cat.id,v)} narrow/>}
<button onClick={()=>toggleOpen(cat.id)} style={{…smBtn(isOpen,D.pos),fontSize:10,padding:‘4px 8px’}}>{isOpen?‘▲’:hasItems?`▼ ${subItems.length}`:’+ items’}</button>
</div>
</div>
<Bar a={ca} b={cb} c={D.sp} showPct/>
<div style={{display:‘flex’,justifyContent:‘space-between’,alignItems:‘center’}}>
<div style={{...mono,fontSize:10,color:D.t2}}>{fmt(cb-ca)} remaining</div>
<Badge s={bst(ca,cb)}/>
</div>
{ca>0&&prevCa>0&&<MicroInsight text={`${ca>prevCa?'↑ Up':'↓ Down'} ${fmt(Math.abs(ca-prevCa))} (${Math.round(Math.abs((ca-prevCa)/prevCa)*100)}%) vs last month`} type={ca>prevCa?‘warn’:‘good’}/>}
{isOpen&&(
<div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${D.b1}`}}>
{subItems.length===0&&<div style={{fontSize:11,color:D.t2,marginBottom:8,textAlign:‘center’}}>No items yet.</div>}
{subItems.map(item=>(
<div key={item.id} style={{display:‘grid’,gridTemplateColumns:‘1fr 104px 26px 26px’,gap:5,alignItems:‘center’,marginBottom:7}}>
<input value={item.name} onChange={e=>updItem(cat.id,item.id,‘name’,e.target.value)} placeholder=“e.g. Netflix, Hydro” style={inB}/>
<div style={{position:‘relative’}}><span style={{position:‘absolute’,left:8,top:‘50%’,transform:‘translateY(-50%)’,color:D.t2,…mono,fontSize:11,pointerEvents:‘none’}}>$</span><input type=“number” value={item.amount||’’} onChange={e=>updItem(cat.id,item.id,‘amount’,e.target.value)} placeholder=“0” style={{…inB,paddingLeft:18,…mono,fontSize:11}}/></div>
<button onClick={()=>togRec(cat.id,item.id)} title={item.recurring?‘Recurring — click to disable’:‘Mark recurring’} style={{…smBtn(item.recurring,D.pos),width:26,height:26,padding:0,display:‘flex’,alignItems:‘center’,justifyContent:‘center’,fontSize:11}}>↺</button>
<button onClick={()=>delItem(cat.id,item.id)} style={{background:`rgba(${rgb(D.neg)},0.08)`,border:`1px solid rgba(${rgb(D.neg)},0.15)`,borderRadius:6,color:D.neg,fontSize:13,width:26,height:26,cursor:‘pointer’,display:‘flex’,alignItems:‘center’,justifyContent:‘center’,outline:‘none’}}>×</button>
</div>
))}
{subItems.length>1&&<div style={{display:‘flex’,justifyContent:‘flex-end’,gap:5,marginBottom:6,paddingRight:57}}><span style={{fontSize:10,color:D.t2}}>Subtotal</span><span style={{...mono,fontSize:12,fontWeight:700,color:D.pos}}>{fmt(ca)}</span></div>}
<button onClick={()=>addItem(cat.id)} style={{width:‘100%’,padding:‘6px 0’,background:`rgba(${rgb(D.pos)},0.04)`,border:`1px dashed rgba(${rgb(D.pos)},0.2)`,borderRadius:7,color:D.pos,fontSize:11,fontWeight:600,cursor:‘pointer’,outline:‘none’}}>+ Add Item</button>
<div style={{marginTop:5,fontSize:9,color:D.t2,textAlign:‘center’}}>↺ marks item recurring — auto-fills next month</div>
</div>
)}
</div>
);
})}
<button onClick={()=>setEdit(!edit)} style={{width:‘100%’,padding:‘9px’,borderRadius:9,border:`1px solid ${edit?`rgba(${rgb(D.pos)},0.3)`:D.b1}`,background:edit?`rgba(${rgb(D.pos)},0.07)`:D.s1,color:edit?D.pos:D.t2,fontSize:12,fontWeight:600,cursor:‘pointer’,marginTop:4,outline:‘none’}}>{edit?‘✓ Done Editing’:‘⚙ Edit Categories & Allocations’}</button>
{edit&&pctSum!==100&&<div style={{marginTop:7,padding:‘9px 12px’,background:`rgba(${rgb(D.neg)},0.07)`,border:`1px solid rgba(${rgb(D.neg)},0.2)`,borderRadius:9,fontSize:11,color:D.neg}}>⚠ Allocations total {pctSum}% — must equal 100%</div>}
</div>
);
};

// ══════════════════════════════════════════════════════════════
// GIVING
// ══════════════════════════════════════════════════════════════
const GivingTab=()=>{
const ytdPct=ytdGivingTarget>0?(ytdGiven/ytdGivingTarget)*100:0;
const givingVals=getVals(a=>gCats.reduce((s,c)=>s+(a[c.id]||0),0));
const annualCommitment=ySum.giving.t;
const onPace=ytdGiven>=ytdGivingTarget*0.9;
return(
<div>
<div style={{…card,border:`1px solid rgba(${rgb(D.gv)},0.2)`}}>
<div style={{display:‘flex’,justifyContent:‘space-between’,alignItems:‘center’,marginBottom:4}}>
<div><div style={{...pj,fontSize:15,fontWeight:700,color:D.t1}}>Giving</div><div style={{fontSize:10,color:D.t2,marginTop:2}}>10% commitment</div></div>
<div style={{display:‘flex’,gap:7,alignItems:‘center’}}><Pill n="10%" c={D.gv}/><span style={{...mono,fontSize:12,color:D.gv}}>{fmt(tgt.giving)}/mo</span></div>
</div>
<Bar a={act.giving} b={tgt.giving} c={D.gv} showPct/>
<div style={{...mono,fontSize:11,color:D.t2,marginBottom:12}}>{fmt(act.giving)} given · {fmt(tgt.giving-act.giving)} remaining <TrendIcon vals={givingVals} inv/></div>
{gCats.map(cat=>{const cb=tgt.giving*cat.pct,ca=acts[cat.id]||0;return(
<div key={cat.id} style={{marginBottom:8,padding:‘11px 13px’,background:`rgba(${rgb(D.gv)},0.04)`,border:`1px solid rgba(${rgb(D.gv)},0.10)`,borderRadius:9}}>
<div style={{display:‘flex’,justifyContent:‘space-between’,alignItems:‘center’,marginBottom:7}}>
<div><div style={{...pj,fontSize:13,fontWeight:600,color:D.t1}}>{cat.name}</div><div style={{fontSize:10,color:D.t2,marginTop:1}}>{Math.round(cat.pct*100)}% · {fmt(cb)}</div></div>
<AmtField val={ca||’’} set={v=>setA(cat.id,v)} narrow/>
</div>
<Bar a={ca} b={cb} c={D.gv} showPct/>
</div>
);})}
</div>

```
  {/* YTD Accountability */}
  <div style={{...card,border:`1px solid rgba(${rgb(D.gv)},0.15)`,background:`rgba(${rgb(D.gv)},0.02)`}}>
    <div style={{...pj,fontSize:14,fontWeight:600,color:D.t1,marginBottom:4}}>{yr} Giving Accountability</div>
    <div style={{fontSize:10,color:D.t2,marginBottom:12}}>Year-to-date: {SHORT[mo]} — tracking faithfulness to the 10% commitment</div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
      <div style={{textAlign:'center',padding:'8px 4px',background:'rgba(255,255,255,0.02)',borderRadius:8,border:`1px solid ${D.b1}`}}><div style={lbl}>YTD Given</div><div style={{...pd,fontSize:16,fontWeight:700,color:D.gv,marginTop:3}}>{fmt(ytdGiven)}</div></div>
      <div style={{textAlign:'center',padding:'8px 4px',background:'rgba(255,255,255,0.02)',borderRadius:8,border:`1px solid ${D.b1}`}}><div style={lbl}>YTD Target</div><div style={{...pd,fontSize:16,fontWeight:700,color:D.t1,marginTop:3}}>{fmt(ytdGivingTarget)}</div></div>
      <div style={{textAlign:'center',padding:'8px 4px',background:'rgba(255,255,255,0.02)',borderRadius:8,border:`1px solid ${D.b1}`}}><div style={lbl}>Pace</div><div style={{...pd,fontSize:16,fontWeight:700,color:onPace?D.pos:D.neg,marginTop:3}}>{Math.round(ytdPct)}%</div></div>
    </div>
    <Bar a={ytdGiven} b={ytdGivingTarget} c={D.gv} showPct/>
    {!onPace&&ytdGivingTarget>0&&<MicroInsight text={`Behind by ${fmt(Math.round(ytdGivingTarget-ytdGiven))} YTD — ${fmt(Math.round((ytdGivingTarget-ytdGiven)/Math.max(1,12-mo)))}/mo to catch up`} type="warn"/>}
    {onPace&&ytdGiven>0&&<MicroInsight text="On pace for annual giving commitment ✓" type="good"/>}
    <div style={{marginTop:10,padding:'8px 12px',background:'rgba(255,255,255,0.02)',borderRadius:8,border:`1px solid ${D.b1}`,display:'flex',justifyContent:'space-between'}}>
      <div style={{fontSize:11,color:D.t2,...pj}}>Full-year commitment (projected)</div>
      <div style={{...mono,fontSize:12,fontWeight:700,color:D.gv}}>{fmt(Math.round(annualCommitment))}</div>
    </div>
  </div>
</div>
);
```

};

// ══════════════════════════════════════════════════════════════
// SAVING
// ══════════════════════════════════════════════════════════════
const SavingTab=()=>{
const savingVals=getVals(a=>vCats.reduce((s,c)=>s+(a[c.id]||0),0));
const addGoal=()=>setGoals(p=>[…p,{id:`g_${Date.now()}`,name:’’,target:’’,saved:’’,date:’’}]);
const updGoal=(id,f,v)=>setGoals(p=>p.map(g=>g.id===id?{…g,[f]:v}:g));
const delGoal=id=>setGoals(p=>p.filter(g=>g.id!==id));
const addSink=()=>setSinks(p=>[…p,{id:`sf_${Date.now()}`,name:’’,annual:’’}]);
const updSink=(id,f,v)=>setSinks(p=>p.map(s=>s.id===id?{…s,[f]:v}:s));
const delSink=id=>setSinks(p=>p.filter(s=>s.id!==id));
return(
<div>
{/* Saving summary */}
<div style={{…card,border:`1px solid rgba(${rgb(D.sv)},0.2)`}}>
<div style={{display:‘flex’,justifyContent:‘space-between’,alignItems:‘center’,marginBottom:4}}>
<div><div style={{...pj,fontSize:15,fontWeight:700,color:D.t1}}>Saving</div></div>
<div style={{display:‘flex’,gap:7,alignItems:‘center’}}><Pill n="15%" c={D.sv}/><span style={{...mono,fontSize:12,color:D.sv}}>{fmt(tgt.saving)}/mo</span></div>
</div>
<Bar a={act.saving} b={tgt.saving} c={D.sv} showPct/>
<div style={{...mono,fontSize:11,color:D.t2,marginBottom:12}}>{fmt(act.saving)} of {fmt(tgt.saving)} · {fmt(tgt.saving-act.saving)} remaining <TrendIcon vals={savingVals} inv/></div>
{vCats.map(cat=>{const cb=tgt.saving*cat.pct,ca=acts[cat.id]||0;return(
<div key={cat.id} style={{marginBottom:8,padding:‘11px 13px’,background:`rgba(${rgb(D.sv)},0.04)`,border:`1px solid rgba(${rgb(D.sv)},0.10)`,borderRadius:9}}>
<div style={{display:‘flex’,justifyContent:‘space-between’,alignItems:‘center’,marginBottom:7}}>
<div><div style={{...pj,fontSize:13,fontWeight:600,color:D.t1}}>{cat.name}</div><div style={{fontSize:10,color:D.t2,marginTop:1}}>{Math.round(cat.pct*100)}% · {fmt(cb)}</div></div>
<AmtField val={ca||’’} set={v=>setA(cat.id,v)} narrow/>
</div>
<Bar a={ca} b={cb} c={D.sv} showPct/>
</div>
);})}
</div>

```
  {/* Emergency Fund */}
  <div style={{...card,border:`1px solid rgba(${rgb(D.sv)},0.2)`,background:`rgba(${rgb(D.sv)},0.02)`}}>
    <div style={{...pj,fontSize:14,fontWeight:600,color:D.t1,marginBottom:4}}>Emergency Fund Goal</div>
    <div style={{fontSize:10,color:D.t2,marginBottom:12}}>Target: {emerGoal.months}mo × {fmt(avgExp)}/mo avg expenses = <span style={{color:D.sv,...mono,fontWeight:700}}>{fmt(emerTgt)}</span></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:10}}>
      {[3,6,9,12].map(m=><button key={m} onClick={()=>setEmerGoal(g=>({...g,months:m}))} style={smBtn(emerGoal.months===m,D.sv)}>{m}mo</button>)}
    </div>
    <div style={{marginBottom:10}}><div style={{...lbl,marginBottom:4}}>Current Balance</div><AmtField val={emerGoal.balance} set={v=>setEmerGoal(g=>({...g,balance:v}))}/></div>
    <Bar a={emerBal} b={emerTgt} c={D.sv} showPct/>
    <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
      <div style={{...mono,fontSize:10,color:D.t2}}>{fmt(emerBal)} of {fmt(emerTgt)}</div>
      <div style={{...mono,fontSize:11,fontWeight:700,color:emerPct>=100?D.pos:emerPct>=50?D.wrn:D.neg}}>{Math.round(emerPct)}% funded</div>
    </div>
    {emerBal<emerTgt&&<MicroInsight text={`${fmt(emerTgt-emerBal)} more to reach ${emerGoal.months}-month safety net${act.saving>0?` · ~${Math.ceil((emerTgt-emerBal)/act.saving)} months at current rate`:''}`} type={emerPct<50?'bad':'warn'}/>}
  </div>

  {/* Savings Goals */}
  <div style={card}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
      <div style={{...pj,fontSize:14,fontWeight:600,color:D.t1}}>Savings Goals</div>
      <div style={{fontSize:10,color:D.t2,...mono}}>Monthly needed: {fmt(Math.round(goalMonthly))}</div>
    </div>
    {goals.length===0&&<div style={{fontSize:11,color:D.t2,textAlign:'center',padding:'12px 0'}}>No goals yet. Add your first one below.</div>}
    {goals.map(g=>{
      const target=parseFloat(g.target)||0,saved=parseFloat(g.saved)||0,pctDone=target>0?(saved/target)*100:0;
      const ml=g.date?Math.max(1,monthsBetween(T,new Date(g.date))):null;
      const needed=ml&&target>saved?(target-saved)/ml:0;
      return(
        <div key={g.id} style={{marginBottom:10,padding:'12px',background:D.s2,border:`1px solid ${D.b2}`,borderRadius:9}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
            <input value={g.name} onChange={e=>updGoal(g.id,'name',e.target.value)} placeholder="Goal name (e.g. Wedding)" style={inB}/>
            <input type="date" value={g.date} onChange={e=>updGoal(g.id,'date',e.target.value)} style={{...inB,...mono,fontSize:12}}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
            <div><div style={{...lbl,marginBottom:3}}>Target</div><AmtField val={g.target} set={v=>updGoal(g.id,'target',v)}/></div>
            <div><div style={{...lbl,marginBottom:3}}>Saved So Far</div><AmtField val={g.saved} set={v=>updGoal(g.id,'saved',v)}/></div>
          </div>
          {target>0&&<><Bar a={saved} b={target} c={D.sv} showPct/><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{...mono,fontSize:10,color:D.t2}}>{fmt(saved)} of {fmt(target)} · {Math.round(pctDone)}%</div>{needed>0&&<div style={{fontSize:10,color:D.sv,...mono}}>{fmt(Math.round(needed))}/mo needed</div>}</div>{ml&&needed>tgt.saving*0.4&&<MicroInsight text={`Requires ${fmt(Math.round(needed))}/mo — ${Math.round(needed/tgt.saving*100)}% of your saving bucket`} type="warn"/>}</>}
          <button onClick={()=>delGoal(g.id)} style={{marginTop:8,fontSize:10,color:D.neg,...pj,background:'none',border:'none',cursor:'pointer',padding:0}}>Remove goal</button>
        </div>
      );
    })}
    <button onClick={addGoal} style={{width:'100%',padding:'8px 0',background:`rgba(${rgb(D.sv)},0.04)`,border:`1px dashed rgba(${rgb(D.sv)},0.2)`,borderRadius:8,color:D.sv,fontSize:12,fontWeight:600,cursor:'pointer',outline:'none'}}>+ Add Goal</button>
  </div>

  {/* Sinking Funds */}
  <div style={card}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
      <div style={{...pj,fontSize:14,fontWeight:600,color:D.t1}}>Sinking Funds</div>
      <div style={{fontSize:10,color:D.t2}}>Irregular annual expenses</div>
    </div>
    <div style={{fontSize:10,color:D.t2,marginBottom:12}}>Reserve monthly to avoid lump-sum surprises · Total monthly reserve: <span style={{color:D.sv,...mono,fontWeight:600}}>{fmt(Math.round(sinkMonthly))}</span></div>
    {sinks.length===0&&<div style={{fontSize:11,color:D.t2,textAlign:'center',padding:'10px 0'}}>No sinking funds yet.</div>}
    {sinks.map(sf=>{const annual=parseFloat(sf.annual)||0,monthly=annual/12;return(
      <div key={sf.id} style={{display:'grid',gridTemplateColumns:'1fr 110px 28px',gap:8,alignItems:'center',marginBottom:8}}>
        <input value={sf.name} onChange={e=>updSink(sf.id,'name',e.target.value)} placeholder="e.g. Car Insurance, Christmas" style={inB}/>
        <div>
          <AmtField val={sf.annual} set={v=>updSink(sf.id,'annual',v)}/>
          {annual>0&&<div style={{fontSize:9,color:D.t2,...mono,marginTop:2}}>{fmt(Math.round(monthly))}/mo</div>}
        </div>
        <button onClick={()=>delSink(sf.id)} style={{background:`rgba(${rgb(D.neg)},0.08)`,border:`1px solid rgba(${rgb(D.neg)},0.15)`,borderRadius:6,color:D.neg,fontSize:13,width:28,height:28,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',outline:'none'}}>×</button>
      </div>
    );})}
    <button onClick={addSink} style={{width:'100%',padding:'7px 0',background:`rgba(${rgb(D.sv)},0.04)`,border:`1px dashed rgba(${rgb(D.sv)},0.2)`,borderRadius:8,color:D.sv,fontSize:12,fontWeight:600,cursor:'pointer',outline:'none',marginTop:4}}>+ Add Sinking Fund</button>
  </div>

  {/* RRSP */}
  <div style={{...card,border:`1px solid rgba(${rgb(D.pos)},0.2)`,background:`rgba(${rgb(D.pos)},0.02)`}}>
    <div style={{...pj,fontSize:14,fontWeight:600,color:D.t1,marginBottom:4}}>RRSP</div>
    <div style={{fontSize:10,color:D.t2,marginBottom:12}}>Pre-budget deduction — contributions come off gross pay before take-home</div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
      <div><div style={{...lbl,marginBottom:3}}>Employee Contribution %</div><div style={{position:'relative'}}><input type="number" value={rrspData.empPct} onChange={e=>setRrspData(p=>({...p,empPct:e.target.value}))} style={{...inB,paddingRight:20,...mono}}/><span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',color:D.t2,fontSize:12}}>%</span></div></div>
      <div><div style={{...lbl,marginBottom:3}}>Employer Match %</div><div style={{position:'relative'}}><input type="number" value={rrspData.matchPct} onChange={e=>setRrspData(p=>({...p,matchPct:e.target.value}))} style={{...inB,paddingRight:20,...mono}}/><span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',color:D.t2,fontSize:12}}>%</span></div></div>
      <div><div style={{...lbl,marginBottom:3}}>2026 Contribution Room</div><AmtField val={rrspData.room} set={v=>setRrspData(p=>({...p,room:v}))}/></div>
      <div><div style={{...lbl,marginBottom:3}}>YTD Contributions</div><AmtField val={rrspData.ytd} set={v=>setRrspData(p=>({...p,ytd:v}))}/></div>
    </div>
    {(rrspEmpMo>0||rrspMatchMo>0)&&(
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
        {[{l:'Your /mo',v:fmt(Math.round(rrspEmpMo)),c:D.pos},{l:'Employer /mo',v:fmt(Math.round(rrspMatchMo)),c:D.sv},{l:'Total /mo',v:fmt(Math.round(rrspTotalMo)),c:D.acc}].map(x=><div key={x.l} style={{textAlign:'center',padding:'8px 4px',background:'rgba(255,255,255,0.02)',borderRadius:8,border:`1px solid ${D.b1}`}}><div style={lbl}>{x.l}</div><div style={{...mono,fontSize:13,fontWeight:700,color:x.c,marginTop:3}}>{x.v}</div></div>)}
      </div>
    )}
    {rrspRoomVal>0&&<><Bar a={rrspYTDVal} b={rrspRoomVal} c={D.pos} showPct/><div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><div style={{...mono,fontSize:10,color:D.t2}}>{fmt(rrspYTDVal)} contributed · {fmt(rrspRoomLeft)} room left</div></div></>}
    <div><div style={{...lbl,marginBottom:3}}>RRSP Account Balance</div><AmtField val={rrspData.balance} set={v=>setRrspData(p=>({...p,balance:v}))}/></div>
  </div>
</div>
);
```

};

// ══════════════════════════════════════════════════════════════
// ANNUAL
// ══════════════════════════════════════════════════════════════
const Annual=()=>{
const chartD=aRows.map(r=>({name:r.m,income:Math.round(r.inc),spending:Math.round(r.spending.a),saving:Math.round(r.saving.a),investing:Math.round(r.investing.a)}));
return(
<div>
<div style={{display:‘grid’,gridTemplateColumns:‘1fr 1fr’,gap:8,marginBottom:10}}>
{[{l:‘Annual Income’,v:fmt(ySum.inc),c:D.t1},{l:‘Total Invested’,v:fmt(ySum.investing.a),c:D.inv,sub:`of ${fmt(ySum.investing.t)}`},{l:‘Total Saved’,v:fmt(ySum.saving.a),c:D.sv,sub:`of ${fmt(ySum.saving.t)}`},{l:‘Total Given’,v:fmt(ySum.giving.a),c:D.gv,sub:`of ${fmt(ySum.giving.t)}`}].map(x=>(
<div key={x.l} style={{...card,padding:12,marginBottom:0}}><div style={lbl}>{x.l}</div><div style={{...pd,fontSize:20,fontWeight:700,color:x.c,marginTop:3}}>{x.v}</div>{x.sub&&<div style={{fontSize:10,color:D.t2,marginTop:1}}>{x.sub}</div>}</div>
))}
</div>
<div style={{...card,marginBottom:10}}>
<div style={{...pj,fontSize:13,fontWeight:600,color:D.t1,marginBottom:10}}>{yr} Cash Flow</div>
<ResponsiveContainer width="100%" height={170}>
<BarChart data={chartD} barCategoryGap="35%" barGap={2}>
<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
<XAxis dataKey="name" tick={{fontSize:9,fill:D.t2}} axisLine={false} tickLine={false}/>
<YAxis tick={{fontSize:9,fill:D.t2}} axisLine={false} tickLine={false} tickFormatter={v=>fmtK(v)}/>
<Tooltip contentStyle={TS} formatter={(v,n)=>[fmt(v),n.charAt(0).toUpperCase()+n.slice(1)]}/>
<Bar dataKey="income" fill="rgba(255,255,255,0.07)" radius={[3,3,0,0]}/>
<Bar dataKey="spending" fill={D.sp} radius={[3,3,0,0]} fillOpacity={0.7}/>
</BarChart>
</ResponsiveContainer>
</div>
<div style={{…card,padding:‘13px 0’,overflowX:‘auto’}}>
<div style={{padding:‘0 14px 8px’,…pj,fontSize:13,fontWeight:600,color:D.t1}}>{yr} — Month by Month</div>
<div style={{minWidth:490}}>
<div style={{display:‘grid’,gridTemplateColumns:‘46px 78px repeat(4,1fr)’,padding:‘0 14px 7px’,borderBottom:`1px solid ${D.b1}`}}>{[’’,‘Income’,‘Saving’,‘Spending’,‘Giving’,‘Investing’].map(h=><div key={h} style={lbl}>{h}</div>)}</div>
{aRows.map((row,i)=>{const cur=i===mo&&yr===T.getFullYear();return(
<div key={row.m} onClick={()=>{setMo(i);setTab(‘overview’);}} style={{display:‘grid’,gridTemplateColumns:‘46px 78px repeat(4,1fr)’,padding:‘8px 14px’,cursor:‘pointer’,background:cur?‘rgba(255,255,255,0.025)’:‘transparent’,borderLeft:cur?`2px solid ${D.sp}`:‘2px solid transparent’,transition:‘background 0.15s’}}>
<div style={{...pj,fontSize:12,fontWeight:600,color:cur?D.sp:D.t2}}>{row.m}</div>
<div style={{...mono,fontSize:11,color:D.t2}}>{row.inc>0?fmt(row.inc):’—’}</div>
{BKEYS.map(bk=><div key={bk}><div style={{...mono,fontSize:11,color:row[bk].a>0?BC[bk]:’#2A2A2A’}}>{row[bk].a>0?fmt(row[bk].a):’—’}</div>{row[bk].a>0&&<div style={{fontSize:9,color:D.t3}}>{fmt(row[bk].t)}</div>}</div>)}
</div>
);})}
<div style={{display:‘grid’,gridTemplateColumns:‘46px 78px repeat(4,1fr)’,padding:‘9px 14px’,borderTop:`1px solid ${D.b1}`,background:‘rgba(255,255,255,0.02)’}}>
<div style={{...lbl,fontSize:9}}>YTD</div><div style={{...mono,fontSize:11,fontWeight:700,color:D.t1}}>{fmt(ySum.inc)}</div>
{BKEYS.map(bk=><div key={bk}><div style={{...mono,fontSize:11,fontWeight:700,color:BC[bk]}}>{fmt(ySum[bk].a)}</div><div style={{fontSize:9,color:D.t3}}>{fmt(ySum[bk].t)}</div></div>)}
</div>
</div>
</div>
</div>
);
};

// ══════════════════════════════════════════════════════════════
// PORTFOLIO
// ══════════════════════════════════════════════════════════════
const PortfolioTab=()=>{
const valid=positions.filter(p=>(parseFloat(p.shares)||0)>0&&(parseFloat(p.currentPrice)||0)>0);
const pieData=valid.map(p=>({name:p.ticker,value:Math.round(posCAD(p))}));
const sectorMap=positions.reduce((acc,p)=>{const cat=p.category||‘Other’,v=posCAD(p);if(v>0)acc[cat]=(acc[cat]||0)+v;return acc;},{});
const sectorData=Object.entries(sectorMap).map(([name,value])=>({name,value:Math.round(value)})).sort((a,b)=>b.value-a.value);
const pnlHoriz=valid.map(p=>({name:p.ticker,pnl:Math.round(posCAD(p)-posCostCAD(p)),pct:posCostCAD(p)>0?((posCAD(p)-posCostCAD(p))/posCostCAD(p)*100):0})).sort((a,b)=>b.pnl-a.pnl);
const cadExp=positions.filter(p=>p.currency===‘CAD’).reduce((s,p)=>s+posCAD(p),0);
const usdExp=positions.filter(p=>p.currency===‘USD’).reduce((s,p)=>s+posCAD(p),0);
const totalExp=cadExp+usdExp;
const cadPct=totalExp>0?(cadExp/totalExp)*100:0;
const togPos=id=>setExpandedPos(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
const addPos=()=>setPositions(p=>[…p,{id:`pos_${Date.now()}`,ticker:’’,name:’’,category:’’,currency:‘CAD’,shares:0,avgCost:0,currentPrice:0,thesis:’’}]);
const delPos=id=>setPositions(p=>p.filter(x=>x.id!==id));
const CC2=[’#5BB8D4’,’#9B7FD4’,’#4CAF7A’,’#C9A96E’,’#D45C5C’,’#72C49A’,’#D4986A’,’#7AB8D4’,’#B47FD4’,’#A4C46A’];

```
return(
<div>
  {/* Hero */}
  <div style={{...card,background:`linear-gradient(135deg, ${D.s3} 0%, ${D.s2} 60%, ${D.s1} 100%)`,border:`1px solid ${D.b2}`,marginBottom:12}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
      <div>
        <div style={{...lbl,marginBottom:6}}>Total Portfolio Value</div>
        <div style={{...pd,fontSize:42,fontWeight:400,color:D.t1,lineHeight:1,letterSpacing:'0.05em'}}>{fmt(portTotal)}</div>
        <div style={{fontSize:10,color:D.t2,marginTop:4,...pj}}>CAD · FX {fxVal.toFixed(4)} · {valid.length} active positions</div>
      </div>
      <div style={{textAlign:'right'}}>
        <div style={{...lbl,marginBottom:4}}>Total Return</div>
        <div style={{...pd,fontSize:28,fontWeight:400,color:portPnL>=0?D.pos:D.neg,lineHeight:1,letterSpacing:'0.04em'}}>{portPnL>=0?'+':''}{fmt(portPnL)}</div>
        <div style={{...mono,fontSize:12,color:portPnL>=0?D.pos:D.neg,marginTop:3}}>{portPnLPct>=0?'+':''}{portPnLPct.toFixed(2)}%</div>
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
      {[{l:'Cost Basis',v:fmt(portCost)},{l:'CAD Exposure',v:`${cadPct.toFixed(0)}%`},{l:'USD Exposure',v:`${(100-cadPct).toFixed(0)}%`}].map(x=>(
        <div key={x.l} style={{padding:'8px 12px',background:'rgba(255,255,255,0.03)',borderRadius:8,border:`1px solid ${D.b1}`}}>
          <div style={{...lbl,marginBottom:3}}>{x.l}</div>
          <div style={{...mono,fontSize:14,fontWeight:700,color:D.t1}}>{x.v}</div>
        </div>
      ))}
    </div>
  </div>

  {/* FX + Refresh */}
  <div style={{...card,marginBottom:12}}>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,alignItems:'flex-end'}}>
      <div>
        <div style={{...lbl,marginBottom:6}}>USD / CAD Rate</div>
        <div style={{position:'relative'}}><input type="number" value={fxRate} onChange={e=>setFxRate(e.target.value)} style={{...inB,...mono}} step="0.0001"/></div>
      </div>
      <div>
        <button onClick={refreshPrices} disabled={refreshing} style={{width:'100%',padding:'10px',borderRadius:9,border:`1px solid ${refreshing?D.b2:`rgba(${rgb(D.acc)},0.35)`}`,background:refreshing?D.s2:`rgba(${rgb(D.acc)},0.09)`,color:refreshing?D.t2:D.acc,fontSize:12,fontWeight:700,cursor:refreshing?'not-allowed':'pointer',outline:'none',...pj,letterSpacing:'0.02em',transition:'all 0.2s'}}>
          {refreshing?'⟳ Refreshing...':'⟳  Refresh Live Prices'}
        </button>
        {lastRefresh&&<div style={{fontSize:9,color:D.t3,textAlign:'center',marginTop:4,...mono}}>Updated {lastRefresh}</div>}
      </div>
    </div>
  </div>

  {/* Currency exposure bar */}
  {totalExp>0&&(
    <div style={{...card,marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <div style={{...pj,fontSize:12,fontWeight:600,color:D.t1}}>Currency Exposure</div>
        <div style={{display:'flex',gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:8,height:8,borderRadius:2,background:D.sv}}/><span style={{fontSize:10,color:D.t2}}>CAD {cadPct.toFixed(0)}%</span></div>
          <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:8,height:8,borderRadius:2,background:D.inv}}/><span style={{fontSize:10,color:D.t2}}>USD {(100-cadPct).toFixed(0)}%</span></div>
        </div>
      </div>
      <div style={{height:8,borderRadius:99,overflow:'hidden',background:D.s3,display:'flex'}}>
        <div style={{width:`${cadPct}%`,background:D.sv,transition:'width 0.4s ease'}}/>
        <div style={{flex:1,background:D.inv}}/>
      </div>
    </div>
  )}

  {/* Allocation charts — always visible */}
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
    <div style={card}>
      <div style={{...pj,fontSize:12,fontWeight:600,color:D.t1,marginBottom:10}}>By Position</div>
      {pieData.length>0?(
        <>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
                {pieData.map((_,i)=><Cell key={i} fill={CC2[i%CC2.length]}/>)}
              </Pie>
              <Tooltip contentStyle={TS} formatter={(v,n,p)=>[fmt(v),p.payload.name]}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{display:'flex',flexDirection:'column',gap:4,marginTop:8}}>
            {pieData.map((d,i)=>(
              <div key={d.name} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{width:7,height:7,borderRadius:2,background:CC2[i%CC2.length],flexShrink:0}}/>
                  <span style={{fontSize:11,color:D.t2,...pj}}>{d.name}</span>
                </div>
                <span style={{...mono,fontSize:11,color:D.t1,fontWeight:700}}>{portTotal>0?(d.value/portTotal*100).toFixed(1):0}%</span>
              </div>
            ))}
          </div>
        </>
      ):(
        <div style={{height:170,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8}}>
          <div style={{width:80,height:80,borderRadius:'50%',border:`3px dashed ${D.b2}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontSize:24,opacity:0.3}}>◎</span>
          </div>
          <div style={{fontSize:11,color:D.t2,textAlign:'center',...pj}}>Enter shares & prices<br/>in positions below</div>
        </div>
      )}
    </div>
    <div style={card}>
      <div style={{...pj,fontSize:12,fontWeight:600,color:D.t1,marginBottom:10}}>By Sector</div>
      {sectorData.length>0?(
        <>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={sectorData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
                {sectorData.map((_,i)=><Cell key={i} fill={CC2[(i+3)%CC2.length]}/>)}
              </Pie>
              <Tooltip contentStyle={TS} formatter={(v,n,p)=>[fmt(v),p.payload.name]}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{display:'flex',flexDirection:'column',gap:4,marginTop:8}}>
            {sectorData.map((d,i)=>(
              <div key={d.name} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{width:7,height:7,borderRadius:2,background:CC2[(i+3)%CC2.length],flexShrink:0}}/>
                  <span style={{fontSize:11,color:D.t2,...pj}}>{d.name}</span>
                </div>
                <span style={{...mono,fontSize:11,color:D.t1,fontWeight:700}}>{portTotal>0?(d.value/portTotal*100).toFixed(1):0}%</span>
              </div>
            ))}
          </div>
        </>
      ):(
        <div style={{height:170,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8}}>
          <div style={{width:80,height:80,borderRadius:'50%',border:`3px dashed ${D.b2}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontSize:24,opacity:0.3}}>◎</span>
          </div>
          <div style={{fontSize:11,color:D.t2,textAlign:'center',...pj}}>Add a category to each<br/>position to see sectors</div>
        </div>
      )}
    </div>
  </div>

  {/* P&L bar chart — always visible */}
  <div style={{...card,marginBottom:12}}>
    <div style={{...pj,fontSize:12,fontWeight:600,color:D.t1,marginBottom:12}}>P&L by Position</div>
    {pnlHoriz.length>0?(
      <ResponsiveContainer width="100%" height={Math.max(120,pnlHoriz.length*40)}>
        <BarChart data={pnlHoriz} layout="vertical" margin={{left:8,right:16,top:0,bottom:0}} barCategoryGap="30%">
          <XAxis type="number" tick={{fontSize:9,fill:D.t2}} axisLine={false} tickLine={false} tickFormatter={v=>fmtK(v)}/>
          <YAxis type="category" dataKey="name" tick={{fontSize:11,fill:D.t1,fontFamily:"'Courier Prime',monospace",fontWeight:700}} axisLine={false} tickLine={false} width={52}/>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false}/>
          <Tooltip contentStyle={TS} formatter={(v,n,p)=>[`${fmt(v)} (${p.payload.pct>=0?'+':''}${p.payload.pct.toFixed(1)}%)`,'P&L']}/>
          <ReferenceLine x={0} stroke={D.b3} strokeWidth={1}/>
          <Bar dataKey="pnl" radius={[0,4,4,0]}>
            {pnlHoriz.map((d,i)=><Cell key={i} fill={d.pnl>=0?D.pos:D.neg}/>)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    ):(
      <div style={{height:100,display:'flex',alignItems:'center',justifyContent:'center',color:D.t2,fontSize:11,...pj}}>
        Enter position data to see P&L breakdown
      </div>
    )}
  </div>

  {/* Thesis */}
  <div style={{...card,marginBottom:12,borderColor:`rgba(${rgb(D.inv)},0.2)`}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <div style={{...pj,fontSize:13,fontWeight:600,color:D.t1}}>Investment Thesis</div>
      <button onClick={()=>setShowThesis(!showThesis)} style={smBtn(showThesis,D.inv)}>{showThesis?'↑ Collapse':'↓ Read'}</button>
    </div>
    {showThesis&&<textarea value={portThesis} onChange={e=>setPortThesis(e.target.value)} rows={4} style={{...inB,marginTop:12,resize:'vertical',fontSize:12,color:D.t2,lineHeight:1.7}}/>}
    {!showThesis&&<div style={{fontSize:11,color:D.t2,marginTop:8,lineHeight:1.6,overflow:'hidden',maxHeight:40,WebkitMaskImage:'linear-gradient(to bottom,black 50%,transparent)'}}>{portThesis}</div>}
  </div>

  {/* Positions */}
  <div style={{...pj,fontSize:13,fontWeight:600,color:D.t1,marginBottom:10}}>Positions</div>
  {positions.map(pos=>{
    const val=posCAD(pos),cost=posCostCAD(pos),pnl=val-cost,pnlPct=cost>0?(pnl/cost)*100:0,portPct=portTotal>0?(val/portTotal)*100:0;
    const isExp=expandedPos.has(pos.id);
    return(
      <div key={pos.id} style={{...card,marginBottom:8,borderColor:pnl>0?`rgba(${rgb(D.pos)},0.15)`:pnl<0?`rgba(${rgb(D.neg)},0.15)`:D.b1}}>
        <div style={{display:'grid',gridTemplateColumns:'56px 1fr 56px 68px 68px 52px',gap:6,alignItems:'center',marginBottom:8}}>
          <input value={pos.ticker} onChange={e=>updPos(pos.id,'ticker',e.target.value)} placeholder="TICK" style={{...inB,...mono,fontSize:12,fontWeight:700,textTransform:'uppercase',padding:'6px 6px',textAlign:'center'}}/>
          <input value={pos.name} onChange={e=>updPos(pos.id,'name',e.target.value)} placeholder="Company name" style={{...inB,fontSize:11}}/>
          <div><div style={{...lbl,marginBottom:3,fontSize:8}}>Shares</div><input type="number" value={pos.shares||''} onChange={e=>updPos(pos.id,'shares',e.target.value)} placeholder="0" style={{...inB,...mono,fontSize:11,padding:'5px 5px',textAlign:'center'}}/></div>
          <div><div style={{...lbl,marginBottom:3,fontSize:8}}>Avg Cost</div><input type="number" value={pos.avgCost||''} onChange={e=>updPos(pos.id,'avgCost',e.target.value)} placeholder="0.00" style={{...inB,...mono,fontSize:11,padding:'5px 5px'}}/></div>
          <div><div style={{...lbl,marginBottom:3,fontSize:8}}>Price</div><input type="number" value={pos.currentPrice||''} onChange={e=>updPos(pos.id,'currentPrice',e.target.value)} placeholder="0.00" style={{...inB,...mono,fontSize:11,padding:'5px 5px'}}/></div>
          <select value={pos.currency} onChange={e=>updPos(pos.id,'currency',e.target.value)} style={{...inB,fontSize:11,padding:'5px 4px',cursor:'pointer',textAlign:'center'}}><option value="CAD">CAD</option><option value="USD">USD</option></select>
        </div>
        {(pos.shares>0||pos.currentPrice>0)&&(
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:8,padding:'8px 0',borderTop:`1px solid ${D.b1}`,borderBottom:`1px solid ${D.b1}`}}>
            <div><div style={{...lbl,fontSize:8,marginBottom:2}}>Value (CAD)</div><div style={{...pd,fontSize:16,fontWeight:700,color:D.t1}}>{fmt(val)}</div></div>
            <div><div style={{...lbl,fontSize:8,marginBottom:2}}>P&L</div><div style={{...mono,fontSize:14,fontWeight:700,color:pnl>=0?D.pos:D.neg}}>{pnl>=0?'+':''}{fmt(pnl)}</div></div>
            <div><div style={{...lbl,fontSize:8,marginBottom:2}}>Return</div><div style={{...mono,fontSize:13,fontWeight:700,color:pnl>=0?D.pos:D.neg}}>{pnlPct>=0?'+':''}{pnlPct.toFixed(2)}%</div></div>
            <div style={{marginLeft:'auto',display:'flex',gap:6,alignItems:'center'}}>
              <div style={{...mono,fontSize:10,color:D.t2}}>{portPct.toFixed(1)}%</div>
              {pos.currency==='USD'&&<div style={{fontSize:9,color:D.t3,...mono}}>×{fxVal.toFixed(4)}</div>}
              <input value={pos.category} onChange={e=>updPos(pos.id,'category',e.target.value)} placeholder="Sector" style={{...inB,fontSize:10,width:80,padding:'3px 6px'}}/>
            </div>
          </div>
        )}
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <button onClick={()=>togPos(pos.id)} style={{...smBtn(isExp,D.inv),fontSize:10,padding:'4px 10px'}}>{isExp?'↑ Thesis':'↓ Thesis'}</button>
          <button onClick={()=>delPos(pos.id)} style={{...smBtn(false),color:D.neg,borderColor:`rgba(${rgb(D.neg)},0.2)`,fontSize:10,padding:'4px 10px'}}>Remove</button>
        </div>
        {isExp&&<textarea value={pos.thesis} onChange={e=>updPos(pos.id,'thesis',e.target.value)} rows={3} placeholder="Investment thesis for this position..." style={{...inB,marginTop:10,resize:'vertical',fontSize:11,color:D.t2,lineHeight:1.6}}/>}
      </div>
    );
  })}
  <button onClick={addPos} style={{width:'100%',padding:'10px',borderRadius:10,border:`1px dashed rgba(${rgb(D.inv)},0.3)`,background:`rgba(${rgb(D.inv)},0.05)`,color:D.inv,fontSize:12,fontWeight:600,cursor:'pointer',marginTop:2,outline:'none',...pj}}>＋ Add Position</button>
</div>
);
```

};

// ══════════════════════════════════════════════════════════════
// DEBT
// ══════════════════════════════════════════════════════════════
const DebtTab=()=>{
const addDebt=()=>setDebts(p=>[…p,{id:`d_${Date.now()}`,name:’’,type:‘credit’,balance:’’,rate:’’,minPayment:’’}]);
const updDebt=(id,f,v)=>setDebts(p=>p.map(d=>d.id===id?{…d,[f]:v}:d));
const delDebt=id=>setDebts(p=>p.filter(d=>d.id!==id));
const avgRate=debts.length>0?debts.reduce((s,d)=>s+(parseFloat(d.rate)||0),0)/debts.length:0;
const totalMin=debts.reduce((s,d)=>s+(parseFloat(d.minPayment)||0),0);
const payoffDate=payoff?new Date(T.getFullYear(),T.getMonth()+payoff.months,1).toLocaleDateString(‘en-CA’,{year:‘numeric’,month:‘short’}):null;
const barData=debts.filter(d=>parseFloat(d.balance)>0).map((d,i)=>({name:(d.name||d.type).slice(0,10),balance:Math.round(parseFloat(d.balance)),color:CC[(i+3)%CC.length]}));
return(
<div>
<div style={{display:‘grid’,gridTemplateColumns:‘1fr 1fr’,gap:8,marginBottom:10}}>
<Stat label="Total Debt" val={fmt(totalDebt)} color={totalDebt>0?D.neg:D.pos}/>
<Stat label="Avg Rate" val={avgRate>0?`${(avgRate*100).toFixed(1)}%`:’—’} color={D.wrn}/>
<Stat label="Monthly Minimums" val={fmt(totalMin)}/>
<Stat label=“Debt-Free Est.” val={payoffDate||’—’} color={D.pos} sub={payoff?`${payoff.months} months`:’’}/>
</div>
{barData.length>0&&(
<div style={{display:‘grid’,gridTemplateColumns:‘1fr 1fr’,gap:8,marginBottom:10}}>
<div style={card}><div style={{...pj,fontSize:12,fontWeight:600,color:D.t1,marginBottom:8}}>Balances</div>
<ResponsiveContainer width="100%" height={140}><BarChart data={barData} barCategoryGap="30%"><XAxis dataKey="name" tick={{fontSize:9,fill:D.t2}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:D.t2}} axisLine={false} tickLine={false} tickFormatter={v=>fmtK(v)}/><Tooltip contentStyle={TS} formatter={(v)=>[fmt(v),‘Balance’]}/><Bar dataKey="balance" radius={[3,3,0,0]}>{barData.map((d,i)=><Cell key={i} fill={d.color}/>)}</Bar></BarChart></ResponsiveContainer>
</div>
<div style={card}><div style={{...pj,fontSize:12,fontWeight:600,color:D.t1,marginBottom:8}}>Payoff Timeline</div>
{payoff?.monthly?.length>0?<ResponsiveContainer width="100%" height={140}><LineChart data={samp(payoff.monthly)}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/><XAxis dataKey=“month” tick={{fontSize:9,fill:D.t2}} axisLine={false} tickLine={false} tickFormatter={v=>`M${v}`}/><YAxis tick={{fontSize:9,fill:D.t2}} axisLine={false} tickLine={false} tickFormatter={v=>fmtK(v)}/><Tooltip contentStyle={TS} formatter={(v)=>[fmt(v),‘Remaining’]} labelFormatter={v=>`Month ${v}`}/><Line type="monotone" dataKey="total" stroke={D.neg} strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer>:<div style={{height:140,display:‘flex’,alignItems:‘center’,justifyContent:‘center’,color:D.t2,fontSize:11}}>Add debts to see timeline</div>}
</div>
</div>
)}
<div style={{...card,marginBottom:10}}>
<div style={{...pj,fontSize:13,fontWeight:600,color:D.t1,marginBottom:10}}>Payoff Strategy</div>
<div style={{display:‘grid’,gridTemplateColumns:‘1fr 1fr’,gap:8,marginBottom:10}}>
<button onClick={()=>setDebtStrategy(‘avalanche’)} style={smBtn(debtStrategy===‘avalanche’,D.neg)}>💎 Avalanche — Highest Rate First</button>
<button onClick={()=>setDebtStrategy(‘snowball’)} style={smBtn(debtStrategy===‘snowball’,D.sv)}>❄ Snowball — Lowest Balance First</button>
</div>
<div style={{fontSize:11,color:D.t2,marginBottom:10,...pj,lineHeight:1.6}}>{debtStrategy===‘avalanche’?‘Mathematically optimal — pay least total interest. Focus all extra on the highest-rate debt.’:‘Psychological momentum — quick wins by clearing small balances first.’}</div>
<div style={{...lbl,marginBottom:4}}>Extra Monthly Payment</div>
<AmtField val={debtExtra} set={setDebtExtra}/>
{payoff&&totalDebt>0&&<div style={{marginTop:9,padding:‘8px 12px’,background:`rgba(${rgb(D.pos)},0.06)`,border:`1px solid rgba(${rgb(D.pos)},0.15)`,borderRadius:8,fontSize:11,color:D.pos,…mono}}>Total interest remaining: {fmt(Math.round(payoff.totalInterest))} · Debt-free in {payoff.months} months</div>}
</div>
{payoff?.sorted?.length>0&&(
<div style={{...card,marginBottom:10}}>
<div style={{...pj,fontSize:13,fontWeight:600,color:D.t1,marginBottom:9}}>Payoff Order</div>
{payoff.sorted.map((d,i)=>(
<div key={d.id} style={{display:‘flex’,alignItems:‘center’,gap:9,padding:‘8px 11px’,borderRadius:8,background:i===0?`rgba(${rgb(D.neg)},0.05)`:‘rgba(255,255,255,0.02)’,border:`1px solid ${i===0?`rgba(${rgb(D.neg)},0.18)`:D.b1}`,marginBottom:6}}>
<div style={{…mono,fontSize:12,fontWeight:700,color:i===0?D.neg:D.t2,minWidth:18}}>#{i+1}</div>
<div style={{flex:1}}><div style={{...pj,fontSize:12,fontWeight:600,color:D.t1}}>{d.name}</div>
<div style={{fontSize:10,color:D.t2}}>{fmt(d.balance)} · {((parseFloat(d.rate)||0)*100).toFixed(1)}% APR
<span style={{...mono,marginLeft:6,color:D.t2}}>{fmt(Math.round((parseFloat(d.balance)||0)*(parseFloat(d.rate)||0)/12))}/mo interest</span>
</div>
</div>
{payoff.payoffAt[d.id]&&<div style={{fontSize:10,color:D.pos,...mono}}>Mo {payoff.payoffAt[d.id]}</div>}
{i===0&&<div style={{fontSize:9,fontWeight:700,color:D.neg,textTransform:‘uppercase’,letterSpacing:‘0.06em’}}>Focus</div>}
</div>
))}
</div>
)}
<div style={{...pj,fontSize:13,fontWeight:600,color:D.t1,marginBottom:8}}>Your Debts</div>
{debts.length===0&&<div style={{…card,textAlign:‘center’,color:D.t2,fontSize:12,padding:24}}>No debts added.</div>}
{debts.map(d=>(
<div key={d.id} style={card}>
<div style={{display:‘grid’,gridTemplateColumns:‘1fr 80px’,gap:8,marginBottom:8}}>
<input value={d.name} onChange={e=>updDebt(d.id,‘name’,e.target.value)} placeholder=“e.g. CIBC Visa, Car Loan” style={inB}/>
<select value={d.type} onChange={e=>updDebt(d.id,‘type’,e.target.value)} style={{…inB,cursor:‘pointer’}}>{[‘credit’,‘car’,‘student’,‘personal’,‘loc’,‘mortgage’,‘other’].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}</select>
</div>
<div style={{display:‘grid’,gridTemplateColumns:‘1fr 1fr 1fr’,gap:8}}>
<div><div style={{...lbl,marginBottom:3}}>Balance</div><AmtField val={d.balance} set={v=>updDebt(d.id,‘balance’,v)}/></div>
<div><div style={{...lbl,marginBottom:3}}>Annual Rate %</div><div style={{position:‘relative’}}><input type=“number” value={d.rate?(parseFloat(d.rate)*100).toFixed(1):’’} onChange={e=>updDebt(d.id,‘rate’,(parseFloat(e.target.value)||0)/100)} placeholder=“19.9” style={{…inB,…mono,paddingRight:22}}/><span style={{position:‘absolute’,right:8,top:‘50%’,transform:‘translateY(-50%)’,color:D.t2,fontSize:12}}>%</span></div></div>
<div><div style={{...lbl,marginBottom:3}}>Min Payment</div><AmtField val={d.minPayment} set={v=>updDebt(d.id,‘minPayment’,v)}/></div>
</div>
{(parseFloat(d.balance)||0)>0&&(parseFloat(d.rate)||0)>0&&<MicroInsight text={`Monthly interest: ${fmt(Math.round((parseFloat(d.balance)||0)*(parseFloat(d.rate)||0)/12))}`} type=“warn”/>}
<button onClick={()=>delDebt(d.id)} style={{marginTop:9,padding:‘4px 12px’,borderRadius:7,border:`1px solid rgba(${rgb(D.neg)},0.2)`,background:`rgba(${rgb(D.neg)},0.05)`,color:D.neg,fontSize:11,fontWeight:600,cursor:‘pointer’,outline:‘none’}}>Remove</button>
</div>
))}
<button onClick={addDebt} style={{width:‘100%’,padding:‘9px’,borderRadius:9,border:`1px dashed rgba(${rgb(D.neg)},0.25)`,background:`rgba(${rgb(D.neg)},0.04)`,color:D.neg,fontSize:12,fontWeight:600,cursor:‘pointer’,marginTop:2,outline:‘none’}}>+ Add Debt</button>
</div>
);
};

// ══════════════════════════════════════════════════════════════
// NET WORTH
// ══════════════════════════════════════════════════════════════
const NetWorthTab=()=>{
const addOther=()=>setNwExtras(p=>({…p,other:[…(p.other||[]),{id:`oa_${Date.now()}`,name:’’,value:’’}]}));
const updOther=(id,f,v)=>setNwExtras(p=>({…p,other:p.other.map(a=>a.id===id?{…a,[f]:v}:a)}));
const delOther=id=>setNwExtras(p=>({…p,other:p.other.filter(a=>a.id!==id)}));
const prevNW=nwHistory[mkKey(py,pm)]?.netWorth;
const histData=MONTHS.map((_,i)=>{const snap=nwHistory[mkKey(yr,i)];return{m:SHORT[i],nw:snap?.netWorth||null};}).filter(r=>r.nw!==null);
const assetRatio=totalDebt>0?(totalAssets/totalDebt):null;
return(
<div>
<div style={{display:‘grid’,gridTemplateColumns:‘1fr 1fr’,gap:8,marginBottom:10}}>
<Stat label="Total Assets" val={fmt(totalAssets)} color={D.pos}/>
<Stat label="Total Liabilities" val={fmt(totalDebt)} color={totalDebt>0?D.neg:D.pos}/>
<Stat label="Net Worth" val={fmt(netWorth)} color={netWorth>=0?D.inv:D.neg} sub={prevNW?`${netWorth-prevNW>=0?'+':''}${fmt(netWorth-prevNW)} vs last mo`:‘Visit monthly to track trend’}/>
<Stat label=“Assets / Debt” val={assetRatio?`${assetRatio.toFixed(1)}x`:‘∞’} color={!assetRatio||assetRatio>=2?D.pos:D.wrn} sub=”> 2x = healthy”/>
</div>
{histData.length>1&&(
<div style={{...card,marginBottom:10}}>
<div style={{...pj,fontSize:13,fontWeight:600,color:D.t1,marginBottom:10}}>Net Worth Trend — {yr}</div>
<ResponsiveContainer width="100%" height={150}>
<LineChart data={histData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/><XAxis dataKey="m" tick={{fontSize:9,fill:D.t2}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:D.t2}} axisLine={false} tickLine={false} tickFormatter={v=>fmtK(v)}/><Tooltip contentStyle={TS} formatter={(v)=>[fmt(v),‘Net Worth’]}/><Line type="monotone" dataKey="nw" stroke={D.inv} strokeWidth={2} dot={{fill:D.inv,r:3}}/></LineChart>
</ResponsiveContainer>
</div>
)}
{histData.length<=1&&<div style={{…card,marginBottom:10,textAlign:‘center’,color:D.t2,fontSize:11,padding:20}}>Visit this tab each month to build your net worth trend chart.</div>}
<div style={{...card,marginBottom:10}}>
<div style={{...pj,fontSize:13,fontWeight:600,color:D.t1,marginBottom:12}}>Assets</div>
{[{l:‘TFSA Portfolio’,v:portTotal,note:‘Live — update prices in Portfolio’,c:D.inv},{l:‘Emergency Fund’,v:emerBal,note:‘Live — from Saving tab’,c:D.sv}].map(row=>(
<div key={row.l} style={{display:‘flex’,justifyContent:‘space-between’,alignItems:‘center’,padding:‘9px 0’,borderBottom:`1px solid ${D.b1}`}}>
<div><div style={{...pj,fontSize:12,fontWeight:600,color:D.t1}}>{row.l}</div><div style={{fontSize:10,color:D.t2}}>{row.note}</div></div>
<div style={{...pd,fontSize:15,fontWeight:700,color:row.c}}>{fmt(row.v)}</div>
</div>
))}
<div style={{display:‘grid’,gridTemplateColumns:‘1fr 1fr’,gap:8,margin:‘10px 0’}}>
<div><div style={{...lbl,marginBottom:3}}>RRSP Balance</div><AmtField val={rrspData.balance} set={v=>setRrspData(p=>({…p,balance:v}))}/></div>
<div><div style={{...lbl,marginBottom:3}}>Liquid Savings</div><AmtField val={nwExtras.liquid} set={v=>setNwExtras(p=>({…p,liquid:v}))}/></div>
<div><div style={{...lbl,marginBottom:3}}>Chequing Account</div><AmtField val={nwExtras.chequing} set={v=>setNwExtras(p=>({…p,chequing:v}))}/></div>
</div>
{(nwExtras.other||[]).map(a=>(
<div key={a.id} style={{display:‘grid’,gridTemplateColumns:‘1fr 110px 26px’,gap:7,marginBottom:7,alignItems:‘center’}}>
<input value={a.name} onChange={e=>updOther(a.id,‘name’,e.target.value)} placeholder=“Asset name (e.g. Vehicle)” style={inB}/>
<AmtField val={a.value} set={v=>updOther(a.id,‘value’,v)} narrow/>
<button onClick={()=>delOther(a.id)} style={{background:`rgba(${rgb(D.neg)},0.08)`,border:`1px solid rgba(${rgb(D.neg)},0.15)`,borderRadius:5,color:D.neg,fontSize:13,width:26,height:26,cursor:‘pointer’,display:‘flex’,alignItems:‘center’,justifyContent:‘center’,outline:‘none’}}>×</button>
</div>
))}
<button onClick={addOther} style={{width:‘100%’,padding:‘6px 0’,background:`rgba(${rgb(D.pos)},0.04)`,border:`1px dashed rgba(${rgb(D.pos)},0.2)`,borderRadius:7,color:D.pos,fontSize:11,fontWeight:600,cursor:‘pointer’,marginTop:2,outline:‘none’}}>+ Add Asset</button>
<div style={{display:‘flex’,justifyContent:‘space-between’,alignItems:‘center’,padding:‘11px 0 0’,marginTop:6,borderTop:`1px solid ${D.b1}`}}>
<div style={{...pj,fontSize:13,fontWeight:600,color:D.t1}}>Total Assets</div>
<div style={{...pd,fontSize:17,fontWeight:700,color:D.pos}}>{fmt(totalAssets)}</div>
</div>
</div>
<div style={{…card,display:‘flex’,justifyContent:‘space-between’,alignItems:‘center’}}>
<div><div style={{...pj,fontSize:13,fontWeight:600,color:D.t1}}>Total Liabilities</div><div style={{fontSize:10,color:D.t2}}>From Debt tab</div></div>
<div style={{...pd,fontSize:17,fontWeight:700,color:totalDebt>0?D.neg:D.pos}}>{fmt(totalDebt)}</div>
</div>
</div>
);
};

// ══════════════════════════════════════════════════════════════
// INSIGHTS
// ══════════════════════════════════════════════════════════════
const InsightsTab=()=>{
const ins=buildInsights();
const PC={high:D.neg,medium:D.wrn,low:D.pos,ok:D.sv};
return(
<div>
<div style={{…card,background:‘rgba(255,255,255,0.015)’,marginBottom:12}}>
<div style={{...pj,fontSize:14,fontWeight:700,color:D.t1,marginBottom:3}}>Your Financial Roadmap</div>
<div style={{fontSize:11,color:D.t2}}>Synthesizes all tabs. Ranked by priority. High items need action first.</div>
</div>
{ins.length===0&&<div style={{…card,textAlign:‘center’,color:D.t2,fontSize:12,padding:28}}>Enter income and actuals to generate insights.</div>}
{ins.map((item,i)=>(
<div key={i} style={{…card,borderLeft:`3px solid ${PC[item.p]}`,background:`rgba(${rgb(PC[item.p])},0.025)`,marginBottom:9}}>
<div style={{display:‘flex’,alignItems:‘flex-start’,gap:9}}>
<span style={{fontSize:18,flexShrink:0,marginTop:1}}>{item.icon}</span>
<div style={{flex:1}}>
<div style={{display:‘flex’,alignItems:‘center’,gap:7,marginBottom:4,flexWrap:‘wrap’}}>
<div style={{...pj,fontSize:13,fontWeight:700,color:D.t1}}>{item.title}</div>
<span style={{fontSize:9,fontWeight:700,letterSpacing:‘0.07em’,textTransform:‘uppercase’,color:PC[item.p],padding:‘2px 6px’,borderRadius:3,background:`rgba(${rgb(PC[item.p])},0.10)`}}>{item.p===‘ok’?‘good’:item.p}</span>
</div>
<div style={{fontSize:12,color:D.t2,lineHeight:1.6,marginBottom:7,...pj}}>{item.body}</div>
<div style={{fontSize:11,fontWeight:600,color:PC[item.p],...mono}}>{item.action}</div>
</div>
</div>
</div>
))}
</div>
);
};

// ══════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════
const TABS=[[‘overview’,‘Overview’],[‘spending’,‘Spending’],[‘giving’,‘Giving’],[‘saving’,‘Saving’],[‘annual’,‘Annual’],[‘portfolio’,‘Portfolio’],[‘debt’,‘Debt’],[‘networth’,‘Net Worth’],[‘insights’,‘Insights’]];
return(
<div style={{minHeight:‘100vh’,background:`linear-gradient(160deg, #0F1628 0%, #0C1020 60%, #0A0E18 100%)`,color:D.t1,fontFamily:”‘Plus Jakarta Sans’,sans-serif”,padding:‘18px 14px 48px’,maxWidth:680,margin:‘0 auto’}}>
<style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap'); *{box-sizing:border-box} input,select,textarea{outline:none} input:focus,select:focus,textarea:focus{border-color:#3A3A3A!important} input[type=number]{-moz-appearance:textfield} input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none} .tabbar{scrollbar-width:none;-ms-overflow-style:none} .tabbar::-webkit-scrollbar{display:none} ::-webkit-scrollbar{width:3px;height:3px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#222;border-radius:2px}`}</style>

```
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
    <div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,fontWeight:700,color:D.t1,letterSpacing:'-0.5px'}}>Budget Planner</div>
      <div style={{fontSize:10,color:D.t2,marginTop:2,letterSpacing:'0.12em',textTransform:'uppercase',...mono}}>After-Tax · CAD · {yr}</div>
    </div>
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <button onClick={()=>nav(-1)} style={navB}>‹</button>
      <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,fontWeight:600,minWidth:84,textAlign:'center',color:D.t1}}>{SHORT[mo]} {yr}</div>
      <button onClick={()=>nav(1)} style={navB}>›</button>
    </div>
  </div>

  <div className="tabbar" style={{display:'flex',gap:2,marginBottom:16,padding:'3px',background:D.s1,borderRadius:10,border:`1px solid ${D.b2}`,overflowX:'auto'}}>
    {TABS.map(([id,l])=><button key={id} onClick={()=>setTab(id)} style={tbtn(tab===id)}>{l}</button>)}
  </div>

  {tab==='overview'  && Overview()}
  {tab==='spending'  && SpendingTab()}
  {tab==='giving'    && GivingTab()}
  {tab==='saving'    && SavingTab()}
  {tab==='annual'    && Annual()}
  {tab==='portfolio' && PortfolioTab()}
  {tab==='debt'      && DebtTab()}
  {tab==='networth'  && NetWorthTab()}
  {tab==='insights'  && InsightsTab()}
</div>
```

);
}
