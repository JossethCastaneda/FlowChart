"use client";

import React, { useState } from "react";
import { Send, Image as ImageIcon, Paperclip, Clock, Smartphone, MoreHorizontal, Heart, MessageCircle, Share2, Globe, Camera, Briefcase } from "lucide-react";

export function Composer() {
  const [text, setText] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["facebook"]);
  const [media, setMedia] = useState<string | null>("https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop"); // Default placeholder for demo
  const [activePreview, setActivePreview] = useState<string>("facebook");

  const toggleChannel = (channel: string) => {
    setSelectedChannels(prev => 
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    );
    if (!selectedChannels.includes(channel)) {
      setActivePreview(channel);
    }
  };

  const renderFacebookPreview = () => (
    <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-200 max-w-sm mx-auto" style={{ fontFamily: "Arial, sans-serif" }}>
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500"></div>
          <div>
            <div className="text-[13px] font-bold text-slate-900">Sodare Marketing</div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">Justo ahora · 🌎</div>
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-slate-500" />
      </div>
      
      <div className="px-3 pb-3 text-[14px] text-slate-900 whitespace-pre-wrap">
        {text || "Tu increíble contenido aparecerá aquí..."}
      </div>

      {media && (
        <div className="w-full h-64 bg-slate-100">
          <img src={media} alt="Post media" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="px-3 py-2 border-t border-slate-200 flex justify-between mt-1">
        <button className="flex-1 flex justify-center items-center gap-2 text-slate-500 hover:bg-slate-100 py-1 rounded">
          <Heart className="w-4 h-4" /> <span className="text-[13px] font-medium">Me gusta</span>
        </button>
        <button className="flex-1 flex justify-center items-center gap-2 text-slate-500 hover:bg-slate-100 py-1 rounded">
          <MessageCircle className="w-4 h-4" /> <span className="text-[13px] font-medium">Comentar</span>
        </button>
        <button className="flex-1 flex justify-center items-center gap-2 text-slate-500 hover:bg-slate-100 py-1 rounded">
          <Share2 className="w-4 h-4" /> <span className="text-[13px] font-medium">Compartir</span>
        </button>
      </div>
    </div>
  );

  const renderInstagramPreview = () => (
    <div className="bg-black rounded-xl overflow-hidden shadow-lg border border-slate-800 max-w-sm mx-auto text-white" style={{ fontFamily: "-apple-system, sans-serif" }}>
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-amber-500 p-[2px]">
            <div className="w-full h-full rounded-full bg-slate-900"></div>
          </div>
          <div className="text-[13px] font-semibold">sodare.hq</div>
        </div>
        <MoreHorizontal className="w-5 h-5" />
      </div>
      
      {media ? (
        <div className="w-full aspect-square bg-slate-900">
          <img src={media} alt="Post media" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full aspect-square bg-slate-900 flex items-center justify-center text-slate-600">
          <ImageIcon className="w-12 h-12" />
        </div>
      )}

      <div className="p-3 space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex gap-4">
            <Heart className="w-6 h-6" />
            <MessageCircle className="w-6 h-6" />
            <Send className="w-6 h-6" />
          </div>
          <Paperclip className="w-6 h-6" />
        </div>
        
        <div className="text-[13px]">
          <span className="font-semibold mr-2">sodare.hq</span>
          {text || "Tu caption va aquí... #marketing"}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[600px]">
      
      {/* LEFT: COMPOSER */}
      <div className="glass-panel p-6 flex-1 flex flex-col space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Editor de Publicaciones</h3>
          <p className="text-sm text-slate-400">Selecciona canales y redacta un post para todas tus redes.</p>
        </div>

        {/* Channels */}
        <div className="flex gap-3">
          <button 
            onClick={() => toggleChannel('facebook')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedChannels.includes('facebook') ? 'bg-blue-600/20 border-blue-500 text-blue-400 border' : 'bg-slate-800/50 border-slate-700/50 text-slate-500 border'
            }`}
          >
            <Globe className="w-4 h-4" /> Facebook
          </button>
          <button 
            onClick={() => toggleChannel('instagram')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedChannels.includes('instagram') ? 'bg-pink-600/20 border-pink-500 text-pink-400 border' : 'bg-slate-800/50 border-slate-700/50 text-slate-500 border'
            }`}
          >
            <Camera className="w-4 h-4" /> Instagram
          </button>
          <button 
            onClick={() => toggleChannel('linkedin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedChannels.includes('linkedin') ? 'bg-sky-600/20 border-sky-500 text-sky-400 border' : 'bg-slate-800/50 border-slate-700/50 text-slate-500 border'
            }`}
          >
            <Briefcase className="w-4 h-4" /> LinkedIn
          </button>
        </div>

        {/* Text Area */}
        <div className="flex-1 flex flex-col bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden focus-within:border-cyan-500/50 transition-colors">
          <textarea 
            className="flex-1 w-full bg-transparent p-4 text-white resize-none focus:outline-none placeholder:text-slate-600"
            placeholder="¿Qué quieres compartir con tu audiencia hoy?"
            value={text}
            onChange={(e) => setText(e.target.value)}
          ></textarea>
          
          {/* Media preview strip */}
          {media && (
            <div className="px-4 pb-2">
              <div className="relative w-16 h-16 rounded border border-slate-600 overflow-hidden group">
                <img src={media} className="w-full h-full object-cover" alt="attachment" />
                <button onClick={() => setMedia(null)} className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white">
                  &times;
                </button>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between p-3 border-t border-slate-700/50 bg-slate-900/80">
            <div className="flex gap-2">
              <button 
                onClick={() => setMedia("https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop")}
                className="p-2 text-slate-400 hover:text-cyan-400 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors"
                title="Añadir Imagen Demo"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors border border-slate-600/50">
                <Clock className="w-4 h-4" />
                Programar
              </button>
              <button className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg transition-all font-medium shadow-lg shadow-cyan-500/20">
                <Send className="w-4 h-4" />
                Publicar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: LIVE PREVIEW */}
      <div className="glass-panel p-6 w-full lg:w-[450px] flex flex-col bg-slate-950/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-slate-400">
            <Smartphone className="w-5 h-5" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300">Live Preview</h3>
          </div>
          <div className="flex gap-2">
            {selectedChannels.map(ch => (
              <button 
                key={ch}
                onClick={() => setActivePreview(ch)}
                className={`p-1.5 rounded transition-colors ${activePreview === ch ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {ch === 'facebook' && <Globe className="w-4 h-4" />}
                {ch === 'instagram' && <Camera className="w-4 h-4" />}
                {ch === 'linkedin' && <Briefcase className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center overflow-y-auto">
          {activePreview === 'facebook' && selectedChannels.includes('facebook') && renderFacebookPreview()}
          {activePreview === 'instagram' && selectedChannels.includes('instagram') && renderInstagramPreview()}
          {(!selectedChannels.includes(activePreview) || activePreview === 'linkedin') && (
            <div className="text-center text-slate-500 p-8 border border-dashed border-slate-700 rounded-xl">
              Selecciona Facebook o Instagram para ver la previsualización.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
