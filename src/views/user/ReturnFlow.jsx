import { useState, useEffect, useRef } from "react";
import { BonBadge } from "../../components/BonBadge";
import { isoNow } from "../../utils/date";
import { bonComplete, bonRemaining } from "../../utils/bons";

export function ReturnFlow({ eq, bons, setBons, addLog, user, onCancel, onDone }) {
  const [returnBon, setReturnBon] = useState(null);
  const [scanInput, setScanInput] = useState(""); const [scanMsg, setScanMsg] = useState(null);
  const scanRef = useRef(null);
  const scanTimer = useRef(null);
  const scanValue = useRef("");

  const myBons = bons.filter(b=>b.user===user.label&&b.status!=="completed");

  // Global key capture: redirect to scan field, prevent browser search
  useEffect(() => {
    const handler = (e) => {
      const activeRef = scanRef.current;
      if (!activeRef) return;
      if (e.key === "F3" || (e.ctrlKey && e.key === "f") || (e.ctrlKey && e.key === "g") || e.key === "/") {
        e.preventDefault();
      }
      if (activeRef.offsetParent !== null && document.activeElement !== activeRef && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "SELECT" && document.activeElement?.tagName !== "TEXTAREA") {
        activeRef.focus();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

  const handleScan=()=>{
    if(!returnBon||!scanValue.current.trim())return;
    const code=scanValue.current.trim();
    const matchItem=eq.find(i=>i.barcode===code||i.barcode===code.toUpperCase());
    let bonItem=matchItem?returnBon.items.find(bi=>bi.itemId===matchItem.id&&(bi.qty-(bi.returned||0))>0):null;
    if(!bonItem){const numId=parseInt(code,10);bonItem=returnBon.items.find(bi=>bi.itemId===numId&&(bi.qty-(bi.returned||0))>0);}
    if(!bonItem)bonItem=returnBon.items.find(bi=>bi.itemName.toLowerCase().includes(code.toLowerCase())&&(bi.qty-(bi.returned||0))>0);
    if(bonItem){
      const nr=(bonItem.returned||0)+1;
      setBons(p=>p.map(b=>b.id===returnBon.id?{...b,items:b.items.map(i=>i.itemId===bonItem.itemId?{...i,returned:nr}:i)}:b));
      setReturnBon(prev=>({...prev,items:prev.items.map(i=>i.itemId===bonItem.itemId?{...i,returned:nr}:i)}));
      setScanMsg({ok:true,text:`\u2705 ${bonItem.itemName} (${nr}/${bonItem.qty})`});
      addLog("return",`${returnBon.number}: 1x ${bonItem.itemName} retour`);
    } else setScanMsg({ok:false,text:"\u274c Niet gevonden op deze bon"});
    setScanInput("");scanValue.current="";setTimeout(()=>setScanMsg(null),3000);
  };

  const pickupScan=()=>{
    if(!returnBon||!scanValue.current.trim())return;
    const code=scanValue.current.trim();
    const matchItem=eq.find(i=>i.barcode===code||i.barcode===code.toUpperCase());
    let bonItem=matchItem?returnBon.items.find(bi=>bi.itemId===matchItem.id&&(bi.pickedUp||0)<bi.qty):null;
    if(!bonItem){const numId=parseInt(code,10);bonItem=returnBon.items.find(bi=>bi.itemId===numId&&(bi.pickedUp||0)<bi.qty);}
    if(!bonItem)bonItem=returnBon.items.find(bi=>bi.itemName.toLowerCase().includes(code.toLowerCase())&&(bi.pickedUp||0)<bi.qty);
    if(bonItem){
      const nr=(bonItem.pickedUp||0)+1;
      setBons(p=>p.map(b=>b.id===returnBon.id?{...b,items:b.items.map(i=>i.itemId===bonItem.itemId?{...i,pickedUp:nr}:i)}:b));
      setReturnBon(prev=>({...prev,items:prev.items.map(i=>i.itemId===bonItem.itemId?{...i,pickedUp:nr}:i)}));
      setScanMsg({ok:true,text:`\u2705 ${bonItem.itemName} opgehaald (${nr}/${bonItem.qty})`});
      addLog("loan",`${returnBon.number}: 1x ${bonItem.itemName} opgehaald`);
    } else setScanMsg({ok:false,text:"\u274c Niet gevonden op deze bon"});
    setScanInput("");scanValue.current="";setTimeout(()=>setScanMsg(null),3000);
  };

  const finishPickup=()=>{
    setBons(p=>p.map(b=>b.id===returnBon.id?{...b,status:"active"}:b));
    addLog("loan",`${returnBon.number} opgehaald door ${user.label}`);
    onDone({action:"loan",text:`${returnBon.number} is opgehaald!`});
  };

  const finishReturn=()=>{
    const bon=returnBon;const isComp=bonComplete(bon);
    if(isComp){setBons(p=>p.map(b=>b.id===bon.id?{...b,status:"completed",completedDate:isoNow()}:b));addLog("return",`${bon.number} volledig retour`);onDone({action:"return",text:`${bon.number} compleet!`})}
    else{const rem=bonRemaining(bon);addLog("return",`${bon.number} deels retour. Open: ${rem.map(i=>`${i.qty-(i.returned||0)}x ${i.itemName}`).join(", ")}`);onDone({action:"partial",text:`${bon.number} deels retour`})}
  };

  // RETURN / PICKUP - select bon
  if(!returnBon) return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
    <div className="bg-white border-b border-gray-100 shadow-sm"><div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
      <button onClick={onCancel} className="flex items-center gap-2 text-blue-600 text-sm font-medium"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>Terug</button>
      <h2 className="text-lg font-bold text-gray-900">Kies een bon</h2><div className="w-16"/>
    </div></div>
    <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
      {myBons.length===0?<div className="text-center py-12"><p className="text-4xl mb-3">{"\ud83d\udce6"}</p><p className="text-gray-500">Geen actieve bonnen</p></div>
      :myBons.map(b=><div key={b.id} onClick={()=>setReturnBon(b)} className={`bg-white rounded-2xl px-5 py-4 shadow-sm border cursor-pointer hover:shadow-md ${b.status==="reserved"?"border-purple-200 hover:border-purple-300":"border-gray-100 hover:border-gray-200"}`}>
        <div className="flex items-center justify-between"><div><div className="flex items-center gap-2"><span className="font-mono text-sm font-bold text-blue-600">{b.number}</span><BonBadge bon={b}/></div><p className="text-xs text-gray-500 mt-1">{b.items.map(i=>i.itemName).join(", ")}</p></div>
        <span className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{backgroundColor:b.status==="reserved"?"#f3e8ff":"#ecfdf5",color:b.status==="reserved"?"#7c3aed":"#059669"}}>{b.status==="reserved"?"Ophalen":"Retour"}</span></div>
      </div>)}
    </div>
  </div>;

  // SCAN - pickup or return
  const isPickup = returnBon.status === "reserved";
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
    <div className="bg-white border-b border-gray-100 shadow-sm"><div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
      <button onClick={()=>setReturnBon(null)} className="flex items-center gap-2 text-blue-600 text-sm font-medium"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>Terug</button>
      <h2 className="text-lg font-bold text-gray-900">{isPickup?"Ophalen":"Retour"} {returnBon.number}</h2><div className="w-16"/>
    </div></div>
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className={`rounded-2xl p-5 shadow-sm border ${isPickup?"bg-purple-50 border-purple-200":"bg-white border-gray-100"}`}>
        <label className="block text-sm font-medium text-gray-700 mb-2">{isPickup?"Scan materiaal om op te halen":"Scan materiaal om te retourneren"}</label>
        <div className="flex gap-2">
          <input ref={scanRef} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Scan materiaal..." value={scanInput} onChange={e=>{const v=e.target.value;setScanInput(v);scanValue.current=v;if(scanTimer.current)clearTimeout(scanTimer.current);if(v.trim().length>=3)scanTimer.current=setTimeout(()=>{isPickup?pickupScan():handleScan()},150)}} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(scanTimer.current)clearTimeout(scanTimer.current);isPickup?pickupScan():handleScan()}}} autoFocus autoComplete="off"/>
          <button onClick={isPickup?pickupScan:handleScan} className={`px-5 py-3 rounded-xl text-white font-semibold text-sm ${isPickup?"bg-purple-500 hover:bg-purple-600":"bg-emerald-500 hover:bg-emerald-600"}`}>{isPickup?"\ud83d\udce4":"\ud83d\udce5"}</button>
        </div>
        {scanMsg&&<div className={`mt-3 rounded-xl px-4 py-3 text-sm font-medium ${scanMsg.ok?"bg-emerald-50 text-emerald-800":"bg-red-50 text-red-800"}`}>{scanMsg.text}</div>}
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-bold text-gray-900 text-sm">Items</h3></div>
        {returnBon.items.map((bi,idx)=>{const rem=isPickup?bi.qty-(bi.pickedUp||0):bi.qty-(bi.returned||0);return <div key={idx} className={`px-5 py-3 flex items-center justify-between border-b border-gray-50 last:border-0 ${rem===0?"bg-emerald-50/50":""}`}><div><p className="text-sm font-medium">{bi.itemName}</p><p className="text-xs text-gray-500">{isPickup?`${bi.pickedUp||0}/${bi.qty} opgehaald`:`${bi.returned||0}/${bi.qty} gescand`}</p></div>{rem===0?<span className="text-emerald-600">{"\u2705"}</span>:<span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">{rem} open</span>}</div>})}
      </div>
      <button onClick={isPickup?finishPickup:finishReturn} className={`w-full py-3 rounded-xl text-white font-bold text-sm ${isPickup?"bg-purple-500 hover:bg-purple-600":"bg-emerald-500 hover:bg-emerald-600"}`}>
        {isPickup?"Ophalen afronden":(bonComplete(returnBon)?"\u2705 Bon afronden":"\ud83d\udce5 Afronden (deels retour)")}
      </button>
      {!isPickup&&!bonComplete(returnBon)&&<p className="text-xs text-amber-600 text-center">Openstaande items blijven op de bon staan.</p>}
    </div>
  </div>;
}
