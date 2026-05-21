import React, { useState } from 'react';
import {
  FolderOpen, Target, Award, BarChart2, Users
} from 'lucide-react';
import CaseTracking from './performance/CaseTracking';
import AnnualObjectives from './performance/AnnualObjectives';
import HREvaluation from './performance/HREvaluation';
import PerformanceDashboardHR from './performance/PerformanceDashboardHR';
import Feedback360 from './performance/Feedback360';

type TabType =
  | 'dashboard'
  | 'cases'
  | 'objectives'
  | 'evaluation'
  | 'feedback360';

const TABS: { id: TabType; name: string; icon: React.ComponentType<any>; description: string }[] = [
  {
    id: 'dashboard',
    name: 'Tableau de bord',
    icon: BarChart2,
    description: 'Vue consolidée RH — scores, dossiers, mentions par agent et par direction',
  },
  {
    id: 'cases',
    name: 'Suivi des dossiers',
    icon: FolderOpen,
    description: 'Traçabilité opérationnelle — affectation, délais, complexité pondérée, qualité',
  },
  {
    id: 'objectives',
    name: 'Feuille de route',
    icon: Target,
    description: 'Objectifs annuels, poids, indicateurs, auto-évaluation',
  },
  {
    id: 'evaluation',
    name: 'Évaluation RH',
    icon: Award,
    description: 'Note calculée (40/35/15/10%), ajustement hiérarchique justifié, validation RH',
  },
  {
    id: 'feedback360',
    name: 'Feedback 360°',
    icon: Users,
    description: 'Retours multi-sources : pairs, N+1, auto-évaluation',
  },
];

export default function PerformanceManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const activeTabDef = TABS.find(t => t.id === activeTab)!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestion de la Performance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Évaluation intégrée : suivi opérationnel des dossiers · feuille de route annuelle · évaluation RH
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-2xl border border-gray-200 overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex overflow-x-auto scrollbar-hide" aria-label="Tabs">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group relative flex-shrink-0 inline-flex items-center gap-2 px-5 py-4
                    border-b-2 text-sm font-medium transition-colors whitespace-nowrap
                    ${isActive
                      ? 'border-blue-600 text-blue-700 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-white/70'
                    }
                  `}
                >
                  <Icon
                    className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}`}
                  />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab description */}
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">{activeTabDef.name} — </span>
            {activeTabDef.description}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'dashboard'   && <PerformanceDashboardHR />}
          {activeTab === 'cases'       && <CaseTracking />}
          {activeTab === 'objectives'  && <AnnualObjectives />}
          {activeTab === 'evaluation'  && <HREvaluation />}
          {activeTab === 'feedback360' && <Feedback360 />}
        </div>
      </div>
    </div>
  );
}
