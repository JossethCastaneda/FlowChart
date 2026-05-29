"use client";

import React, { useState } from "react";
import { Composer } from "./Composer";
import { ScheduledCalendar } from "./ScheduledCalendar";

export function PublisherTabs() {
  const [activeTab, setActiveTab] = useState("composer");

  return (
    <div className="space-y-6">
      {/* Tabs Navigation */}
      <div className="flex space-x-1 glass-panel p-1 w-fit">
        <button
          onClick={() => setActiveTab("composer")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
            activeTab === "composer"
              ? "bg-white/10 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          Redactor
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
            activeTab === "calendar"
              ? "bg-white/10 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          Calendario Programado
        </button>
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-300">
        {activeTab === "composer" ? <Composer /> : <ScheduledCalendar />}
      </div>
    </div>
  );
}
