import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Save, AlertCircle, CheckCircle, Building2, Mail, Phone, MapPin,
  Calendar, Users, DollarSign, FileText, Shield, Bell, Palette,
  Globe, Clock, Database, Key, RefreshCw
} from 'lucide-react';

interface CompanySettings {
  company_name: string;
  company_siret: string;
  company_address: string;
  company_city: string;
  company_postal_code: string;
  company_phone: string;
  company_email: string;
  default_work_hours: number;
  default_leave_days: number;
  currency: string;
  date_format: string;
  timezone: string;
  language: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  leave_requests: boolean;
  payroll_ready: boolean;
  training_reminders: boolean;
  system_alerts: boolean;
  qvct_new_events: boolean;
  qvct_new_discussions: boolean;
  qvct_discussion_replies: boolean;
  qvct_new_communications: boolean;
}

interface SecuritySettings {
  password_expiry_days: number;
  force_password_change: boolean;
  two_factor_enabled: boolean;
  session_timeout_minutes: number;
}

export default function Settings() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    company_name: 'SNH - Société Nouvelle des Hydrocarbures',
    company_siret: '123 456 789 00012',
    company_address: '123 Avenue des Champs',
    company_city: 'Paris',
    company_postal_code: '75008',
    company_phone: '+33 1 23 45 67 89',
    company_email: 'contact@snh.com',
    default_work_hours: 35,
    default_leave_days: 25,
    currency: 'XAF',
    date_format: 'DD/MM/YYYY',
    timezone: 'Europe/Paris',
    language: 'fr-FR',
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_notifications: true,
    leave_requests: true,
    payroll_ready: true,
    training_reminders: true,
    system_alerts: true,
    qvct_new_events: true,
    qvct_new_discussions: true,
    qvct_discussion_replies: true,
    qvct_new_communications: true,
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    password_expiry_days: 90,
    force_password_change: true,
    two_factor_enabled: false,
    session_timeout_minutes: 60,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: systemSettings } = await supabase
        .from('system_settings')
        .select('*')
        .maybeSingle();

      if (systemSettings) {
        setCompanySettings({
          company_name: systemSettings.company_name || companySettings.company_name,
          company_siret: systemSettings.company_siret || companySettings.company_siret,
          company_address: systemSettings.company_address || companySettings.company_address,
          company_city: systemSettings.company_city || companySettings.company_city,
          company_postal_code: systemSettings.company_postal_code || companySettings.company_postal_code,
          company_phone: systemSettings.company_phone || companySettings.company_phone,
          company_email: systemSettings.company_email || companySettings.company_email,
          default_work_hours: systemSettings.default_work_hours || companySettings.default_work_hours,
          default_leave_days: systemSettings.default_leave_days || companySettings.default_leave_days,
          currency: systemSettings.currency || companySettings.currency,
          date_format: systemSettings.date_format || companySettings.date_format,
          timezone: systemSettings.timezone || companySettings.timezone,
          language: systemSettings.language || companySettings.language,
        });

        if (systemSettings.notification_settings) {
          setNotificationSettings(systemSettings.notification_settings);
        }

        if (systemSettings.security_settings) {
          setSecuritySettings(systemSettings.security_settings);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSaveCompanySettings = async () => {
    setLoading(true);
    setSaveStatus('idle');

    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: 1,
          ...companySettings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSaveStatus('success');
      setStatusMessage('Paramètres de l\'entreprise enregistrés avec succès');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
      setStatusMessage('Erreur lors de l\'enregistrement des paramètres');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotificationSettings = async () => {
    setLoading(true);
    setSaveStatus('idle');

    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: 1,
          notification_settings: notificationSettings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSaveStatus('success');
      setStatusMessage('Paramètres de notification enregistrés avec succès');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      setSaveStatus('error');
      setStatusMessage('Erreur lors de l\'enregistrement des paramètres');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSecuritySettings = async () => {
    setLoading(true);
    setSaveStatus('idle');

    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: 1,
          security_settings: securitySettings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSaveStatus('success');
      setStatusMessage('Paramètres de sécurité enregistrés avec succès');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving security settings:', error);
      setSaveStatus('error');
      setStatusMessage('Erreur lors de l\'enregistrement des paramètres');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const canEditSettings = profile?.role === 'admin' || profile?.role === 'drh';

  if (!canEditSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Accès Restreint</h3>
          <p className="text-gray-600">Vous n'avez pas les permissions pour accéder aux paramètres système.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Paramètres Système</h2>
        {saveStatus !== 'idle' && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            saveStatus === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {saveStatus === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-medium">{statusMessage}</span>
          </div>
        )}
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('company')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'company'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Building2 className="w-5 h-5 inline-block mr-2" />
            Entreprise
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'notifications'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Bell className="w-5 h-5 inline-block mr-2" />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield className="w-5 h-5 inline-block mr-2" />
            Sécurité
          </button>
          <button
            onClick={() => setActiveTab('regional')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'regional'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Globe className="w-5 h-5 inline-block mr-2" />
            Régional
          </button>
        </nav>
      </div>

      {activeTab === 'company' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Informations de l'Entreprise
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'entreprise
              </label>
              <input
                type="text"
                value={companySettings.company_name}
                onChange={(e) => setCompanySettings({ ...companySettings, company_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SIRET
              </label>
              <input
                type="text"
                value={companySettings.company_siret}
                onChange={(e) => setCompanySettings({ ...companySettings, company_siret: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline-block mr-1" />
                Adresse
              </label>
              <input
                type="text"
                value={companySettings.company_address}
                onChange={(e) => setCompanySettings({ ...companySettings, company_address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ville
              </label>
              <input
                type="text"
                value={companySettings.company_city}
                onChange={(e) => setCompanySettings({ ...companySettings, company_city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code postal
              </label>
              <input
                type="text"
                value={companySettings.company_postal_code}
                onChange={(e) => setCompanySettings({ ...companySettings, company_postal_code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline-block mr-1" />
                Téléphone
              </label>
              <input
                type="tel"
                value={companySettings.company_phone}
                onChange={(e) => setCompanySettings({ ...companySettings, company_phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline-block mr-1" />
                Email
              </label>
              <input
                type="email"
                value={companySettings.company_email}
                onChange={(e) => setCompanySettings({ ...companySettings, company_email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline-block mr-1" />
                Heures de travail par semaine
              </label>
              <input
                type="number"
                value={companySettings.default_work_hours}
                onChange={(e) => setCompanySettings({ ...companySettings, default_work_hours: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline-block mr-1" />
                Jours de congés annuels
              </label>
              <input
                type="number"
                value={companySettings.default_leave_days}
                onChange={(e) => setCompanySettings({ ...companySettings, default_leave_days: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveCompanySettings}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Paramètres de Notification
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-800">Notifications par email</h4>
                <p className="text-sm text-gray-600">Recevoir des notifications par email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.email_notifications}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, email_notifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-800">Demandes de congés</h4>
                <p className="text-sm text-gray-600">Notifications pour les nouvelles demandes de congés</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.leave_requests}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, leave_requests: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-800">Paie prête</h4>
                <p className="text-sm text-gray-600">Notifications quand les bulletins de paie sont prêts</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.payroll_ready}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, payroll_ready: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-800">Rappels de formation</h4>
                <p className="text-sm text-gray-600">Notifications pour les formations à venir</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.training_reminders}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, training_reminders: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-800">Alertes système</h4>
                <p className="text-sm text-gray-600">Notifications pour les mises à jour et alertes importantes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.system_alerts}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, system_alerts: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="pt-2 pb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1">QVCT — Qualite de vie au travail</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-800">Nouvelles communications QVCT</h4>
                <p className="text-sm text-gray-600">Etre notifie lors de la publication d'une nouvelle communication officielle</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.qvct_new_communications}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, qvct_new_communications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-800">Nouveaux evenements QVCT</h4>
                <p className="text-sm text-gray-600">Recevoir une notification a chaque nouvel evenement planifie (bien-etre, team building, sante...)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.qvct_new_events}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, qvct_new_events: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-800">Nouvelles discussions & questions</h4>
                <p className="text-sm text-gray-600">Etre notifie quand un nouveau sujet de discussion ou une question est ouverte dans l'espace QVCT</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.qvct_new_discussions}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, qvct_new_discussions: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-800">Reponses a mes discussions</h4>
                <p className="text-sm text-gray-600">Recevoir une notification quand quelqu'un repond a une discussion ou question a laquelle vous avez participe</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.qvct_discussion_replies}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, qvct_discussion_replies: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveNotificationSettings}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Paramètres de Sécurité
          </h3>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Key className="w-4 h-4 inline-block mr-1" />
                Expiration du mot de passe (jours)
              </label>
              <input
                type="number"
                value={securitySettings.password_expiry_days}
                onChange={(e) => setSecuritySettings({ ...securitySettings, password_expiry_days: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Les utilisateurs devront changer leur mot de passe après ce délai</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline-block mr-1" />
                Délai d'expiration de session (minutes)
              </label>
              <input
                type="number"
                value={securitySettings.session_timeout_minutes}
                onChange={(e) => setSecuritySettings({ ...securitySettings, session_timeout_minutes: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">L'utilisateur sera déconnecté après cette période d'inactivité</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-800">Forcer le changement de mot de passe</h4>
                <p className="text-sm text-gray-600">Les nouveaux utilisateurs doivent changer leur mot de passe à la première connexion</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={securitySettings.force_password_change}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, force_password_change: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-800">Authentification à deux facteurs</h4>
                <p className="text-sm text-gray-600">Activer l'authentification à deux facteurs pour plus de sécurité</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={securitySettings.two_factor_enabled}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, two_factor_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveSecuritySettings}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {activeTab === 'regional' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Paramètres Régionaux
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline-block mr-1" />
                Devise
              </label>
              <select
                value={companySettings.currency}
                onChange={(e) => setCompanySettings({ ...companySettings, currency: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="XAF">Franc CFA (XAF)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="USD">Dollar américain (USD)</option>
                <option value="GBP">Livre sterling (GBP)</option>
                <option value="CHF">Franc suisse (CHF)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline-block mr-1" />
                Format de date
              </label>
              <select
                value={companySettings.date_format}
                onChange={(e) => setCompanySettings({ ...companySettings, date_format: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="DD/MM/YYYY">JJ/MM/AAAA</option>
                <option value="MM/DD/YYYY">MM/JJ/AAAA</option>
                <option value="YYYY-MM-DD">AAAA-MM-JJ</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline-block mr-1" />
                Fuseau horaire
              </label>
              <select
                value={companySettings.timezone}
                onChange={(e) => setCompanySettings({ ...companySettings, timezone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Europe/Paris">Paris (GMT+1)</option>
                <option value="Europe/London">Londres (GMT+0)</option>
                <option value="America/New_York">New York (GMT-5)</option>
                <option value="Asia/Tokyo">Tokyo (GMT+9)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4 inline-block mr-1" />
                Langue
              </label>
              <select
                value={companySettings.language}
                onChange={(e) => setCompanySettings({ ...companySettings, language: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="fr-FR">Français</option>
                <option value="en-US">English</option>
                <option value="es-ES">Español</option>
                <option value="de-DE">Deutsch</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveCompanySettings}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
