import { useState } from 'react';
import { Settings, Grid2x2 as Grid, DollarSign, FileText, Play } from 'lucide-react';
import { PayrollElementsManagement } from './PayrollElementsManagement';
import { SalaryGridManagement } from './SalaryGridManagement';
import { TaxParametersManagement } from './TaxParametersManagement';
import { SocialContributionsManagement } from './SocialContributionsManagement';
import PayrollGeneration from './PayrollGeneration';

type TabType = 'generation' | 'elements' | 'grids' | 'tax' | 'social';

export function PayrollAdministration() {
  const [activeTab, setActiveTab] = useState<TabType>('generation');

  const tabs = [
    { id: 'generation' as TabType, label: 'Génération de paie', icon: Play, description: 'Calcul et émission des bulletins' },
    { id: 'elements' as TabType, label: 'Éléments de paie', icon: Settings, description: 'Rubriques paramétrables' },
    { id: 'grids' as TabType, label: 'Grilles salariales', icon: Grid, description: 'Échelles et échelons' },
    { id: 'tax' as TabType, label: 'Paramètres fiscaux', icon: FileText, description: 'IRPP et déductions' },
    { id: 'social' as TabType, label: 'Cotisations sociales', icon: DollarSign, description: 'CNPS et autres' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'generation':
        return <PayrollGeneration />;
      case 'elements':
        return <PayrollElementsManagement />;
      case 'grids':
        return <SalaryGridManagement />;
      case 'tax':
        return <TaxParametersManagement />;
      case 'social':
        return <SocialContributionsManagement />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Administration de la Paie</h1>
        <p className="text-slate-600 mt-1">
          Configuration du système de paie - Référentiel OHADA/Cameroun
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[200px] px-6 py-4 text-left border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <Icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-400'}`} />
                    <span className={`font-medium ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-600'}`}>
                      {tab.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 ml-8">{tab.description}</p>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {renderContent()}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Système paramétrable</h4>
            <p className="text-sm text-blue-800">
              Ce système est conforme au référentiel OHADA, au Code Général des Impôts du Cameroun et à la
              convention des hydrocarbures. Tous les paramètres sont modifiables selon les décisions de l'ADG.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
