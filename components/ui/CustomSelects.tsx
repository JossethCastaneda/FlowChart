import React, { useState, useEffect, useRef, useId } from "react";
import { X, ChevronDown, Check, Plus } from "lucide-react";

export function CustomMultiSelectPictures({ values, options, onChange, placeholder, disabled, ro }: any) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (ro || disabled) return;
    setOpen(!open);
  };

  const filtered = options.filter((o: any) => o.label.toLowerCase().includes(search.toLowerCase()));
  const grouped: Record<string, any[]> = {};
  filtered.forEach((o: any) => {
    const p = o.portfolio || "Páginas";
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(o);
  });

  return (
    <div ref={ref} className="relative w-full">
      <div
        onClick={handleToggle}
        className={`f-input flex items-center justify-between min-h-[34px] h-auto ${ro || disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <div className="flex items-center gap-1 flex-wrap">
          {values.length === 0 ? <span className="text-muted-foreground text-sm opacity-50">{placeholder}</span> :
            values.map((v: string) => {
              const opt = options.find((o: any) => o.value === v);
              return (
                <span key={v} className="text-[10px] px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded flex items-center gap-1">
                  {opt?.picture && <img src={opt.picture} alt="" className="w-3 h-3 rounded-full object-cover" />}
                  {opt ? opt.label : v}
                  {!ro && <X className="w-2 h-2 cursor-pointer hover:text-blue-300" onClick={(e) => { e.stopPropagation(); onChange(values.filter((x: string) => x !== v)); }} />}
                </span>
              );
            })
          }
        </div>
        {!ro && <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />}
      </div>
      
      {open && !ro && !disabled && (
        <div className="absolute top-full left-0 w-full mt-1 z-50 bg-[#0a0f1e] border border-blue-500/20 max-h-[200px] overflow-y-auto shadow-2xl rounded-lg">
          <div className="p-2 sticky top-0 bg-[#0a0f1e] z-10 border-b border-white/5">
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              className="f-input px-2 py-1.5 text-[11px] bg-white/5 border-none outline-none w-full text-white"
            />
          </div>
          {Object.entries(grouped).map(([portfolio, items]) => (
            <div key={portfolio}>
              <div className="px-2.5 py-1 text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 border-y border-blue-500/10">
                {portfolio}
              </div>
              {items.map((o: any) => {
                const selected = values.includes(o.value);
                return (
                  <div key={o.value} onClick={() => {
                    if (selected) onChange(values.filter((v: string) => v !== o.value));
                    else onChange([...values, o.value]);
                  }} className={`px-2.5 py-2 flex items-center gap-2 cursor-pointer text-[11px] transition-colors ${selected ? "text-blue-400 bg-blue-500/10 hover:bg-blue-500/20" : "text-gray-300 hover:bg-white/10"}`}>
                    <div className={`w-3 h-3 border flex items-center justify-center shrink-0 ${selected ? "border-blue-400 bg-blue-400" : "border-gray-500"}`}>
                      {selected && <Check className="w-2 h-2 text-[#0a0f1e]" />}
                    </div>
                    {o.picture && <img src={o.picture} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />}
                    <span className="truncate">{o.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && <div className="p-2.5 text-[11px] text-gray-500 text-center">Sin opciones disponibles</div>}
        </div>
      )}
    </div>
  );
}

export function TagsInput({ values, onChange, placeholder, ro }: { values: string[]; onChange: (v: string[]) => void; placeholder: string; ro?: boolean }) {
  const [input, setInput] = useState("");

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      const val = input.trim();
      if (val && !values.includes(val)) {
        onChange([...values, val]);
      }
      setInput("");
    } else if (e.key === "Backspace" && !input && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className={`f-input flex items-center gap-1 flex-wrap min-h-[34px] h-auto ${ro ? "cursor-not-allowed opacity-70" : "cursor-text"}`}>
      {values.map((v, i) => (
        <span key={i} className="text-[10px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded flex items-center gap-1 whitespace-nowrap">
          {v}
          {!ro && <X className="w-2 h-2 cursor-pointer hover:text-emerald-400" onClick={() => onChange(values.filter((_, j) => j !== i))} />}
        </span>
      ))}
      {!ro && (
        <input
          type="tel"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            const val = input.trim();
            if (val && !values.includes(val)) {
              onChange([...values, val]);
            }
            setInput("");
          }}
          placeholder={values.length === 0 ? placeholder : "Agregar..."}
          className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-[13px] text-white p-0 placeholder:text-gray-500/50"
        />
      )}
    </div>
  );
}

export function CustomMultiSelect({ values, options, onChange, placeholder, disabled, ro }: any) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o: any) => o.name.toLowerCase().includes(search.toLowerCase()));
  
  const grouped: Record<string, any[]> = {};
  filtered.forEach((o: any) => {
    const p = o.portfolio || "Independientes";
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(o);
  });

  return (
    <div ref={ref} className="relative w-full">
      <div 
        onClick={() => !ro && !disabled && setOpen(!open)}
        className={`f-input flex items-center justify-between min-h-[34px] h-auto ${ro || disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <div className="flex items-center gap-1 flex-wrap">
          {values.length === 0 ? <span className="text-gray-500 text-sm opacity-50">{placeholder}</span> : 
            values.map((v: string) => {
              const opt = options.find((o: any) => o.id === v);
              return (
                <span key={v} className="text-[10px] px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded flex items-center gap-1">
                  {opt ? opt.name : v} 
                  {!ro && <X className="w-2 h-2 cursor-pointer hover:text-blue-300" onClick={(e) => { e.stopPropagation(); onChange(values.filter((x: string) => x !== v)); }} />}
                </span>
              );
            })
          }
        </div>
        {!ro && <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />}
      </div>
      
      {open && !ro && !disabled && (
        <div className="absolute top-full left-0 right-0 z-50 bg-[#0a0f1e] border border-blue-500/20 max-h-[200px] overflow-y-auto mt-1 rounded-lg shadow-2xl">
          <div className="p-2 sticky top-0 bg-[#0a0f1e] z-10 border-b border-white/5">
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              className="f-input px-2 py-1.5 text-[11px] bg-white/5 border-none outline-none w-full text-white" 
            />
          </div>
          {Object.entries(grouped).map(([portfolio, items]) => (
            <div key={portfolio}>
              <div className="px-2.5 py-1 text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 border-y border-blue-500/10">
                {portfolio}
              </div>
              {items.map((o: any) => {
                const selected = values.includes(o.id);
                return (
                  <div key={o.id} onClick={() => {
                    if (selected) onChange(values.filter((v: string) => v !== o.id));
                    else onChange([...values, o.id]);
                  }} className={`px-2.5 py-2 flex items-center gap-2 cursor-pointer text-[11px] transition-colors ${selected ? "text-blue-400 bg-blue-500/10 hover:bg-blue-500/20" : "text-gray-300 hover:bg-white/10"}`}>
                    <div className={`w-3 h-3 border flex items-center justify-center shrink-0 ${selected ? "border-blue-400 bg-blue-400" : "border-gray-500"}`}>
                      {selected && <Check className="w-2 h-2 text-[#0a0f1e]" />}
                    </div>
                    {o.name}
                  </div>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && <div className="p-2.5 text-[11px] text-gray-500 text-center">No hay cuentas publicitarias</div>}
        </div>
      )}
    </div>
  );
}

export function CustomCreatableSelect({ value, options, onChange, placeholder, disabled, ro }: any) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o: any) => o.label.toLowerCase().includes(search.toLowerCase()));
  const exactMatch = options.some((o: any) => o.label.toLowerCase() === search.toLowerCase());

  return (
    <div ref={ref} className="relative w-full">
      <div 
        onClick={() => !ro && !disabled && setOpen(true)}
        className={`f-input flex items-center justify-between p-0 ${ro || disabled ? "cursor-not-allowed opacity-50" : "cursor-text"}`}
      >
        <input 
          type="text" 
          placeholder={placeholder}
          value={open ? search : value}
          onChange={e => { setSearch(e.target.value); setOpen(true); onChange(e.target.value); }}
          onFocus={() => { setOpen(true); setSearch(value); }}
          readOnly={ro || disabled}
          className="w-full h-full bg-transparent border-none outline-none text-[13px] text-white px-3 py-2.5 placeholder:text-gray-500/50"
        />
        {!ro && <ChevronDown className="w-3 h-3 opacity-50 mr-2.5 cursor-pointer shrink-0" onClick={(e) => { e.stopPropagation(); setOpen(!open); }} />}
      </div>
      
      {open && !ro && !disabled && (
        <div className="absolute top-full left-0 right-0 z-50 bg-[#0a0f1e] border border-blue-500/20 max-h-[200px] overflow-y-auto mt-1 rounded-lg shadow-2xl">
          {filtered.map((o: any) => (
            <div key={o.value} onClick={() => { onChange(o.value); setSearch(o.value); setOpen(false); }} 
                 className="px-2.5 py-2 flex items-center gap-2 cursor-pointer text-[11px] text-gray-300 hover:bg-blue-500/10 transition-colors">
              {o.label}
            </div>
          ))}
          {search && !exactMatch && (
            <div onClick={() => { onChange(search); setOpen(false); }} 
                 className="px-2.5 py-2 flex items-center gap-2 cursor-pointer text-[11px] text-emerald-500 hover:bg-emerald-500/10 transition-colors">
              <Plus className="w-3 h-3" /> Crear "{search}"
            </div>
          )}
          {filtered.length === 0 && !search && <div className="p-2.5 text-[11px] text-gray-500 text-center">Empieza a escribir...</div>}
        </div>
      )}
    </div>
  );
}
