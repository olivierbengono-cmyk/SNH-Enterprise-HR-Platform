import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationProvider } from './contexts/NavigationContext';
import CandidateManagement from './components/cvtheque/CandidateManagement';
import { LoginForm } from './components/auth/LoginForm';
import { ChangePasswordForm } from './components/auth/ChangePasswordForm';
import { MainLayout } from './components/layout/MainLayout';
import { EmployeeDashboard } from './components/dashboards/EmployeeDashboard';
import { ManagerDashboard } from './components/dashboards/ManagerDashboard';
import { DRHDashboard } from './components/dashboards/DRHDashboard';
import PayrollManagerDashboard from './components/dashboards/PayrollManagerDashboard';
import RecruitmentManagerDashboard from './components/dashboards/RecruitmentManagerDashboard';
import CareerManagerDashboard from './components/dashboards/CareerManagerDashboard';
import QVCTManagerDashboard from './components/dashboards/QVCTManagerDashboard';
import { EmployeeList } from './components/modules/EmployeeList';
import { LeaveManagement } from './components/modules/LeaveManagement';
import { TrainingManagement } from './components/modules/TrainingManagement';
import { RecruitmentManagement } from './components/modules/RecruitmentManagement';
import { PayslipManagement } from './components/modules/PayslipManagement';
import { PayrollAdministration } from './components/modules/PayrollAdministration';
import { Analytics } from './components/modules/Analytics';
import QVCTManagement from './components/modules/QVCTManagement';
import QVCTDiscussions from './components/modules/qvct/QVCTDiscussions';
import { EmployeeAccountsSetup } from './components/modules/EmployeeAccountsSetup';
import { UserRoleManagement } from './components/modules/UserRoleManagement';
import { PayrollElementsManagement } from './components/modules/PayrollElementsManagement';
import { SalaryGridManagement } from './components/modules/SalaryGridManagement';
import { TaxParametersManagement } from './components/modules/TaxParametersManagement';
import { SocialContributionsManagement } from './components/modules/SocialContributionsManagement';
import { MyProfile } from './components/modules/MyProfile';
import { ActiveAccountsManagement } from './components/modules/ActiveAccountsManagement';
import Settings from './components/modules/Settings';
import TimeTracking from './components/modules/TimeTracking';
import ExpenseManagement from './components/modules/ExpenseManagement';
import OrgChart from './components/modules/OrgChart';
import SkillsManagement from './components/modules/SkillsManagement';
import PerformanceManagement from './components/modules/PerformanceManagement';
import DisciplinaryManagement from './components/modules/DisciplinaryManagement';
import DocumentsManagement from './components/modules/DocumentsManagement';
import { RolePermissionsManagement } from './components/modules/RolePermissionsManagement';
import MyTeam from './components/modules/MyTeam';
import OrgStructureManagement from './components/modules/OrgStructureManagement';
import AuditLogsViewer from './components/modules/AuditLogsViewer';

function AppContent() {
  const { user, profile, loading, reloadProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [preselectedDiscussionId, setPreselectedDiscussionId] = useState<string | null>(null);
  const [recruitmentInitialJobId, setRecruitmentInitialJobId] = useState<string | null>(null);
  const [recruitmentInitialAppId, setRecruitmentInitialAppId] = useState<string | null>(null);

  const handleTabChange = (tab: string) => {
    if (tab.startsWith('qvct-discussions:')) {
      const threadId = tab.substring('qvct-discussions:'.length);
      setPreselectedDiscussionId(threadId);
      setActiveTab('qvct-discussions');
      return;
    }
    if (tab.startsWith('recruitment:job:')) {
      const jobId = tab.substring('recruitment:job:'.length);
      setRecruitmentInitialJobId(jobId);
      setRecruitmentInitialAppId(null);
      setActiveTab('recruitment');
      return;
    }
    if (tab.startsWith('recruitment:app:')) {
      const appId = tab.substring('recruitment:app:'.length);
      setRecruitmentInitialAppId(appId);
      setRecruitmentInitialJobId(null);
      setActiveTab('recruitment');
      return;
    }
    if (tab !== 'qvct-discussions') {
      setPreselectedDiscussionId(null);
    }
    if (tab !== 'recruitment') {
      setRecruitmentInitialJobId(null);
      setRecruitmentInitialAppId(null);
    }
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <LoginForm />;
  }

  if (profile.password_changed === false) {
    return <ChangePasswordForm onPasswordChanged={reloadProfile} />;
  }

  const renderContent = () => {
    if (activeTab === 'dashboard') {
      if (profile.role === 'employee') return <EmployeeDashboard onTabChange={setActiveTab} />;
      if (profile.role === 'manager') return <ManagerDashboard onNavigate={setActiveTab} />;
      if (profile.role === 'drh' || profile.role === 'admin') return <DRHDashboard onNavigate={setActiveTab} />;
      if (profile.role === 'director') return <DRHDashboard onNavigate={setActiveTab} />;
      if (profile.role === 'payroll_manager') return <PayrollManagerDashboard onNavigate={setActiveTab} />;
      if (profile.role === 'recruitment_manager') return <RecruitmentManagerDashboard onNavigate={setActiveTab} />;
      if (profile.role === 'career_manager') return <CareerManagerDashboard onNavigate={setActiveTab} />;
      if (profile.role === 'qvct_manager') return <QVCTManagerDashboard onNavigate={setActiveTab} />;
    }

    if (activeTab === 'employees' && (profile.role === 'drh' || profile.role === 'admin' || profile.role === 'career_manager' || profile.role === 'recruitment_manager' || profile.role === 'manager' || profile.role === 'director')) {
      return <EmployeeList />;
    }

    if (activeTab === 'accounts' && (profile.role === 'drh' || profile.role === 'admin')) {
      return <ActiveAccountsManagement />;
    }

    if (activeTab === 'user-roles' && (profile.role === 'drh' || profile.role === 'admin')) {
      return <UserRoleManagement />;
    }

    if (activeTab === 'role-permissions' && profile.role === 'admin') {
      return <RolePermissionsManagement />;
    }

    if (activeTab === 'audit-logs' && (profile.role === 'admin' || profile.role === 'drh')) {
      return <AuditLogsViewer />;
    }

    if (activeTab === 'my-team' && profile.role === 'manager') {
      return <MyTeam />;
    }

    if (activeTab === 'my-profile' || activeTab === 'profile' || activeTab === 'my-info') {
      return <MyProfile />;
    }

    if (activeTab === 'leave' || activeTab === 'leaves' || activeTab === 'validations' || activeTab === 'leave-management') {
      return <LeaveManagement role={profile.role} />;
    }

    if (activeTab === 'training' || activeTab === 'training-admin') {
      return <TrainingManagement role={profile.role} />;
    }

    if (activeTab === 'recruitment' && (profile.role === 'drh' || profile.role === 'admin' || profile.role === 'recruitment_manager')) {
      return <RecruitmentManagement initialJobId={recruitmentInitialJobId} initialCandidateAppId={recruitmentInitialAppId} />;
    }

    if (activeTab === 'payslips') {
      return <PayslipManagement role={profile.role} />;
    }

    if (activeTab === 'payroll' || activeTab === 'payroll-administration' || activeTab === 'payroll-accounting') {
      if (profile.role === 'drh' || profile.role === 'admin' || profile.role === 'payroll_manager') {
        return <PayrollAdministration />;
      }
    }

    if (activeTab === 'payroll-bonuses' && (profile.role === 'drh' || profile.role === 'admin' || profile.role === 'payroll_manager')) {
      return <PayrollElementsManagement />;
    }

    if (activeTab === 'payroll-elements' && (profile.role === 'drh' || profile.role === 'admin' || profile.role === 'payroll_manager')) {
      return <PayrollElementsManagement />;
    }

    if (activeTab === 'salary-grids' && (profile.role === 'drh' || profile.role === 'admin' || profile.role === 'payroll_manager')) {
      return <SalaryGridManagement />;
    }

    if (activeTab === 'tax-parameters' && (profile.role === 'drh' || profile.role === 'admin' || profile.role === 'payroll_manager')) {
      return <TaxParametersManagement />;
    }

    if (activeTab === 'social-contributions' && (profile.role === 'drh' || profile.role === 'admin' || profile.role === 'payroll_manager')) {
      return <SocialContributionsManagement />;
    }

    if (activeTab === 'analytics' || activeTab === 'reports') {
      return <Analytics />;
    }

    if (activeTab === 'qvct') {
      if (profile.role === 'drh' || profile.role === 'admin' || profile.role === 'qvct_manager') {
        return <QVCTManagement />;
      }
      return <QVCTDiscussions initialThreadId={preselectedDiscussionId} />;
    }

    if (activeTab === 'qvct-discussions') {
      return <QVCTDiscussions initialThreadId={preselectedDiscussionId} />;
    }

    if (activeTab === 'kpi' || activeTab === 'strategic' || activeTab === 'reports-dir') {
      return <Analytics />;
    }

    if (activeTab === 'settings' && (profile.role === 'drh' || profile.role === 'admin')) {
      return <Settings />;
    }

    if (activeTab === 'time-tracking') {
      return <TimeTracking />;
    }

    if (activeTab === 'expenses') {
      return <ExpenseManagement />;
    }

    if (activeTab === 'org-chart') {
      return <OrgChart />;
    }

    if (activeTab === 'org-structure' && (profile.role === 'drh' || profile.role === 'admin')) {
      return <OrgStructureManagement />;
    }

    if ((activeTab === 'skills-matrix' || activeTab === 'skills-management') && (profile.role === 'drh' || profile.role === 'admin' || profile.role === 'career_manager')) {
      return <SkillsManagement />;
    }

    if (activeTab === 'performance' || activeTab === 'performance-admin' || activeTab === 'team-performance') {
      return <PerformanceManagement />;
    }

    if (activeTab === 'disciplinary' && (profile.role === 'drh' || profile.role === 'admin' || profile.role === 'career_manager')) {
      return <DisciplinaryManagement />;
    }

    if (activeTab === 'documents') {
      return <DocumentsManagement role={profile.role} />;
    }

    if (activeTab === 'cvtheque' && (profile.role === 'drh' || profile.role === 'admin' || profile.role === 'recruitment_manager')) {
      return <CandidateManagement />;
    }

    if (profile.role === 'employee') return <EmployeeDashboard onTabChange={handleTabChange} />;
    if (profile.role === 'manager') return <ManagerDashboard onNavigate={handleTabChange} />;
    if (profile.role === 'drh' || profile.role === 'admin') return <DRHDashboard onNavigate={handleTabChange} />;
    if (profile.role === 'director') return <DRHDashboard onNavigate={handleTabChange} />;
    if (profile.role === 'payroll_manager') return <PayrollManagerDashboard onNavigate={handleTabChange} />;
    if (profile.role === 'recruitment_manager') return <RecruitmentManagerDashboard onNavigate={handleTabChange} />;
    if (profile.role === 'career_manager') return <CareerManagerDashboard onNavigate={handleTabChange} />;
    if (profile.role === 'qvct_manager') return <QVCTManagerDashboard onNavigate={handleTabChange} />;

    return <MyProfile />;
  };

  return (
    <MainLayout activeTab={activeTab} onTabChange={handleTabChange}>
      {renderContent()}
    </MainLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </AuthProvider>
  );
}

export default App;
