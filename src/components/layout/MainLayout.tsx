import { ReactNode, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { supabase } from '../../lib/supabase';
import {
  Home, Users, Calendar, GraduationCap, Target,
  FileText, TrendingUp, Settings, Bell, LogOut, Menu, X,
  Briefcase, UserCheck, Shield, Award, Key, Bot, Clock, DollarSign, Network,
  ChevronDown, ChevronRight, Search, ArrowLeft, Lock, Building2
} from 'lucide-react';
import AIAssistant from '../ai/AIAssistant';
import { CommandPalette } from './CommandPalette';
import { Breadcrumb } from './Breadcrumb';
import { NavEntry } from '../../contexts/NavigationContext';

interface MainLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

type NavItem =
  | { id: string; label: string; icon: React.FC<any>; children?: never }
  | { id: string; label: string; icon: React.FC<any>; children: { id: string; label: string; icon: React.FC<any> }[] };

export function MainLayout({ children, activeTab, onTabChange }: MainLayoutProps) {
  const { profile, signOut } = useAuth();
  const { navigate, goBack, canGoBack, recents } = useNavigation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; category: string | null; action_url: string | null; is_read: boolean; created_at: string }>>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadNotifications = notifications.filter((n) => !n.is_read).length;

  const loadNotifications = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, title, message, category, action_url, is_read, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data as any);
  }, [profile?.id]);

  useEffect(() => {
    loadNotifications();
    if (!profile?.id) return;
    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, () => {
        loadNotifications();
      })
      .subscribe();
    const interval = setInterval(loadNotifications, 60000);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [profile?.id, loadNotifications]);

  const handleNotificationClick = async (notif: { id: string; action_url: string | null; is_read: boolean }) => {
    if (!notif.is_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notif.id);
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));
    }
    if (notif.action_url) {
      onTabChange(notif.action_url);
    }
    setNotifOpen(false);
  };

  const markAllRead = async () => {
    if (!profile?.id) return;
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', profile.id)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  useEffect(() => {
    if (profile?.id) loadUserPhoto();
  }, [profile?.id]);

  const loadUserPhoto = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('photo_url')
        .eq('user_id', profile?.id)
        .maybeSingle();
      if (!error && data?.photo_url) setUserPhotoUrl(data.photo_url);
    } catch (error) {
      console.error('Error loading user photo:', error);
    }
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getNavigationItems = (): NavItem[] => {
    const base: NavItem[] = [{ id: 'dashboard', label: 'Tableau de bord', icon: Home }];

    if (profile?.role === 'employee') {
      return [
        ...base,
        { id: 'my-info', label: 'Mes informations', icon: Users },
        { id: 'leave', label: 'Conges & Absences', icon: Calendar },
        { id: 'time-tracking', label: 'Pointage', icon: Clock },
        { id: 'expenses', label: 'Notes de frais', icon: DollarSign },
        { id: 'training', label: 'Formations', icon: GraduationCap },
        { id: 'performance', label: 'Performance', icon: Target },
        { id: 'payslips', label: 'Bulletins de paie', icon: FileText },
        { id: 'documents', label: 'Mes documents', icon: FileText },
        { id: 'org-chart', label: 'Organigramme', icon: Network },
      ];
    }

    if (profile?.role === 'manager') {
      return [
        ...base,
        { id: 'my-info', label: 'Mes informations', icon: Users },
        { id: 'my-team', label: 'Mon equipe', icon: Users },
        { id: 'validations', label: 'Validations', icon: UserCheck },
        { id: 'team-performance', label: 'Performance equipe', icon: Target },
        { id: 'documents', label: 'Mes documents', icon: FileText },
        { id: 'reports', label: 'Rapports', icon: TrendingUp },
      ];
    }

    if (profile?.role === 'drh') {
      return [
        ...base,
        { id: 'my-info', label: 'Mes informations', icon: Users },
        {
          id: 'personnel-group',
          label: 'Personnel',
          icon: Users,
          children: [
            { id: 'employees', label: 'Liste du personnel', icon: Users },
            { id: 'org-chart', label: 'Organigramme', icon: Network },
            { id: 'org-structure', label: 'Structure organisationnelle', icon: Building2 },
            { id: 'skills-matrix', label: 'Gestion des competences', icon: Award },
            { id: 'accounts', label: "Comptes d'acces", icon: Key },
            { id: 'user-roles', label: 'Gestion des roles', icon: Shield },
            { id: 'disciplinary', label: 'Disciplinaire', icon: Shield },
            { id: 'documents', label: 'Documents & Attestations', icon: FileText },
          ],
        },
        {
          id: 'recruitment-group',
          label: 'Recrutement',
          icon: Briefcase,
          children: [
            { id: 'recruitment', label: 'Offres & candidats internes', icon: Briefcase },
            { id: 'cvtheque', label: 'CVtheque', icon: Users },
          ],
        },
        { id: 'training-admin', label: 'Formations', icon: GraduationCap },
        { id: 'performance-admin', label: 'Performance', icon: Target },
        { id: 'payroll', label: 'Paie', icon: FileText },
        { id: 'analytics', label: 'Analytics', icon: TrendingUp },
        { id: 'qvct', label: 'QVCT', icon: Award },
        { id: 'settings', label: 'Parametres', icon: Settings },
      ];
    }

    if (profile?.role === 'admin') {
      return [
        ...base,
        { id: 'my-info', label: 'Mes informations', icon: Users },
        {
          id: 'personnel-group',
          label: 'Personnel',
          icon: Users,
          children: [
            { id: 'employees', label: 'Liste du personnel', icon: Users },
            { id: 'org-chart', label: 'Organigramme', icon: Network },
            { id: 'org-structure', label: 'Structure organisationnelle', icon: Building2 },
            { id: 'skills-matrix', label: 'Gestion des competences', icon: Award },
            { id: 'disciplinary', label: 'Disciplinaire', icon: Shield },
            { id: 'documents', label: 'Documents & Attestations', icon: FileText },
          ],
        },
        {
          id: 'admin-group',
          label: 'Administration',
          icon: Shield,
          children: [
            { id: 'accounts', label: "Comptes d'acces", icon: Key },
            { id: 'user-roles', label: 'Gestion des roles', icon: Users },
            { id: 'role-permissions', label: 'Permissions & Acces', icon: Lock },
          ],
        },
        {
          id: 'recruitment-group',
          label: 'Recrutement',
          icon: Briefcase,
          children: [
            { id: 'recruitment', label: 'Offres & candidats internes', icon: Briefcase },
            { id: 'cvtheque', label: 'CVtheque', icon: Users },
          ],
        },
        { id: 'training-admin', label: 'Formations', icon: GraduationCap },
        { id: 'performance-admin', label: 'Performance', icon: Target },
        { id: 'payroll', label: 'Paie', icon: FileText },
        { id: 'analytics', label: 'Analytics', icon: TrendingUp },
        { id: 'qvct', label: 'QVCT', icon: Award },
        { id: 'settings', label: 'Parametres', icon: Settings },
      ];
    }

    if (profile?.role === 'director') {
      return [
        ...base,
        { id: 'my-info', label: 'Mes informations', icon: Users },
        { id: 'kpi', label: 'Indicateurs RH', icon: TrendingUp },
        { id: 'strategic', label: 'Vue strategique', icon: Target },
        { id: 'reports-dir', label: 'Rapports', icon: FileText },
      ];
    }

    if (profile?.role === 'payroll_manager') {
      return [
        ...base,
        { id: 'my-info', label: 'Mes informations', icon: Users },
        { id: 'payroll', label: 'Paie', icon: FileText },
        { id: 'payslips', label: 'Bulletins', icon: FileText },
      ];
    }

    if (profile?.role === 'recruitment_manager') {
      return [
        ...base,
        { id: 'my-info', label: 'Mes informations', icon: Users },
        { id: 'recruitment', label: 'Offres & candidats', icon: Briefcase },
        { id: 'cvtheque', label: 'CVtheque', icon: Users },
      ];
    }

    if (profile?.role === 'career_manager') {
      return [
        ...base,
        { id: 'my-info', label: 'Mes informations', icon: Users },
        { id: 'skills-matrix', label: 'Gestion des competences', icon: Award },
        {
          id: 'personnel-group',
          label: 'Personnel',
          icon: Users,
          children: [
            { id: 'disciplinary', label: 'Disciplinaire', icon: Shield },
            { id: 'documents', label: 'Documents & Attestations', icon: FileText },
          ],
        },
        { id: 'training-admin', label: 'Formations', icon: GraduationCap },
        { id: 'performance-admin', label: 'Performance', icon: Target },
      ];
    }

    if (profile?.role === 'qvct_manager') {
      return [
        ...base,
        { id: 'my-info', label: 'Mes informations', icon: Users },
        { id: 'qvct', label: 'QVCT', icon: Award },
      ];
    }

    return base;
  };

  const navigationItems = getNavigationItems();

  const allFlatItems = (): NavEntry[] => {
    const entries: NavEntry[] = [];
    for (const item of navigationItems) {
      if ('children' in item && item.children) {
        for (const child of item.children) {
          entries.push({ id: child.id, label: child.label, parentLabel: item.label });
        }
      } else {
        entries.push({ id: item.id, label: item.label });
      }
    }
    return entries;
  };

  const getLabelForTab = (tabId: string): NavEntry => {
    for (const item of navigationItems) {
      if ('children' in item && item.children) {
        const child = item.children.find((c) => c.id === tabId);
        if (child) return { id: child.id, label: child.label, parentLabel: item.label };
      }
      if (item.id === tabId) return { id: item.id, label: item.label };
    }
    return { id: tabId, label: tabId };
  };

  const handleTabChange = useCallback((id: string) => {
    const entry = getLabelForTab(id);
    navigate(entry);
    onTabChange(id);
  }, [navigationItems, navigate, onTabChange]);

  const handleBack = () => {
    const prev = goBack();
    if (prev) onTabChange(prev.id);
  };

  useEffect(() => {
    setExpandedGroups((prev) => {
      const updated = { ...prev };
      navigationItems.forEach((item) => {
        if ('children' in item && item.children) {
          const hasActive = item.children.some((c) => c.id === activeTab);
          if (hasActive && !updated[item.id]) updated[item.id] = true;
        }
      });
      return updated;
    });
  }, [activeTab]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const isChildActive = (item: NavItem) =>
    'children' in item && item.children ? item.children.some((c) => c.id === activeTab) : false;

  const currentEntry = getLabelForTab(activeTab);

  const handleAINavigation = (action: string) => {
    const actionMap: { [key: string]: string } = {
      show_profile: 'my-info',
      show_documents: 'documents',
      show_orgchart: 'org-chart',
      show_qvct: 'qvct',
      show_qvct_discussions: 'qvct-discussions',
      show_leaves: 'leave',
      create_leave: 'leave',
      show_validations: 'validations',
      show_payslips: 'payslips',
      show_time: 'time-tracking',
      show_expenses: 'expenses',
      show_trainings: 'training',
      show_performance: 'performance',
      show_my_team: 'my-team',
      show_team_performance: 'team-performance',
      show_employees: 'employees',
      create_employee: 'employees',
      show_user_roles: 'user-roles',
      show_role_permissions: 'role-permissions',
      show_accounts: 'accounts',
      show_settings: 'settings',
      show_disciplinary: 'disciplinary',
      show_skills: 'skills-matrix',
      show_analytics: 'analytics',
      show_recruitment: 'recruitment',
      create_job_opening: 'recruitment',
      generate_payroll: 'payroll',
      show_payroll_elements: 'payroll-elements',
      show_salary_grids: 'salary-grids',
      show_tax_parameters: 'tax-parameters',
      show_social_contributions: 'social-contributions',
      show_training_admin: 'training-admin',
      show_performance_admin: 'performance-admin',
    };
    const tab = actionMap[action];
    if (tab) {
      handleTabChange(tab);
      setIsAIAssistantOpen(false);
    }
  };

  const roleLabel: Record<string, string> = {
    admin: 'Administrateur',
    drh: 'DRH',
    manager: 'Manager',
    employee: 'Employe',
    director: 'Directeur',
    payroll_manager: 'Gest. Paie',
    recruitment_manager: 'Gest. Recrutement',
    career_manager: 'Gest. Carrieres',
    qvct_manager: 'Gest. QVCT',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2.5">
              <img src="/logoSNH.png" alt="SNH Logo" className="h-9 w-auto" />
              <div className="hidden md:block">
                <h1 className="text-sm font-bold text-snh-green leading-tight">SNH RH</h1>
                <p className="text-[10px] text-slate-500 leading-tight">Ressources Humaines</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setPaletteOpen(true)}
            className="flex-1 max-w-xs hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 text-sm transition group"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left">Rechercher...</span>
            <kbd className="text-xs bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-400 group-hover:text-slate-600 transition">
              ⌘K
            </kbd>
          </button>

          <div className="flex items-center gap-2 flex-shrink-0">
            {canGoBack && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500 hover:text-slate-900"
                title="Retour"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setPaletteOpen(true)}
              className="sm:hidden p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <Search className="w-4 h-4 text-slate-600" />
            </button>

            <button
              onClick={() => setIsAIAssistantOpen(true)}
              className="relative p-2 rounded-full transition group"
              title="Assistant IA"
            >
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-300 to-teal-300 blur-md opacity-50 group-hover:opacity-80 transition"></span>
              <span className="relative w-7 h-7 rounded-full bg-gradient-to-br from-sky-100 via-white to-teal-100 flex items-center justify-center shadow-sm border border-white">
                <Bot className="w-4 h-4 text-sky-600" />
              </span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-400 rounded-full border-2 border-white animate-pulse"></span>
            </button>

            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative p-2 hover:bg-slate-100 rounded-lg transition"
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-slate-600" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                      <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                      {unreadNotifications > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Tout marquer comme lu
                        </button>
                      )}
                    </div>

                    <div className="max-h-[28rem] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-10 text-center">
                          <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">Aucune notification</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {notifications.map((notif) => (
                            <button
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition flex items-start gap-3 ${
                                !notif.is_read ? 'bg-blue-50/60' : ''
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notif.is_read ? 'bg-slate-300' : 'bg-blue-500'}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${notif.is_read ? 'text-slate-700' : 'text-slate-900 font-semibold'}`}>
                                  {notif.title}
                                </p>
                                <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{notif.message}</p>
                                <p className="text-[11px] text-slate-400 mt-1">
                                  {new Date(notif.created_at).toLocaleString('fr-FR', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="text-right hidden lg:block">
                <p className="text-xs font-semibold text-slate-900 leading-tight">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {roleLabel[profile?.role ?? ''] ?? profile?.role}
                </p>
              </div>
              {userPhotoUrl ? (
                <img
                  src={userPhotoUrl}
                  alt={`${profile?.first_name} ${profile?.last_name}`}
                  className="w-8 h-8 rounded-full object-cover border-2 border-snh-green"
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-snh-green to-snh-green-dark rounded-full flex items-center justify-center text-white text-xs font-semibold">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className={`
          fixed lg:sticky top-14 left-0 h-[calc(100vh-3.5rem)] bg-white border-r border-slate-200
          transition-all duration-300 z-30 flex flex-col overflow-hidden
          ${sidebarOpen ? 'w-60 translate-x-0' : 'w-0 -translate-x-full lg:w-0 lg:translate-x-0'}
        `}>
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {recents.filter((r) => r.id !== activeTab && r.id !== 'dashboard').length > 0 && (
              <div className="px-3 pt-3 pb-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-2 mb-1">Recents</p>
                <div className="flex flex-col gap-0.5">
                  {recents
                    .filter((r) => r.id !== activeTab && r.id !== 'dashboard')
                    .slice(0, 3)
                    .map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleTabChange(r.id)}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-slate-100 transition group"
                      >
                        <Clock className="w-3 h-3 text-slate-300 group-hover:text-slate-500 flex-shrink-0" />
                        <span className="text-xs text-slate-500 group-hover:text-slate-800 truncate">{r.label}</span>
                      </button>
                    ))}
                </div>
                <div className="mt-2 border-t border-slate-100" />
              </div>
            )}

            <nav className="p-3 space-y-0.5">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const hasChildren = 'children' in item && Array.isArray(item.children) && item.children.length > 0;
                const isExpanded = expandedGroups[item.id] ?? false;
                const childIsActive = isChildActive(item);

                if (hasChildren && item.children) {
                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => toggleGroup(item.id)}
                        className={`
                          w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition text-left
                          ${childIsActive
                            ? 'bg-green-50 text-snh-green'
                            : 'text-slate-700 hover:bg-slate-100'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm font-medium flex-1 truncate">{item.label}</span>
                        {isExpanded
                          ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                          : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                        }
                      </button>

                      {isExpanded && (
                        <div className="mt-0.5 ml-3 pl-3 border-l-2 border-slate-100 space-y-0.5">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            const isChildItemActive = activeTab === child.id;
                            return (
                              <button
                                key={child.id}
                                onClick={() => {
                                  handleTabChange(child.id);
                                  if (window.innerWidth < 1024) setSidebarOpen(false);
                                }}
                                className={`
                                  w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition text-left
                                  ${isChildItemActive
                                    ? 'bg-snh-green text-white'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                  }
                                `}
                              >
                                <ChildIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="text-sm font-medium truncate">{child.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                if (item.id === 'settings') return null;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleTabChange(item.id);
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition text-left
                      ${isActive
                        ? 'bg-snh-green text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-3 border-t border-slate-100 space-y-0.5 flex-shrink-0">
            <button
              onClick={() => handleTabChange('settings')}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition text-left
                ${activeTab === 'settings'
                  ? 'bg-snh-green text-white'
                  : 'text-slate-700 hover:bg-slate-100'
                }
              `}
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Parametres</span>
            </button>

            <button
              onClick={signOut}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-red-50 hover:text-red-600 transition text-left"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Deconnexion</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-5 lg:p-7 min-h-[calc(100vh-3.5rem)]">
          <Breadcrumb current={currentEntry} onNavigate={handleTabChange} />
          {children}
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={handleTabChange}
        allItems={allFlatItems()}
        recents={recents}
      />

      <AIAssistant
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        onNavigate={handleAINavigation}
      />
    </div>
  );
}
