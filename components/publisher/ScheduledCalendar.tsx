"use client";

import React from "react";
import { Calendar as CalendarIcon, Clock, CheckCircle, Image as ImageIcon, Globe, Camera } from "lucide-react";

export function ScheduledCalendar() {
  const posts = [
    {
      id: 1,
      text: "¡Lanzamiento de nuestra nueva línea de productos! 🚀 Descubre todas las novedades en nuestra web. #Sodare #Nuevo",
      date: "Hoy, 18:00 hrs",
      status: "Programado",
      channels: ["facebook", "instagram"],
      media: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=200&auto=format&fit=crop"
    },
    {
      id: 2,
      text: "5 tips para mejorar tu estrategia de marketing este 2026. Hilo 🧵👇",
      date: "Mañana, 10:00 hrs",
      status: "Programado",
      channels: ["facebook"],
      media: null
    },
    {
      id: 3,
      text: "Gracias a todos los que asistieron a nuestro webinar de ayer. ¡Estuvo increíble! 👏",
      date: "Ayer, 12:00 hrs",
      status: "Publicado",
      channels: ["instagram"],
      media: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=200&auto=format&fit=crop"
    }
  ];

  return (
    <div className="glass-panel p-6 min-h-[600px] flex flex-col space-y-6">
      
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-cyan-400" />
            Calendario de Publicaciones
          </h3>
          <p className="text-sm text-slate-400">Administra tus publicaciones programadas y publicadas.</p>
        </div>
        
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-xs font-medium bg-slate-800/80 text-white rounded-lg border border-slate-700/50">Mes</button>
          <button className="px-3 py-1.5 text-xs font-medium bg-cyan-600/20 text-cyan-400 rounded-lg border border-cyan-500/50">Lista</button>
        </div>
      </div>

      <div className="flex-1 space-y-4">
        {posts.map(post => (
          <div key={post.id} className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 flex gap-4 hover:border-slate-600 transition-colors group">
            
            {/* Media thumbnail */}
            <div className="w-24 h-24 rounded-lg bg-slate-800 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-700">
              {post.media ? (
                <img src={post.media} alt="thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-600" />
              )}
            </div>

            {/* Post Info */}
            <div className="flex-1 flex flex-col justify-between py-1">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${
                    post.status === 'Programado' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {post.status === 'Programado' ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                    {post.status}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{post.date}</span>
                </div>
                <p className="text-sm text-slate-200 line-clamp-2 pr-4">{post.text}</p>
              </div>
              
              <div className="flex items-center gap-2 mt-3">
                {post.channels.map(ch => (
                  <div key={ch} className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center border border-slate-700">
                    {ch === 'facebook' && <Globe className="w-3 h-3 text-blue-400" />}
                    {ch === 'instagram' && <Camera className="w-3 h-3 text-pink-400" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
              {post.status === 'Programado' && (
                <>
                  <button className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 bg-slate-800 rounded border border-slate-700">Editar</button>
                  <button className="text-xs font-medium text-red-400 hover:text-red-300 px-3 py-1.5 bg-red-900/20 rounded border border-red-900/50">Cancelar</button>
                </>
              )}
              {post.status === 'Publicado' && (
                <button className="text-xs font-medium text-cyan-400 hover:text-cyan-300 px-3 py-1.5 bg-cyan-900/20 rounded border border-cyan-900/50">Ver Post</button>
              )}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
