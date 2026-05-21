import React, { useState, useEffect, useRef } from 'react';
import {
  X, Mic, MicOff, Send, Loader2, FileText, Volume2, VolumeX, Minimize2, Maximize2,
  Bot, Sparkles, BarChart3, Users, Calendar, DollarSign, GraduationCap, Briefcase,
  Heart, Shield, TrendingUp, ChevronDown, ChevronUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Suggestion {
  label: string;
  action: string;
  description?: string;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: string;
  suggestions?: Suggestion[];
}

const ROLE_WELCOME: Record<string, { title: string; intro: string; suggestions: Suggestion[] }> = {
  employee: {
    title: 'Assistant RH — Employe',
    intro: "Bonjour ! Je peux vous aider a poser un conge, consulter votre paie, remplir une note de frais ou suivre vos formations.",
    suggestions: [
      { label: 'Mes bulletins', action: 'show_payslips' },
      { label: 'Poser un conge', action: 'create_leave' },
      { label: 'Pointage', action: 'show_time' },
      { label: 'Notes de frais', action: 'show_expenses' },
      { label: 'Mes formations', action: 'show_trainings' },
      { label: 'Ma performance', action: 'show_performance' },
      { label: 'Discussions QVCT', action: 'show_qvct_discussions' },
    ],
  },
  manager: {
    title: 'Assistant RH — Manager',
    intro: "Bonjour ! Je peux vous aider a gerer votre equipe, traiter les demandes de conge et suivre la performance.",
    suggestions: [
      { label: 'Mon equipe', action: 'show_my_team' },
      { label: 'Validations conges', action: 'show_validations' },
      { label: 'Performance equipe', action: 'show_team_performance' },
      { label: 'Liste du personnel', action: 'show_employees' },
    ],
  },
  drh: {
    title: 'Assistant RH — DRH',
    intro: "Bonjour ! Je peux lancer la paie, ouvrir un recrutement, ajouter un employe ou generer un rapport.",
    suggestions: [
      { label: 'Generer la paie', action: 'generate_payroll' },
      { label: 'Ajouter un employe', action: 'create_employee' },
      { label: 'Recrutement', action: 'show_recruitment' },
      { label: 'Analytics RH', action: 'show_analytics' },
      { label: 'Roles & acces', action: 'show_user_roles' },
      { label: 'QVCT', action: 'show_qvct' },
    ],
  },
  admin: {
    title: 'Assistant RH — Administrateur',
    intro: "Bonjour ! Je peux ouvrir les permissions, les comptes, les parametres et lancer la paie.",
    suggestions: [
      { label: 'Generer la paie', action: 'generate_payroll' },
      { label: 'Permissions & acces', action: 'show_role_permissions' },
      { label: 'Comptes d\'acces', action: 'show_accounts' },
      { label: 'Parametres', action: 'show_settings' },
      { label: 'Analytics RH', action: 'show_analytics' },
    ],
  },
  director: {
    title: 'Assistant RH — Direction',
    intro: "Bonjour ! Voici vos indicateurs strategiques et rapports.",
    suggestions: [
      { label: 'KPI RH', action: 'show_analytics' },
      { label: 'Rapport', action: 'generate_report' },
      { label: 'Organigramme', action: 'show_orgchart' },
    ],
  },
  payroll_manager: {
    title: 'Assistant RH — Gestionnaire Paie',
    intro: "Bonjour ! Je peux lancer la generation de paie et ouvrir les parametres fiscaux et sociaux.",
    suggestions: [
      { label: 'Generer la paie', action: 'generate_payroll' },
      { label: 'Elements de paie', action: 'show_payroll_elements' },
      { label: 'Grilles salariales', action: 'show_salary_grids' },
      { label: 'IRPP / Impots', action: 'show_tax_parameters' },
      { label: 'CNPS', action: 'show_social_contributions' },
      { label: 'Bulletins', action: 'show_payslips' },
    ],
  },
  recruitment_manager: {
    title: 'Assistant RH — Recrutement',
    intro: "Bonjour ! Je peux ouvrir le recrutement, creer une offre ou afficher le personnel.",
    suggestions: [
      { label: 'Recrutement', action: 'show_recruitment' },
      { label: 'Nouvelle offre', action: 'create_job_opening' },
      { label: 'Personnel', action: 'show_employees' },
      { label: 'Analytics', action: 'show_analytics' },
    ],
  },
  career_manager: {
    title: 'Assistant RH — Carrieres',
    intro: "Bonjour ! Je peux ouvrir les evaluations, les formations et le disciplinaire.",
    suggestions: [
      { label: 'Evaluations', action: 'show_performance_admin' },
      { label: 'Formations', action: 'show_training_admin' },
      { label: 'Disciplinaire', action: 'show_disciplinary' },
      { label: 'Documents & Attestations', action: 'show_documents' },
    ],
  },
  qvct_manager: {
    title: 'Assistant RH — QVCT',
    intro: "Bonjour ! Je peux ouvrir l'administration QVCT et les discussions en cours.",
    suggestions: [
      { label: 'Administration QVCT', action: 'show_qvct' },
      { label: 'Discussions QVCT', action: 'show_qvct_discussions' },
    ],
  },
};

interface ReportTemplate {
  id: string;
  label: string;
  description: string;
  icon: typeof Bot;
  color: string;
  roles: string[];
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: 'employees_summary', label: 'Effectifs', description: 'Synthese des employes actifs', icon: Users, color: 'bg-blue-50 text-blue-700 border-blue-200', roles: ['drh', 'admin', 'director', 'career_manager'] },
  { id: 'leaves_monthly', label: 'Conges du mois', description: 'Demandes et soldes de conges', icon: Calendar, color: 'bg-amber-50 text-amber-700 border-amber-200', roles: ['drh', 'admin', 'director', 'manager', 'career_manager'] },
  { id: 'attendance_report', label: 'Presences', description: 'Pointages et assiduite', icon: Shield, color: 'bg-teal-50 text-teal-700 border-teal-200', roles: ['drh', 'admin', 'director', 'manager', 'career_manager'] },
  { id: 'payroll_report', label: 'Masse salariale', description: 'Synthese paie et remuneration', icon: DollarSign, color: 'bg-green-50 text-green-700 border-green-200', roles: ['drh', 'admin', 'director', 'payroll_manager'] },
  { id: 'training_report', label: 'Formations', description: 'Programmes et participations', icon: GraduationCap, color: 'bg-cyan-50 text-cyan-700 border-cyan-200', roles: ['drh', 'admin', 'director', 'career_manager'] },
  { id: 'recruitment_report', label: 'Recrutement', description: 'Offres, candidats, embauches', icon: Briefcase, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', roles: ['drh', 'admin', 'director', 'recruitment_manager'] },
  { id: 'performance_report', label: 'Performance', description: 'Evaluations et objectifs', icon: TrendingUp, color: 'bg-orange-50 text-orange-700 border-orange-200', roles: ['drh', 'admin', 'director', 'career_manager', 'manager'] },
  { id: 'qvct_report', label: 'QVCT', description: 'Bien-etre et securite', icon: Heart, color: 'bg-pink-50 text-pink-700 border-pink-200', roles: ['drh', 'admin', 'director', 'qvct_manager'] },
  { id: 'analytics_overview', label: 'Vue d\'ensemble', description: 'Indicateurs cles RH', icon: BarChart3, color: 'bg-slate-50 text-slate-700 border-slate-200', roles: ['drh', 'admin', 'director'] },
];

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (action: string) => void;
}

export default function AIAssistant({ isOpen, onClose, onNavigate }: AIAssistantProps) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcome = profile?.role ? ROLE_WELCOME[profile.role] : null;
      if (welcome) {
        addMessage('assistant', `${welcome.intro}\n\nSuggestions adaptees a votre role :`, undefined, welcome.suggestions);
      } else {
        addMessage('assistant', "Bonjour ! Je suis votre assistant RH. Comment puis-je vous aider aujourd'hui ?");
      }
    }
  }, [isOpen, profile?.role]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'fr-FR';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    synthRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const addMessage = (
    type: 'user' | 'assistant',
    content: string,
    action?: string,
    suggestions?: Suggestion[],
  ) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        content,
        timestamp: new Date(),
        action,
        suggestions,
      },
    ]);
  };

  const runAction = (action: string) => {
    if (!action || !onNavigate) return;
    onNavigate(action);
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('La reconnaissance vocale n\'est pas supportée par votre navigateur.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speak = (text: string) => {
    if (!synthRef.current) return;

    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const toggleSpeech = () => {
    if (!synthRef.current) return;

    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !user) return;

    const userMessage = inputText.trim();
    addMessage('user', userMessage);
    setInputText('');
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: userMessage,
          userId: user.id,
          context: {
            role: profile?.role,
            employeeId: profile?.employee_id,
          },
        },
      });

      if (error) throw error;

      if (data.success) {
        addMessage('assistant', data.message, data.action, data.suggestions);
        speak(data.message);

        if (data.action && data.action !== 'show_help' && data.action !== 'generate_report' && onNavigate) {
          setTimeout(() => {
            onNavigate(data.action);
          }, 1500);
        }

        if (data.action === 'generate_report') {
          await handleGenerateReport(userMessage);
        }
      } else {
        addMessage('assistant', data.message || 'Une erreur s\'est produite.');
      }
    } catch (error) {
      console.error('Error:', error);
      addMessage('assistant', 'Désolé, une erreur s\'est produite. Veuillez réessayer.');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateReportByType = async (reportType: string) => {
    if (!user) return;
    setIsGeneratingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-report', {
        body: { reportType, parameters: {}, userId: user.id },
      });
      if (error) throw error;
      if (data?.success && data.html) {
        const blob = new Blob([data.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        if (newWindow) {
          newWindow.document.title = `Rapport - ${new Date().toLocaleDateString('fr-FR')}`;
        }
        addMessage('assistant', 'Le rapport a ete genere et ouvert dans un nouvel onglet. Vous pouvez l\'imprimer en PDF depuis votre navigateur (Ctrl+P).');
      } else {
        addMessage('assistant', 'Impossible de generer le rapport pour le moment.');
      }
    } catch (err) {
      console.error('Report error:', err);
      addMessage('assistant', 'Erreur lors de la generation du rapport.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleGenerateReport = async (query: string) => {
    setIsGeneratingReport(true);

    try {
      let reportType = 'default';
      const q = query.toLowerCase();
      if (q.includes('congé') || q.includes('conge')) reportType = 'leaves_monthly';
      else if (q.includes('présence') || q.includes('presence') || q.includes('attendance') || q.includes('pointage')) reportType = 'attendance_report';
      else if (q.includes('paie') || q.includes('salaire') || q.includes('masse')) reportType = 'payroll_report';
      else if (q.includes('formation') || q.includes('training')) reportType = 'training_report';
      else if (q.includes('recrut') || q.includes('candidat')) reportType = 'recruitment_report';
      else if (q.includes('performance') || q.includes('evaluation')) reportType = 'performance_report';
      else if (q.includes('qvct') || q.includes('bien-etre') || q.includes('bien etre')) reportType = 'qvct_report';
      else if (q.includes('effectif') || q.includes('employe')) reportType = 'employees_summary';
      else if (q.includes('analytics') || q.includes('indicateur') || q.includes('kpi')) reportType = 'analytics_overview';

      const { data, error } = await supabase.functions.invoke('generate-ai-report', {
        body: {
          reportType,
          parameters: {},
          userId: user?.id,
        },
      });

      if (error) throw error;

      if (data.success) {
        const blob = new Blob([data.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');

        if (newWindow) {
          newWindow.document.title = `Rapport - ${new Date().toLocaleDateString('fr-FR')}`;
          addMessage('assistant', 'Le rapport a ete genere et ouvert dans un nouvel onglet. Vous pouvez l\'imprimer en PDF depuis votre navigateur (Ctrl+P).');
        }
      }
    } catch (error) {
      console.error('Report generation error:', error);
      addMessage('assistant', 'Erreur lors de la génération du rapport. Veuillez réessayer.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  if (!isOpen) return null;

  const availableReports = REPORT_TEMPLATES.filter(
    (r) => !profile?.role || r.roles.includes(profile.role)
  );

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        ref={windowRef}
        className="pointer-events-auto bg-white rounded-2xl shadow-2xl flex flex-col absolute overflow-hidden border border-slate-200"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: isMinimized ? '300px' : '620px',
          height: isMinimized ? '64px' : '640px',
          transition: isDragging ? 'none' : 'width 0.3s, height 0.3s',
        }}
      >
        <div
          className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-sky-50 via-cyan-50 to-teal-50 text-slate-800 cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-300 to-teal-300 blur-md opacity-60 animate-pulse"></div>
              <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-sky-100 via-white to-teal-100 flex items-center justify-center shadow-inner border border-white/80">
                <Bot className="w-5 h-5 text-sky-600" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white animate-pulse"></span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-1.5">
                Assistant IA RH
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </h2>
              {!isMinimized && <p className="text-xs text-slate-500">Conversez, generez des etats a la demande</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 hover:bg-white/60 rounded-lg transition-colors text-slate-600"
              title={isMinimized ? 'Agrandir' : 'Reduire'}
            >
              {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/60 rounded-lg transition-colors text-slate-600"
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {availableReports.length > 0 && (
              <div className="border-b border-slate-100 bg-white">
                <button
                  type="button"
                  onClick={() => setShowReports((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-600" />
                    Generation d'etats a la demande
                    <span className="text-xs text-slate-400 font-normal">({availableReports.length})</span>
                  </span>
                  {showReports ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {showReports && (
                  <div className="px-3 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableReports.map((report) => {
                      const Icon = report.icon;
                      return (
                        <button
                          key={report.id}
                          type="button"
                          disabled={isGeneratingReport}
                          onClick={() => generateReportByType(report.id)}
                          className={`${report.color} border rounded-lg p-2.5 text-left hover:shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={report.description}
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <Icon className="w-3.5 h-3.5" />
                            <span className="text-xs font-semibold">{report.label}</span>
                          </div>
                          <p className="text-[10px] opacity-75 line-clamp-1">{report.description}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 ${
                      message.type === 'user'
                        ? 'bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-sm'
                        : 'bg-white text-slate-800 shadow-sm border border-slate-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.type === 'assistant' && message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {message.suggestions.map((s, idx) => (
                          <button
                            key={`${s.action}-${idx}`}
                            onClick={() => runAction(s.action)}
                            className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full hover:bg-blue-100 hover:border-blue-300 transition"
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-xs mt-1 opacity-70">
                      {message.timestamp.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-sky-600" />
                      <span className="text-sm text-slate-600">L'assistant reflechit...</span>
                    </div>
                  </div>
                </div>
              )}
              {isGeneratingReport && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-sky-600" />
                      <FileText size={16} className="text-sky-600" />
                      <span className="text-sm text-slate-600">Generation du rapport...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-white rounded-b-lg">
              <div className="flex gap-2">
                <button
                  onClick={toggleVoiceInput}
                  disabled={isProcessing}
                  className={`p-3 rounded-lg transition-colors ${
                    isListening
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50`}
                  title={isListening ? 'Arrêter l\'écoute' : 'Activer la commande vocale'}
                >
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                <button
                  onClick={toggleSpeech}
                  disabled={!isSpeaking}
                  className={`p-3 rounded-lg transition-colors ${
                    isSpeaking
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-400'
                  } disabled:opacity-50`}
                  title={isSpeaking ? 'Arrêter la synthèse vocale' : 'Synthèse vocale'}
                >
                  {isSpeaking ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Tapez votre message ou utilisez la voix..."
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />

                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isProcessing}
                  className="px-5 py-3 bg-gradient-to-br from-sky-500 to-teal-500 text-white rounded-xl hover:from-sky-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-sm"
                >
                  {isProcessing ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>

              {isListening && (
                <div className="mt-2 flex items-center justify-center gap-2 text-sm text-rose-500 font-medium animate-pulse">
                  <Mic className="w-4 h-4" />
                  En ecoute... Parlez maintenant
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
