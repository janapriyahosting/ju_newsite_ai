"use client";
import { useEffect, useState, useRef } from "react";
import { useAdminStore, adminApi } from "@/lib/adminAuth";

type EntityType = "projects" | "towers" | "units";
interface PageState { items: any[]; total: number; page: number; page_size: number; total_pages: number; }
const ENTITY_MAP: Record<EntityType, string> = { projects: "project", towers: "tower", units: "unit" };

export default function CrudManagerPage() {
  const { role } = useAdminStore();
  const isSuperadmin = role === "superadmin";
  const [activeTab, setActiveTab] = useState<EntityType>("projects");
  const [data, setData] = useState<PageState>({ items:[], total:0, page:1, page_size:20, total_pages:1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingCell, setEditingCell] = useState<{id:string;field:string;value:any}|null>(null);
  const [editRecord, setEditRecord] = useState<any|null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [towers, setTowers] = useState<any[]>([]);
  const [fieldConfigs, setFieldConfigs] = useState<Record<string,any[]>>({});
  const [filterProjectId, setFilterProjectId] = useState("");
  const [filterTowerId, setFilterTowerId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const searchTimer = useRef<any>(null);

  useEffect(() => { loadData(1); }, [activeTab, filterProjectId, filterTowerId, filterStatus]);
  useEffect(() => { loadDropdowns(); loadFieldConfigs(); }, []);

  async function loadFieldConfigs() {
    try { const r = await adminApi("/admin/fields"); setFieldConfigs(await r.json()); } catch {}
  }
  async function loadDropdowns() {
    try {
      const [pr,tw] = await Promise.all([
        adminApi("/admin/projects/list?page_size=100").then(r=>r.json()),
        adminApi("/admin/towers/list?page_size=100").then(r=>r.json()),
      ]);
      setProjects(pr.items||[]); setTowers(tw.items||[]);
    } catch {}
  }
  async function loadData(page=1) {
    setLoading(true); setSelected(new Set());
    try {
      const params = new URLSearchParams({page:String(page),page_size:"20"});
      if (search) params.set("search",search);
      let url="";
      if (activeTab==="projects") url=`/admin/projects/list?${params}`;
      else if (activeTab==="towers") { if(filterProjectId) params.set("project_id",filterProjectId); url=`/admin/towers/list?${params}`; }
      else { if(filterTowerId) params.set("tower_id",filterTowerId); if(filterProjectId) params.set("project_id",filterProjectId); if(filterStatus) params.set("status",filterStatus); url=`/admin/units/all?${params}`; }
      const res = await adminApi(url);
      if (!res.ok) throw new Error("Failed to load");
      setData(await res.json());
    } catch(e:any) { setError(e.message); }
    finally { setLoading(false); }
  }
  function handleSearch(val:string) {
    setSearch(val); clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(()=>loadData(1),400);
  }
  async function commitCellEdit() {
    if (!editingCell) return;
    const ep = activeTab==="projects"?"projects":activeTab==="towers"?"towers":"units";
    try {
      const res = await adminApi(`/admin/${ep}/${editingCell.id}`,{method:"PATCH",body:JSON.stringify({[editingCell.field]:editingCell.value})});
      if (!res.ok) throw new Error("Update failed");
      setData(prev=>({...prev,items:prev.items.map(i=>i.id===editingCell.id?{...i,[editingCell.field]:editingCell.value}:i)}));
      flash("Saved");
    } catch(e:any) { setError(e.message); }
    finally { setEditingCell(null); }
  }
  async function deleteOne(id:string) {
    if (!confirm("Delete this record? Cannot be undone.")) return;
    const ep = activeTab==="projects"?"projects":activeTab==="towers"?"towers":"units";
    try { await adminApi(`/admin/${ep}/${id}`,{method:"DELETE"}); await loadData(data.page); flash("Deleted"); }
    catch(e:any) { setError(e.message); }
  }
  async function bulkDelete() {
    if (selected.size===0||!confirm(`Delete ${selected.size} records?`)) return;
    const ep = activeTab==="projects"?"projects":activeTab==="towers"?"towers":"units";
    try {
      const res = await adminApi(`/admin/${ep}/bulk-delete`,{method:"POST",body:JSON.stringify({ids:Array.from(selected)})});
      const r = await res.json(); await loadData(data.page); flash(`Deleted ${r.deleted} records`);
    } catch(e:any) { setError(e.message); }
  }
  async function duplicate(id:string) {
    const ep = activeTab==="projects"?"projects":activeTab==="towers"?"towers":"units";
    try {
      const res = await adminApi(`/admin/${ep}/${id}/duplicate`,{method:"POST"});
      if (!res.ok) throw new Error("Duplicate failed");
      await loadData(data.page); flash("Duplicated");
    } catch(e:any) { setError(e.message); }
  }
  function flash(msg:string) { setSuccess(msg); setTimeout(()=>setSuccess(null),3000); }
  function toggleSelect(id:string) { setSelected(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;}); }
  function toggleAll() { setSelected(selected.size===data.items.length?new Set():new Set(data.items.map(i=>i.id))); }
  const allSel = data.items.length>0&&selected.size===data.items.length;
  const entityKey = ENTITY_MAP[activeTab];
  const allEntityFields: any[] = (fieldConfigs[entityKey] as any[])||[];
  const customFields = allEntityFields.filter(f=>f.is_custom&&f.show_on_admin);
  const projectCols=[{key:"name",label:"Name",editable:true},{key:"city",label:"City",editable:true},{key:"locality",label:"Locality",editable:true},{key:"rera_number",label:"RERA",editable:true},{key:"total_units",label:"Units",editable:true},{key:"is_active",label:"Active",editable:true,type:"boolean"}];
  const towerCols=[{key:"name",label:"Name",editable:true},{key:"total_floors",label:"Floors",editable:true},{key:"total_units",label:"Units",editable:true},{key:"is_active",label:"Active",editable:true,type:"boolean"}];
  const unitCols=[{key:"unit_number",label:"Unit #",editable:true},{key:"unit_type",label:"Type",editable:true},{key:"bedrooms",label:"BHK",editable:true},{key:"floor_number",label:"Floor",editable:true},{key:"area_sqft",label:"Area sqft",editable:true},{key:"base_price",label:"Price ₹",editable:true},{key:"facing",label:"Facing",editable:true},{key:"status",label:"Status",editable:true,type:"select",options:getFieldOptions("status",(allEntityFields as any[])||[],["available","booked","reserved","sold"])},{key:"is_trending",label:"Trending",editable:true,type:"boolean"},{key:"is_featured",label:"Featured",editable:true,type:"boolean"},{key:"view_count",label:"Views",editable:false}];
  const cols = activeTab==="projects"?projectCols:activeTab==="towers"?towerCols:unitCols;
  const entityLabel = activeTab==="projects"?"Project":activeTab==="towers"?"Tower":"Unit";

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900">Data Manager</h1><p className="text-sm text-gray-500 mt-1">Click any cell to edit inline · ✏️ opens full form with custom fields</p></div>
        <div className="flex gap-2 flex-wrap">
          {activeTab==="units"&&<><button onClick={async()=>{try{const res=await adminApi("/admin/units/csv-template");if(!res.ok){const err=await res.json().catch(()=>({detail:"Download failed"}));throw new Error(err.detail||`HTTP ${res.status}`);}const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="units_import_template.csv";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}catch(e:any){setError(e.message||"Failed to download template");}}} className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">⬇ CSV Template</button><button onClick={()=>setShowImportModal(true)} className="px-3 py-2 text-sm border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50">📥 Import CSV</button></>}
          <button onClick={()=>setShowCreateModal(true)} className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600">＋ New {entityLabel}</button>
        </div>
      </div>
      {error&&<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between"><span>{error}</span><button onClick={()=>setError(null)}>✕</button></div>}
      {success&&<div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {(["projects","towers","units"] as EntityType[]).map(tab=>(
          <button key={tab} onClick={()=>{setActiveTab(tab);setSearch("");setFilterProjectId("");setFilterTowerId("");setFilterStatus("");}}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg capitalize transition ${activeTab===tab?"bg-white border border-b-white border-gray-200 text-amber-600 -mb-px":"text-gray-500 hover:text-gray-700"}`}>
            {tab==="projects"?"🏗️":tab==="towers"?"🗼":"🏠"} {tab.charAt(0).toUpperCase()+tab.slice(1)}
            {activeTab===tab&&customFields.length>0&&<span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-xs">{customFields.length} custom</span>}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mb-4">
        <input value={search} onChange={e=>handleSearch(e.target.value)} placeholder={`Search ${activeTab}...`} className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-amber-400"/>
        {(activeTab==="towers"||activeTab==="units")&&<select value={filterProjectId} onChange={e=>setFilterProjectId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"><option value="">All Projects</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>}
        {activeTab==="units"&&<><select value={filterTowerId} onChange={e=>setFilterTowerId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"><option value="">All Towers</option>{towers.filter(t=>!filterProjectId||t.project_id===filterProjectId).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"><option value="">All Status</option>{["available","booked","reserved","sold"].map(s=><option key={s} value={s}>{s}</option>)}</select></>}
      </div>
      {selected.size>0&&<div className="mb-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-sm"><span className="font-medium text-amber-700">{selected.size} selected</span>{isSuperadmin&&<button onClick={bulkDelete} className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">🗑 Delete Selected</button>}<button onClick={()=>setSelected(new Set())} className="px-3 py-1 border border-gray-300 rounded text-xs">Clear</button></div>}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead><tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
            <th className="px-3 py-3"><input type="checkbox" checked={allSel} onChange={toggleAll}/></th>
            {cols.map(c=><th key={c.key} className="px-4 py-3 text-left whitespace-nowrap">{c.label}</th>)}
            <th className="px-4 py-3 text-center">Actions</th>
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={cols.length+2} className="px-4 py-8 text-center text-gray-400 animate-pulse">Loading…</td></tr>
            :data.items.length===0?<tr><td colSpan={cols.length+2} className="px-4 py-8 text-center text-gray-400">No records found</td></tr>
            :data.items.map((item,idx)=>(
              <tr key={item.id} className={`border-b border-gray-100 hover:bg-amber-50 ${selected.has(item.id)?"bg-amber-50":idx%2===0?"bg-white":"bg-gray-50"}`}>
                <td className="px-3 py-3 text-center"><input type="checkbox" checked={selected.has(item.id)} onChange={()=>toggleSelect(item.id)}/></td>
                {cols.map(col=>(
                  <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                    {editingCell?.id===item.id&&editingCell?.field===col.key
                      ?<InlineEditor value={editingCell.value} type={(col as any).type} options={(col as any).options} onChange={v=>setEditingCell({...editingCell,value:v})} onCommit={commitCellEdit} onCancel={()=>setEditingCell(null)}/>
                      :<span onClick={()=>col.editable&&setEditingCell({id:item.id,field:col.key,value:item[col.key]})} className={col.editable?"cursor-pointer hover:text-amber-600 hover:underline":""} title={col.editable?"Click to edit":""}>
                        {col.type==="boolean"?<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item[col.key]?"bg-green-100 text-green-700":"bg-gray-100 text-gray-500"}`}>{item[col.key]?"Yes":"No"}</span>
                        :col.key==="status"?<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item[col.key]==="available"?"bg-green-100 text-green-700":item[col.key]==="booked"?"bg-blue-100 text-blue-700":item[col.key]==="sold"?"bg-red-100 text-red-700":"bg-yellow-100 text-yellow-700"}`}>{item[col.key]}</span>
                        :col.key==="base_price"?`₹${Number(item[col.key]||0).toLocaleString("en-IN")}`
                        :String(item[col.key]??"—")}
                      </span>}
                  </td>
                ))}
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={()=>setEditRecord(item)} className="text-gray-400 hover:text-amber-600" title="Edit all fields incl. custom">✏️</button>
                    <button onClick={()=>duplicate(item.id)} className="text-blue-400 hover:text-blue-600" title="Duplicate">📋</button>
                    {isSuperadmin&&<button onClick={()=>deleteOne(item.id)} className="text-red-400 hover:text-red-600" title="Delete">🗑</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.total_pages>1&&<div className="flex items-center justify-between mt-4 text-sm text-gray-500">
        <span>{data.total} total records</span>
        <div className="flex gap-1">
          <button onClick={()=>loadData(data.page-1)} disabled={data.page===1} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">← Prev</button>
          <span className="px-3 py-1 font-medium">{data.page} / {data.total_pages}</span>
          <button onClick={()=>loadData(data.page+1)} disabled={data.page===data.total_pages} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Next →</button>
        </div>
      </div>}
      {showCreateModal&&<DynamicFormModal mode="create" entity={activeTab} entityKey={entityKey} projects={projects} towers={towers} fieldConfigs={fieldConfigs} onClose={()=>setShowCreateModal(false)} onSaved={()=>{setShowCreateModal(false);loadData(1);flash("Created successfully");}}/>}
      {editRecord&&<DynamicFormModal mode="edit" entity={activeTab} entityKey={entityKey} record={editRecord} projects={projects} towers={towers} fieldConfigs={fieldConfigs} onClose={()=>setEditRecord(null)} onSaved={()=>{setEditRecord(null);loadData(data.page);flash("Updated successfully");}}/>}
      {showImportModal&&activeTab==="units"&&<CsvImportModal towers={towers} fieldConfigs={fieldConfigs} onClose={()=>setShowImportModal(false)} onImported={(r)=>{setShowImportModal(false);loadData(1);flash(`Imported ${r.created} units`);}}/>}
    </div>
  );
}

function InlineEditor({value,type,options,onChange,onCommit,onCancel}:{value:any;type?:string;options?:string[];onChange:(v:any)=>void;onCommit:()=>void;onCancel:()=>void;}) {
  if (type==="boolean") return <div className="flex gap-1"><button onClick={()=>{onChange(true);setTimeout(onCommit,0);}} className={`px-2 py-0.5 text-xs rounded ${value?"bg-green-500 text-white":"bg-gray-200"}`}>Yes</button><button onClick={()=>{onChange(false);setTimeout(onCommit,0);}} className={`px-2 py-0.5 text-xs rounded ${!value?"bg-red-500 text-white":"bg-gray-200"}`}>No</button><button onClick={onCancel} className="text-xs text-gray-400 ml-1">✕</button></div>;
  if (type==="select"&&options) return <select autoFocus value={value||""} onChange={e=>onChange(e.target.value)} onBlur={onCommit} className="border border-amber-400 rounded px-1 py-0.5 text-xs">{options.map(o=><option key={o} value={o}>{o}</option>)}</select>;
  return <input autoFocus type="text" value={value??""} onChange={e=>onChange(e.target.value)} onBlur={onCommit} onKeyDown={e=>{if(e.key==="Enter")onCommit();if(e.key==="Escape")onCancel();}} className="border border-amber-400 rounded px-2 py-0.5 text-sm w-32 focus:outline-none"/>;
}

function FieldInput({fieldDef,value,onChange}:{fieldDef:any;value:any;onChange:(v:any)=>void}) {
  const base="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400";
  const {type,placeholder,options}=fieldDef;
  if (type==="project_select") return <select value={value||""} onChange={e=>onChange(e.target.value)} className={base}><option value="">Select project…</option>{(options||[]).map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select>;
  if (type==="tower_select") return <select value={value||""} onChange={e=>onChange(e.target.value)} className={base}><option value="">Select tower…</option>{(options||[]).map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</select>;
  if (type==="boolean") return <div className="flex gap-3 mt-1">{[{v:true,l:"Yes"},{v:false,l:"No"}].map(o=><label key={String(o.v)} className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={value===o.v} onChange={()=>onChange(o.v)} className="accent-amber-500"/><span className="text-sm">{o.l}</span></label>)}</div>;
  if (type==="select") { const opts=Array.isArray(options)?options:typeof options==="string"?options.split(",").map((s:string)=>s.trim()):[]; return <select value={value||""} onChange={e=>onChange(e.target.value)} className={base}><option value="">Select…</option>{opts.map((o:string)=><option key={o} value={o}>{o}</option>)}</select>; }
  if (type==="textarea") return <textarea rows={3} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""} className={base}/>;
  if (type==="currency") return <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span><input type="number" value={value||""} onChange={e=>onChange(e.target.value===""?"":Number(e.target.value))} placeholder={placeholder||""} className={`${base} pl-7`}/></div>;
  if (type==="number") return <input type="number" value={value||""} onChange={e=>onChange(e.target.value===""?"":Number(e.target.value))} placeholder={placeholder||""} className={base}/>;
  if (type==="date") return <input type="date" value={value?String(value).split("T")[0]:""} onChange={e=>onChange(e.target.value)} className={base}/>;
  if (type==="checkbox") return <div className="flex items-center gap-2 mt-1"><input type="checkbox" checked={!!value} onChange={e=>onChange(e.target.checked)} className="accent-amber-500 w-4 h-4"/><span className="text-sm text-gray-600">{placeholder||"Enable"}</span></div>;
  return <input type={type==="email"?"email":type==="phone"?"tel":"text"} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""} className={base}/>;
}

function DynamicFormModal({mode,entity,entityKey,record,projects,towers,fieldConfigs,onClose,onSaved}:{mode:"create"|"edit";entity:EntityType;entityKey:string;record?:any;projects:any[];towers:any[];fieldConfigs:Record<string,any[]>;onClose:()=>void;onSaved:()=>void;}) {
  const initForm = ()=>{ if(record) return {...record}; if(entity==="projects") return {name:"",city:"",locality:"",rera_number:"",total_units:"",is_active:true}; if(entity==="towers") return {project_id:"",name:"",total_floors:"",total_units:"",is_active:true}; return {tower_id:"",unit_number:"",unit_type:"2BHK",bedrooms:2,bathrooms:2,area_sqft:"",base_price:"",floor_number:1,facing:"East",status:"available"}; };
  const [form,setForm]=useState<any>(initForm);
  const [customValues,setCustomValues]=useState<Record<string,any>>({});
  const [loadingCustom,setLoadingCustom]=useState(false);
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState<string|null>(null);
  const allFields = fieldConfigs[entityKey]||[];
  const customFieldDefs = allFields.filter(f=>f.is_custom&&f.show_on_admin);

  useEffect(()=>{
    if (mode==="edit"&&record?.id&&customFieldDefs.length>0) {
      setLoadingCustom(true);
      adminApi(`/admin/custom-values/${entityKey}/${record.id}`).then(r=>r.json()).then(d=>{
        const map:Record<string,any>={};
        (d||[]).forEach((cv:any)=>{ const fd=customFieldDefs.find(f=>f.id===cv.field_config_id); if(fd) map[fd.field_key]=cv.value; });
        setCustomValues(map);
      }).catch(()=>{}).finally(()=>setLoadingCustom(false));
    }
  },[]);

  async function handleSubmit() {
    setSaving(true); setErr(null);
    try {
      const ep=entity==="projects"?"projects":entity==="towers"?"towers":"units";
      let recordId=record?.id;
      // Only send schema-defined fields to avoid corrupting unrelated fields
      const allowedKeys = schemaFieldDefs.map((f:any) => f.key);
      const filteredForm = Object.fromEntries(Object.entries(form).filter(([k]) => allowedKeys.includes(k)));
      if (mode==="create") {
        const res=await adminApi(`/admin/${ep}`,{method:"POST",body:JSON.stringify(filteredForm)});
        if (!res.ok) { const e=await res.json(); throw new Error(e.detail||"Create failed"); }
        recordId=(await res.json()).id;
      } else {
        const res=await adminApi(`/admin/${ep}/${record.id}`,{method:"PATCH",body:JSON.stringify(filteredForm)});
        if (!res.ok) { const e=await res.json(); throw new Error(e.detail||"Update failed"); }
      }
      if (customFieldDefs.length>0&&recordId) {
        for (const fd of customFieldDefs) {
          const val=customValues[fd.field_key];
          if (val!==undefined&&val!==""&&val!==null) {
            await adminApi("/admin/custom-values",{method:"POST",body:JSON.stringify({field_config_id:fd.id,entity_id:recordId,value:val})});
          }
        }
      }
      onSaved();
    } catch(e:any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  const _entityFields: any[] = (fieldConfigs[entityKey as string]||[]) as any[];
  const schemaFieldDefs = buildSchemaFieldDefs(entity,projects,towers,_entityFields);
  const entityLabel=entity==="projects"?"Project":entity==="towers"?"Tower":"Unit";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div><h2 className="text-lg font-bold">{mode==="create"?`New ${entityLabel}`:`Edit ${entityLabel}`}</h2>{customFieldDefs.length>0&&<p className="text-xs text-amber-600 mt-0.5">Includes {customFieldDefs.length} custom field{customFieldDefs.length>1?"s":""} from Fields Manager</p>}</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {err&&<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{err}</div>}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Core Fields</h3>
            <div className="grid grid-cols-2 gap-4">
              {schemaFieldDefs.map((f:any)=>(
                <div key={f.key} className={f.fullWidth?"col-span-2":""}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <FieldInput fieldDef={{...f,options:f.key==="project_id"?projects:f.key==="tower_id"?towers:f.options,type:f.key==="project_id"?"project_select":f.key==="tower_id"?"tower_select":f.type}} value={form[f.key]} onChange={v=>setForm((p:any)=>({...p,[f.key]:v}))}/>
                </div>
              ))}
            </div>
          </div>
          {customFieldDefs.length>0&&(
            <div className="border-t border-dashed border-amber-200 pt-5">
              <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-3">✦ Custom Fields <span className="text-gray-400 font-normal normal-case">(from Fields Manager — auto-updated)</span></h3>
              {loadingCustom?<div className="text-sm text-gray-400 animate-pulse">Loading…</div>
              :<div className="grid grid-cols-2 gap-4">
                {customFieldDefs.map(f=>(
                  <div key={f.field_key} className={f.field_type==="textarea"?"col-span-2":""}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}{f.is_required&&<span className="text-red-500 ml-1">*</span>}<span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-xs">custom</span></label>
                    <FieldInput fieldDef={{key:f.field_key,type:f.field_type,placeholder:f.placeholder,options:f.field_options}} value={customValues[f.field_key]} onChange={v=>setCustomValues(cv=>({...cv,[f.field_key]:v}))}/>
                    {f.help_text&&<p className="text-xs text-gray-400 mt-1">{f.help_text}</p>}
                  </div>
                ))}
              </div>}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium">{saving?(mode==="create"?"Creating…":"Saving…"):(mode==="create"?`Create ${entityLabel}`:"Save Changes")}</button>
        </div>
      </div>
    </div>
  );
}

// Returns DB-stored options if any, else falls back to defaults
function getFieldOptions(fieldKey:string,fields:any[],defaults:string[]):string[]{
  const f=(fields||[]).find((x:any)=>x.field_key===fieldKey);
  if(f?.field_options&&Array.isArray(f.field_options)&&f.field_options.length>0) return f.field_options;
  return defaults;
}

function buildSchemaFieldDefs(entity:EntityType,projects:any[],towers:any[],entityFields:any[]=[]) {
  if (entity==="projects") return [{key:"name",label:"Project Name *",type:"text",fullWidth:true},{key:"location",label:"Location *",type:"text"},{key:"address",label:"Address",type:"text",fullWidth:true},{key:"city",label:"City",type:"text"},{key:"state",label:"State",type:"text"},{key:"pincode",label:"Pincode",type:"text"},{key:"rera_number",label:"RERA Number",type:"text"},{key:"description",label:"Description",type:"textarea",fullWidth:true},{key:"brochure_url",label:"Brochure URL",type:"text"},{key:"video_url",label:"Video URL",type:"text"},{key:"is_active",label:"Active",type:"boolean"},{key:"is_featured",label:"Featured",type:"boolean"}];
  if (entity==="towers") return [{key:"project_id",label:"Project *",type:"project_select",options:projects,fullWidth:true},{key:"name",label:"Tower Name *",type:"text"},{key:"total_floors",label:"Total Floors",type:"number"},{key:"total_units",label:"Total Units",type:"number"},{key:"is_active",label:"Active",type:"boolean"}];
  return [
    {key:"tower_id",label:"Tower *",type:"tower_select",options:towers,fullWidth:true},
    {key:"unit_number",label:"Unit Number *",type:"text"},
    {key:"unit_type",label:"Unit Type *",type:"select",options:getFieldOptions("unit_type",entityFields,["1BHK","2BHK","3BHK","4BHK","Studio","Villa","Penthouse"])},
    {key:"bedrooms",label:"Bedrooms",type:"number"},
    {key:"bathrooms",label:"Bathrooms",type:"number"},
    {key:"balconies",label:"Balconies",type:"number"},
    {key:"floor_number",label:"Floor Number",type:"number"},
    {key:"area_sqft",label:"Super Built-up Area (sqft) *",type:"number"},
    {key:"carpet_area",label:"Carpet Area (sqft)",type:"number"},
    {key:"plot_area",label:"Plot Area (sqft)",type:"number"},
    {key:"base_price",label:"Base Price (₹) *",type:"currency"},
    {key:"price_per_sqft",label:"Basic Rate per sqft (₹)",type:"currency"},
    {key:"down_payment",label:"Down Payment (₹)",type:"currency"},
    {key:"emi_estimate",label:"EMI Estimate (₹/month)",type:"currency"},
    {key:"token_amount",label:"Token Amount (₹)",type:"currency"},
    {key:"facing",label:"Facing",type:"select",options:getFieldOptions("facing",entityFields,["East","West","North","South","NE","NW","SE","SW"])},
    {key:"status",label:"Status",type:"select",options:getFieldOptions("status",entityFields,["available","booked","reserved","sold"])},
    {key:"is_trending",label:"Trending",type:"boolean"},
    {key:"is_featured",label:"Featured",type:"boolean"},
  ];
}

function CsvImportModal({towers,onClose,onImported,fieldConfigs}:{towers:any[];onClose:()=>void;onImported:(r:any)=>void;fieldConfigs?:Record<string,any[]>;}) {
  const [towerId,setTowerId]=useState(""); const [file,setFile]=useState<File|null>(null);
  const [loading,setLoading]=useState(false); const [err,setErr]=useState<string|null>(null); const [result,setResult]=useState<any>(null);
  const customFields = ((fieldConfigs?.["unit"]||[]) as any[]).filter((f:any)=>f.is_custom&&f.is_visible);
  async function doImport() {
    if (!towerId){setErr("Select a tower");return;} if (!file){setErr("Select a CSV file");return;}
    setLoading(true); setErr(null);
    try {
      const fd=new FormData(); fd.append("file",file);
      const token=localStorage.getItem("admin_token");
      const res=await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/units/csv-import?tower_id=${towerId}`,{method:"POST",headers:{Authorization:`Bearer ${token}`},body:fd});
      const d=await res.json(); if (!res.ok) throw new Error(d.detail||"Failed"); setResult(d);
    } catch(e:any){setErr(e.message);} finally{setLoading(false);}
  }
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="text-lg font-bold">Import Units from CSV</h2><button onClick={onClose} className="text-gray-400 text-xl">✕</button></div>
        <div className="px-6 py-4 space-y-4">
          {err&&<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{err}</div>}
          {result?<div><div className="p-4 bg-green-50 border border-green-200 rounded-lg"><p className="text-green-700 font-medium">✓ Import Complete</p><p className="text-sm text-green-600">Created: {result.created} units</p>{result.errors?.length>0&&<p className="text-sm text-red-600 mt-1">Errors: {result.errors.length} rows</p>}{result.custom_fields_detected?.length>0&&<p className="text-sm text-amber-600 mt-1">Custom fields imported: {result.custom_fields_detected.join(", ")}</p>}</div>{result.errors?.length>0&&<div className="mt-2 max-h-32 overflow-y-auto text-xs text-red-600 space-y-1">{result.errors.map((e:any,i:number)=><p key={i}>Row {e.row}: {e.error}</p>)}</div>}<button onClick={()=>onImported(result)} className="mt-3 w-full py-2 bg-amber-500 text-white rounded-lg text-sm font-medium">Done</button></div>
          :<><div><label className="block text-sm font-medium text-gray-700 mb-1">Tower *</label><select value={towerId} onChange={e=>setTowerId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="">Select tower…</option>{towers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div><div><label className="block text-sm font-medium text-gray-700 mb-1">CSV File *</label><input type="file" accept=".csv" onChange={e=>setFile(e.target.files?.[0]||null)} className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-50 file:text-amber-600"/><p className="text-xs text-gray-400 mt-1">Download the CSV Template first — it includes all custom fields automatically.</p></div>{customFields.length>0&&<div className="p-3 bg-amber-50 border border-amber-200 rounded-lg"><p className="text-xs font-semibold text-amber-700 mb-1">Custom fields included in template:</p><div className="flex flex-wrap gap-1">{customFields.map((f:any)=><span key={f.field_key} className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">{f.label} ({f.field_type})</span>)}</div></div>}<div className="flex justify-end gap-3"><button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg">Cancel</button><button onClick={doImport} disabled={loading} className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg disabled:opacity-50">{loading?"Importing…":"Import"}</button></div></>}
        </div>
      </div>
    </div>
  );
}
