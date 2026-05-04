import { ImageUpload } from "../../components/ImageUpload";
import { materials as INIT } from "../../data/materials";
import { DEFAULT_BRANDING } from "../../data/defaults";
import { store } from "../../utils/storage";

export function SettingsTab({ branding, setBranding }) {
  return <div className="space-y-6 max-w-xl">
    <h3 className="text-lg font-bold text-gray-900">Instellingen</h3>
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
      <h4 className="font-semibold text-gray-800">Branding</h4>
      <ImageUpload value={branding.logo} onChange={v=>setBranding(p=>({...p,logo:v}))} label="Logo"/>
      {branding.logo && <>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo formaat header ({branding.logoSize || 40}px)</label>
          <div className="flex items-center gap-4">
            <input type="range" min="20" max="80" value={branding.logoSize || 40} onChange={e => setBranding(p => ({...p, logoSize: parseInt(e.target.value)}))} className="flex-1 accent-blue-600"/>
            <div className="bg-gray-100 rounded-xl p-2 flex items-center justify-center" style={{width:80,height:80}}>
              <img src={branding.logo} className="rounded-lg object-contain" style={{width:branding.logoSize||40,height:branding.logoSize||40}} alt="preview"/>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo formaat loginscherm ({branding.loginLogoSize || 64}px)</label>
          <div className="flex items-center gap-4">
            <input type="range" min="32" max="160" value={branding.loginLogoSize || 64} onChange={e => setBranding(p => ({...p, loginLogoSize: parseInt(e.target.value)}))} className="flex-1 accent-blue-600"/>
            <div className="bg-gray-100 rounded-xl p-2 flex items-center justify-center" style={{width:100,height:100}}>
              <img src={branding.logo} className="rounded-lg object-contain" style={{width:branding.loginLogoSize||64,height:branding.loginLogoSize||64}} alt="preview"/>
            </div>
          </div>
        </div>
      </>}
      <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Titel</label><input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={branding.title} onChange={e=>setBranding(p=>({...p,title:e.target.value}))}/></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Ondertitel</label><input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={branding.subtitle} onChange={e=>setBranding(p=>({...p,subtitle:e.target.value}))}/></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Kleur</label><div className="flex items-center gap-3"><input type="color" value={branding.color} onChange={e=>setBranding(p=>({...p,color:e.target.value}))} className="w-10 h-10 rounded-lg cursor-pointer border-0"/><span className="text-sm text-gray-500">{branding.color}</span></div></div>
      <ImageUpload value={branding.loginBg} onChange={v=>setBranding(p=>({...p,loginBg:v}))} label="Login achtergrond"/>
    </div>
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
      <h4 className="font-semibold text-gray-800">Data</h4>
      <button onClick={()=>{if(confirm("Alles resetten?")){store.set("mhok-eq6",INIT);store.set("mhok-bons",[]);store.set("mhok-logs",[]);store.set("mhok-brand",DEFAULT_BRANDING);window.location.reload()}}} className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-200 hover:bg-red-100">Reset alle data</button>
    </div>
  </div>;
}
