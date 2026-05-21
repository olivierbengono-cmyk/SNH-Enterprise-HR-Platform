import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users, Building2, ChevronDown, ChevronRight, User, Mail, Phone,
  GitBranch, List, LayoutGrid, ZoomIn, ZoomOut, Maximize2, Printer,
  Download, FileText, X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position_id: string;
  manager_id: string | null;
  department_id: string;
  photo_url?: string;
  position?: { title: string };
  department?: { name: string };
  subordinates?: Employee[];
}

interface Department {
  id: string;
  name: string;
  manager_id: string | null;
  employees: Employee[];
}

const VIEW_LABELS: Record<string, string> = {
  tree: 'Vue Arborescente',
  hierarchy: 'Vue Hiérarchique',
  department: 'Par Département',
};

// Recursively build HTML string for tree node (print use)
function buildTreeNodeHTML(emp: Employee, isRoot = false): string {
  const children = emp.subordinates || [];
  const hasChildren = children.length > 0;
  const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase();
  const avatar = emp.photo_url
    ? `<img src="${emp.photo_url}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" />`
    : `<div style="width:48px;height:48px;border-radius:50%;background:${isRoot ? '#1d4ed8' : '#475569'};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0;">${initials}</div>`;

  const card = `
    <div style="display:flex;flex-direction:column;align-items:center;background:${isRoot ? '#eff6ff' : '#fff'};border:1.5px solid ${isRoot ? '#93c5fd' : '#e2e8f0'};border-radius:10px;padding:10px 12px;min-width:130px;max-width:160px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.07);">
      <div style="display:flex;justify-content:center;margin-bottom:6px;">${avatar}</div>
      <div style="font-weight:700;font-size:11px;color:#0f172a;line-height:1.3;">${emp.first_name} ${emp.last_name}</div>
      <div style="font-size:10px;color:#475569;margin-top:2px;line-height:1.2;">${emp.position?.title || ''}</div>
      ${emp.department?.name ? `<div style="font-size:9px;color:#94a3b8;margin-top:1px;">${emp.department.name}</div>` : ''}
    </div>`;

  if (!hasChildren) return `<div style="display:inline-flex;flex-direction:column;align-items:center;">${card}</div>`;

  const childrenHTML = children.map(c => buildTreeNodeHTML(c)).join('');
  return `
    <div style="display:inline-flex;flex-direction:column;align-items:center;">
      ${card}
      <div style="width:1px;height:20px;background:#cbd5e1;"></div>
      <div style="position:relative;display:flex;align-items:flex-start;justify-content:center;gap:24px;">
        ${children.map((child, index) => `
          <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
            <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:1px;height:14px;background:#cbd5e1;"></div>
            ${children.length > 1 ? `<div style="position:absolute;top:0;height:1px;background:#cbd5e1;${index === 0 ? 'left:50%;right:-12px;' : index === children.length - 1 ? 'right:50%;left:-12px;' : 'left:-12px;right:-12px;'}"></div>` : ''}
            <div style="margin-top:14px;">${buildTreeNodeHTML(child)}</div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

// Build flat list HTML for hierarchy view (print)
function buildHierarchyListHTML(emps: Employee[], level = 0): string {
  return emps.map(emp => {
    const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase();
    const avatar = emp.photo_url
      ? `<img src="${emp.photo_url}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;" />`
      : `<div style="width:36px;height:36px;border-radius:50%;background:#475569;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">${initials}</div>`;
    const subs = emp.subordinates || [];
    return `
      <div style="margin-left:${level * 28}px;margin-bottom:6px;border-left:${level > 0 ? '2px solid #e2e8f0' : 'none'};padding-left:${level > 0 ? '12px' : '0'};">
        <div style="display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;">
          ${avatar}
          <div style="flex:1;">
            <div style="font-weight:700;font-size:12px;color:#0f172a;">${emp.first_name} ${emp.last_name}</div>
            <div style="font-size:11px;color:#475569;">${emp.position?.title || ''}</div>
            <div style="font-size:10px;color:#94a3b8;">${emp.department?.name || ''}</div>
          </div>
          ${emp.email ? `<div style="font-size:10px;color:#64748b;">${emp.email}</div>` : ''}
        </div>
        ${subs.length > 0 ? buildHierarchyListHTML(subs, level + 1) : ''}
      </div>`;
  }).join('');
}

// Build department view HTML (print)
function buildDepartmentHTML(departments: Department[], empsByDept: Map<string, Employee[]>): string {
  return departments.map(dept => {
    const emps = empsByDept.get(dept.id) || [];
    const cards = emps.map(emp => {
      const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase();
      const avatar = emp.photo_url
        ? `<img src="${emp.photo_url}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" />`
        : `<div style="width:40px;height:40px;border-radius:50%;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;">${initials}</div>`;
      return `
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;background:#fff;break-inside:avoid;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            ${avatar}
            <div>
              <div style="font-weight:700;font-size:11px;color:#0f172a;">${emp.first_name} ${emp.last_name}</div>
              <div style="font-size:10px;color:#475569;">${emp.position?.title || ''}</div>
            </div>
          </div>
          ${emp.email ? `<div style="font-size:9px;color:#64748b;margin-top:2px;">${emp.email}</div>` : ''}
          ${emp.phone ? `<div style="font-size:9px;color:#64748b;margin-top:1px;">${emp.phone}</div>` : ''}
        </div>`;
    }).join('');
    return `
      <div style="margin-bottom:20px;break-inside:avoid-page;">
        <div style="background:linear-gradient(to right,#eff6ff,#f8fafc);border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:10px;display:flex;align-items:center;gap:10px;">
          <div style="font-weight:700;font-size:14px;color:#0f172a;">${dept.name}</div>
          <div style="font-size:11px;color:#64748b;">${emps.length} employé${emps.length !== 1 ? 's' : ''}</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          ${cards || '<div style="color:#94a3b8;font-size:11px;">Aucun employé</div>'}
        </div>
      </div>`;
  }).join('');
}

export default function OrgChart() {
  const { profile } = useAuth();
  const isEmployee = profile?.role === 'employee';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'hierarchy' | 'department'>('tree');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [treeZoom, setTreeZoom] = useState(1);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => { loadData(); }, [profile]);

  const getAncestorIds = (empId: string, allEmps: Employee[]): Set<string> => {
    const map = new Map(allEmps.map(e => [e.id, e]));
    const ids = new Set<string>();
    let current = map.get(empId);
    while (current?.manager_id) {
      ids.add(current.manager_id);
      current = map.get(current.manager_id);
    }
    return ids;
  };

  const getSubordinateIds = (empId: string, allEmps: Employee[]): Set<string> => {
    const ids = new Set<string>();
    const queue = [empId];
    while (queue.length) {
      const cur = queue.shift()!;
      allEmps.forEach(e => {
        if (e.manager_id === cur) { ids.add(e.id); queue.push(e.id); }
      });
    }
    return ids;
  };

  const loadData = async () => {
    try {
      const { data: employeesData } = await supabase
        .from('employees')
        .select(`*, position:positions(title), department:departments(name)`)
        .eq('employment_status', 'active')
        .order('first_name');

      const { data: departmentsData } = await supabase
        .from('departments').select('*').order('name');

      const allEmps: Employee[] = employeesData || [];
      let visibleEmps = allEmps;

      if (isEmployee && profile?.employee_id) {
        const selfId = profile.employee_id;
        const ancestorIds = getAncestorIds(selfId, allEmps);
        const subIds = getSubordinateIds(selfId, allEmps);
        const visibleIds = new Set([selfId, ...ancestorIds, ...subIds]);
        visibleEmps = allEmps.filter(e => visibleIds.has(e.id));
      }

      setEmployees(visibleEmps);
      setDepartments(departmentsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildHierarchy = useCallback((): Employee[] => {
    const employeeMap = new Map<string, Employee>();
    employees.forEach(emp => employeeMap.set(emp.id, { ...emp, subordinates: [] }));
    const roots: Employee[] = [];
    employeeMap.forEach(emp => {
      if (emp.manager_id && employeeMap.has(emp.manager_id)) {
        employeeMap.get(emp.manager_id)!.subordinates!.push(emp);
      } else { roots.push(emp); }
    });
    return roots;
  }, [employees]);

  const groupByDepartment = useCallback((): Map<string, Employee[]> => {
    const deptMap = new Map<string, Employee[]>();
    departments.forEach(dept => deptMap.set(dept.id, []));
    employees.forEach(emp => {
      if (deptMap.has(emp.department_id)) deptMap.get(emp.department_id)!.push(emp);
    });
    return deptMap;
  }, [employees, departments]);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) newExpanded.delete(nodeId);
    else newExpanded.add(nodeId);
    setExpandedNodes(newExpanded);
  };

  const getLogoUrl = () => `${window.location.origin}/logoSNH.png`;

  const openPrintWindow = (bodyHTML: string, isLandscape: boolean, title: string) => {
    const logoUrl = getLogoUrl();
    const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #0f172a; }
    @page { size: A4 ${isLandscape ? 'landscape' : 'portrait'}; margin: 12mm 10mm; }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #1e40af;
      padding-bottom: 10px;
      margin-bottom: 18px;
    }
    .page-header-left h1 { font-size: 18px; font-weight: 800; color: #1e3a5f; }
    .page-header-left p  { font-size: 11px; color: #64748b; margin-top: 3px; }
    .page-header-right img { height: 48px; object-fit: contain; }

    /* Tree view: fit entire diagram to width of page */
    .tree-wrapper {
      width: 100%;
      overflow: hidden;
      display: flex;
      justify-content: center;
    }
    .tree-scale-inner {
      display: inline-flex;
      transform-origin: top center;
    }

    /* Hierarchy / department: allow multi-page */
    .list-wrapper { width: 100%; }
  </style>
</head>
<body>
  <div class="page-header">
    <div class="page-header-left">
      <h1>${title}</h1>
      <p>Société Nationale des Hydrocarbures — Généré le ${date}</p>
    </div>
    <div class="page-header-right">
      <img src="${logoUrl}" alt="Logo SNH" />
    </div>
  </div>
  <div id="content">${bodyHTML}</div>
  <script>
    window.onload = function() {
      ${isLandscape ? `
      // Auto-scale tree to fit page width
      var inner = document.getElementById('tree-inner');
      if (inner) {
        var pageW = document.body.offsetWidth;
        var contentW = inner.scrollWidth;
        if (contentW > pageW) {
          var scale = pageW / contentW;
          inner.style.transform = 'scale(' + scale + ')';
          inner.style.transformOrigin = 'top center';
          inner.parentElement.style.height = (inner.scrollHeight * scale) + 'px';
        }
      }` : ''}
      setTimeout(function() { window.print(); window.close(); }, 400);
    };
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      // Revoke after the window has had time to load
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  };

  const handlePrint = () => {
    setShowExportMenu(false);

    if (viewMode === 'hierarchy') {
      const roots = buildHierarchy();
      const listHTML = `<div class="list-wrapper">${buildHierarchyListHTML(roots)}</div>`;
      openPrintWindow(listHTML, false, 'Organigramme — Vue Hiérarchique');

    } else {
      const deptMap = groupByDepartment();
      const deptHTML = `<div class="list-wrapper">${buildDepartmentHTML(departments, deptMap)}</div>`;
      openPrintWindow(deptHTML, false, 'Organigramme — Par Département');
    }
  };

  const handleExportCSV = () => {
    setShowExportMenu(false);
    const rows: string[][] = [['Prénom', 'Nom', 'Poste', 'Département', 'Email', 'Téléphone', 'Manager']];
    const empMap = new Map(employees.map(e => [e.id, e]));
    employees.forEach(emp => {
      const manager = emp.manager_id ? empMap.get(emp.manager_id) : null;
      rows.push([
        emp.first_name, emp.last_name,
        emp.position?.title || '', emp.department?.name || '',
        emp.email || '', emp.phone || '',
        manager ? `${manager.first_name} ${manager.last_name}` : '',
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `organigramme_SNH_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Screen renderers ---

  const renderEmployeeCard = (employee: Employee, level: number = 0) => {
    const hasSubordinates = employee.subordinates && employee.subordinates.length > 0;
    const isExpanded = expandedNodes.has(employee.id);
    return (
      <div key={employee.id} className="mb-2">
        <div
          className="border border-slate-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow cursor-pointer"
          style={{ marginLeft: `${level * 32}px` }}
          onClick={() => setSelectedEmployee(employee)}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => { e.stopPropagation(); if (hasSubordinates) toggleNode(employee.id); }}
              className={`flex-shrink-0 ${hasSubordinates ? 'text-slate-400 hover:text-slate-600' : 'opacity-0 pointer-events-none'}`}
            >
              {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>

            {employee.photo_url ? (
              <img src={employee.photo_url} alt="" className="h-11 w-11 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="h-11 w-11 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-blue-600" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-slate-900 truncate">{employee.first_name} {employee.last_name}</h4>
              <p className="text-sm text-slate-600 truncate">{employee.position?.title}</p>
              <p className="text-xs text-slate-500 truncate">{employee.department?.name}</p>
            </div>

            {hasSubordinates && (
              <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0">
                {employee.subordinates!.length} subordonné{employee.subordinates!.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {hasSubordinates && isExpanded && (
          <div className="mt-2 border-l-2 border-slate-200"
            style={{ marginLeft: `${level * 32 + 22}px`, paddingLeft: '14px' }}>
            {employee.subordinates!.map(sub => renderEmployeeCard(sub, 0))}
          </div>
        )}
      </div>
    );
  };

  const renderTreeNode = (employee: Employee, isRoot = false): React.ReactNode => {
    const children = employee.subordinates || [];
    const hasChildren = children.length > 0;
    const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();

    return (
      <div key={employee.id} className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => setSelectedEmployee(employee)}
          className={`group relative z-10 flex flex-col items-center w-52 rounded-xl border bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isRoot ? 'border-blue-300 bg-gradient-to-b from-blue-50 to-white'
              : hasChildren ? 'border-slate-200 hover:border-blue-300'
              : 'border-slate-200 hover:border-slate-300'}`}
        >
          {employee.photo_url ? (
            <img src={employee.photo_url} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-white shadow" />
          ) : (
            <div className={`h-14 w-14 rounded-full flex items-center justify-center text-white font-semibold ring-2 ring-white shadow ${
              isRoot ? 'bg-gradient-to-br from-blue-600 to-blue-800' : 'bg-gradient-to-br from-slate-500 to-slate-700'}`}>
              {initials || <User className="h-7 w-7" />}
            </div>
          )}
          <div className="mt-2 text-center">
            <p className="text-sm font-semibold text-slate-900 leading-tight">{employee.first_name} {employee.last_name}</p>
            <p className="mt-0.5 text-xs text-slate-600 line-clamp-1">{employee.position?.title || '-'}</p>
            {employee.department?.name && (
              <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">{employee.department.name}</p>
            )}
          </div>
          {hasChildren && (
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-blue-200 whitespace-nowrap">
              {children.length} {children.length === 1 ? 'collaborateur' : 'collaborateurs'}
            </span>
          )}
        </button>

        {hasChildren && (
          <>
            <div className="h-8 w-px bg-slate-300 mt-6" />
            <div>
              <div className="flex items-start justify-center gap-8">
                {children.map((child, index) => (
                  <div key={child.id} className="relative flex flex-col items-center">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 w-px bg-slate-300" />
                    {children.length > 1 && (
                      <div className="absolute top-0 h-px bg-slate-300"
                        style={{ left: index === 0 ? '50%' : 0, right: index === children.length - 1 ? '50%' : 0 }} />
                    )}
                    <div className="pt-4">{renderTreeNode(child)}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderTreeView = () => {
    const roots = buildHierarchy();
    if (roots.length === 0) return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <GitBranch className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">Aucun employé à afficher</p>
      </div>
    );

    return (
      <div className="bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <GitBranch className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-slate-800">Schéma arborescent</span>
            <span className="text-slate-400">— {roots.length} racine{roots.length > 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setTreeZoom(z => Math.max(0.3, Number((z - 0.1).toFixed(2))))}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition" title="Réduire">
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-xs text-slate-600 w-12 text-center">{Math.round(treeZoom * 100)}%</span>
            <button onClick={() => setTreeZoom(z => Math.min(2, Number((z + 0.1).toFixed(2))))}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition" title="Agrandir">
              <ZoomIn className="h-4 w-4" />
            </button>
            <button onClick={() => setTreeZoom(1)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition" title="Taille normale">
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="overflow-auto">
          <div className="min-w-max px-8 py-10 flex items-start justify-center gap-12"
            style={{ transform: `scale(${treeZoom})`, transformOrigin: 'top center',
              minHeight: treeZoom < 1 ? `${Math.round(400 * treeZoom)}px` : undefined }}>
            {roots.map(root => renderTreeNode(root, true))}
          </div>
        </div>
      </div>
    );
  };

  const renderDepartmentView = () => {
    const deptMap = groupByDepartment();
    return (
      <div className="space-y-4">
        {departments.map(dept => {
          const deptEmps = deptMap.get(dept.id) || [];
          const isExpanded = expandedNodes.has(dept.id);
          return (
            <div key={dept.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-4 cursor-pointer hover:from-blue-100 transition-colors"
                onClick={() => toggleNode(dept.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-6 w-6 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg">{dept.name}</h3>
                      <p className="text-sm text-slate-500">{deptEmps.length} employé{deptEmps.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronDown className="h-5 w-5 text-slate-500" /> : <ChevronRight className="h-5 w-5 text-slate-500" />}
                </div>
              </div>
              {isExpanded && (
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {deptEmps.map(emp => (
                      <div key={emp.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedEmployee(emp)}>
                        <div className="flex items-center gap-3 mb-3">
                          {emp.photo_url ? (
                            <img src={emp.photo_url} alt="" className="h-11 w-11 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="h-11 w-11 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 truncate">{emp.first_name} {emp.last_name}</h4>
                            <p className="text-sm text-slate-600 truncate">{emp.position?.title}</p>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs text-slate-500">
                          <div className="flex items-center gap-2"><Mail className="h-3 w-3" /><span className="truncate">{emp.email}</span></div>
                          {emp.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /><span>{emp.phone}</span></div>}
                        </div>
                      </div>
                    ))}
                    {deptEmps.length === 0 && <p className="text-slate-500 text-sm col-span-3">Aucun employé dans ce département.</p>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const managerCount = buildHierarchy().reduce(function countManagers(acc: number, emp: Employee): number {
    const sub = emp.subordinates || [];
    return acc + (sub.length > 0 ? 1 : 0) + sub.reduce(countManagers, 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Organigramme</h2>
          <p className="text-slate-500 mt-0.5">Structure organisationnelle de la SNH</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowExportMenu(v => !v)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition font-medium text-sm"
          >
            <Download className="h-4 w-4" />
            Exporter / Imprimer
            <ChevronDown className="h-4 w-4" />
          </button>

          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-20 overflow-hidden">
                {viewMode !== 'tree' && (
                  <>
                    <button onClick={handlePrint}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-sm text-slate-700">
                      <Printer className="h-4 w-4 text-slate-500" />
                      Imprimer — {VIEW_LABELS[viewMode]}
                    </button>
                    <div className="border-t border-slate-100" />
                  </>
                )}
                <button onClick={handleExportCSV}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-sm text-slate-700">
                  <FileText className="h-4 w-4 text-slate-500" />
                  Exporter en CSV
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {isEmployee && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 flex items-center gap-2">
          <User className="h-4 w-4 shrink-0" />
          Vous visualisez votre arborescence hiérarchique personnelle.
        </div>
      )}

      {/* View toggle */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex gap-2 flex-wrap items-center">
          {(['tree', 'hierarchy', ...(isEmployee ? [] : ['department'])] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                viewMode === mode ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {mode === 'tree' && <GitBranch className="h-4 w-4" />}
              {mode === 'hierarchy' && <List className="h-4 w-4" />}
              {mode === 'department' && <LayoutGrid className="h-4 w-4" />}
              {VIEW_LABELS[mode]}
            </button>
          ))}

          {viewMode !== 'tree' && (
            <button
              onClick={() => {
                if (expandedNodes.size > 0) {
                  setExpandedNodes(new Set());
                } else {
                  setExpandedNodes(new Set(
                    viewMode === 'hierarchy' ? employees.map(e => e.id) : departments.map(d => d.id)
                  ));
                }
              }}
              className="ml-auto px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-sm font-medium">
              {expandedNodes.size > 0 ? 'Tout réduire' : 'Tout développer'}
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Employés', value: employees.length, icon: <Users className="h-7 w-7 text-blue-600" /> },
          { label: 'Départements', value: departments.length, icon: <Building2 className="h-7 w-7 text-emerald-600" /> },
          { label: 'Managers', value: managerCount, icon: <User className="h-7 w-7 text-amber-600" /> },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{kpi.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{kpi.value}</p>
            </div>
            {kpi.icon}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div>
        {viewMode === 'tree' && renderTreeView()}
        {viewMode === 'hierarchy' && (
          <div className="space-y-2">
            {buildHierarchy().map(emp => renderEmployeeCard(emp))}
          </div>
        )}
        {viewMode === 'department' && renderDepartmentView()}
      </div>

      {/* Employee detail modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-start gap-4">
                {selectedEmployee.photo_url ? (
                  <img src={selectedEmployee.photo_url} alt="" className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-10 w-10 text-blue-600" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedEmployee.first_name} {selectedEmployee.last_name}</h3>
                  <p className="text-slate-600 mt-0.5">{selectedEmployee.position?.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{selectedEmployee.department?.name}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEmployee(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-3 text-slate-700 text-sm">
                <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" /><span>{selectedEmployee.email}</span>
              </div>
              {selectedEmployee.phone && (
                <div className="flex items-center gap-3 text-slate-700 text-sm">
                  <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" /><span>{selectedEmployee.phone}</span>
                </div>
              )}
            </div>
            <button onClick={() => setSelectedEmployee(null)}
              className="mt-6 w-full border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg hover:bg-slate-50 transition text-sm font-medium">
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
