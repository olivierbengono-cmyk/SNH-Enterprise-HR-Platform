import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Building2, Plus, Pencil, Trash2, ChevronRight, ChevronDown,
  Save, X, Search, Briefcase, Layers, AlertCircle, CheckCircle,
  Users, ArrowRight, TableProperties
} from 'lucide-react';
import BatchEntryTable, { BatchColumn } from '../shared/BatchEntryTable';

/* ─── Nomenclatures officielles SNH ────────────────────────── */

// Niveaux d'entité organisationnelle
const ORG_LEVELS = ['Direction', 'Sous Direction', 'Service', 'Section'] as const;
type OrgLevel = typeof ORG_LEVELS[number];

// Niveaux hiérarchiques du titulaire d'un poste (du plus bas au plus haut)
const POSITION_LEVELS = [
  'Employé',
  'Agent de Maîtrise',
  'Cadre',
  'Chef de Section',
  'Chef de Service Adjoint',
  'Chef de Service',
  'Sous Directeur',
  'Directeur Adjoint',
  'Directeur',
] as const;
type PositionLevel = typeof POSITION_LEVELS[number];

/* ─── Couleurs par niveau d'entité ────────────────────────── */
const ORG_LEVEL_COLORS: Record<OrgLevel, string> = {
  'Direction':      'bg-blue-100 text-blue-800 border border-blue-200',
  'Sous Direction': 'bg-sky-100 text-sky-800 border border-sky-200',
  'Service':        'bg-teal-100 text-teal-800 border border-teal-200',
  'Section':        'bg-slate-100 text-slate-600 border border-slate-200',
};

/* ─── Couleurs par niveau de poste ────────────────────────── */
const POS_LEVEL_COLORS: Record<PositionLevel, string> = {
  'Directeur':              'bg-blue-100 text-blue-800 border border-blue-200',
  'Directeur Adjoint':      'bg-blue-50 text-blue-700 border border-blue-200',
  'Sous Directeur':         'bg-sky-100 text-sky-800 border border-sky-200',
  'Chef de Service':        'bg-teal-100 text-teal-800 border border-teal-200',
  'Chef de Service Adjoint':'bg-teal-50 text-teal-700 border border-teal-200',
  'Chef de Section':        'bg-green-100 text-green-800 border border-green-200',
  'Cadre':                  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Agent de Maîtrise':      'bg-amber-100 text-amber-800 border border-amber-200',
  'Employé':                'bg-slate-100 text-slate-600 border border-slate-200',
};

const posLevelColor = (level: string) =>
  POS_LEVEL_COLORS[level as PositionLevel] ?? 'bg-slate-100 text-slate-600 border border-slate-200';

/* ─── Types ─────────────────────────────────────────────────── */
interface Department {
  id: string;
  name: string;
  code: string;
  org_level: OrgLevel;
  parent_id: string | null;
  description: string | null;
  manager_id: string | null;
  manager?: { first_name: string; last_name: string } | null;
  _count?: number;
}

interface Position {
  id: string;
  title: string;
  code: string;
  level: string;
  department_id: string | null;
  description: string | null;
  department?: { name: string; code: string } | null;
  _count?: number;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

const emptyDept = (): Partial<Department> => ({
  name: '', code: '', org_level: 'Direction', parent_id: null, description: null, manager_id: null,
});
const emptyPos = (): Partial<Position> => ({
  title: '', code: '', level: 'Cadre', department_id: null, description: null,
});

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function OrgStructureManagement() {
  const [tab, setTab] = useState<'entities' | 'positions'>('entities');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions]     = useState<Position[]>([]);
  const [employees, setEmployees]     = useState<Employee[]>([]);

  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [editingDept, setEditingDept]     = useState<Partial<Department> | null>(null);
  const [editingPos,  setEditingPos]      = useState<Partial<Position>  | null>(null);
  const [saving, setSaving]               = useState(false);
  const [toast, setToast]                 = useState<{ type: 'success'|'error'; msg: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ kind: 'dept'|'pos'; id: string; name: string } | null>(null);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState<'entities' | 'positions' | 'assignments' | null>(null);

  /* ── load ─────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);

    const [{ data: depts }, { data: pos }, { data: emps }] = await Promise.all([
      supabase.from('departments')
        .select('id, name, code, org_level, parent_id, description, manager_id')
        .order('name'),
      supabase.from('positions')
        .select('id, title, code, level, department_id, description, department:departments(name, code)')
        .order('level, title'),
      supabase.from('employees')
        .select('id, first_name, last_name')
        .eq('employment_status', 'active')
        .order('first_name'),
    ]);

    const empMap: Record<string, Employee> = {};
    (emps || []).forEach(e => { empMap[e.id] = e; });

    const { data: empFull } = await supabase
      .from('employees')
      .select('department_id, position_id')
      .eq('employment_status', 'active');

    const countMap: Record<string, number> = {};
    const posCountMap: Record<string, number> = {};
    (empFull || []).forEach(e => {
      if (e.department_id) countMap[e.department_id] = (countMap[e.department_id] || 0) + 1;
      if (e.position_id)   posCountMap[e.position_id] = (posCountMap[e.position_id] || 0) + 1;
    });

    setDepartments((depts || []).map(d => ({
      ...d,
      org_level: (d.org_level as OrgLevel) || 'Direction',
      manager: d.manager_id ? empMap[d.manager_id] ?? null : null,
      _count: countMap[d.id] || 0,
    })));
    setPositions((pos || []).map(p => ({ ...p, _count: posCountMap[p.id] || 0 })));
    setEmployees(emps || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── toast ────────────────────────────────────────────────── */
  const showToast = (type: 'success'|'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── save dept ────────────────────────────────────────────── */
  const saveDept = async () => {
    if (!editingDept) return;
    if (!editingDept.name?.trim() || !editingDept.code?.trim() || !editingDept.org_level) {
      showToast('error', 'Le nom, le code et le niveau organisationnel sont obligatoires.');
      return;
    }
    setSaving(true);
    const payload = {
      name:        editingDept.name.trim(),
      code:        editingDept.code.trim().toUpperCase(),
      org_level:   editingDept.org_level,
      parent_id:   editingDept.parent_id || null,
      description: editingDept.description || null,
      manager_id:  editingDept.manager_id || null,
    };
    const { error } = editingDept.id
      ? await supabase.from('departments').update(payload).eq('id', editingDept.id)
      : await supabase.from('departments').insert(payload);
    setSaving(false);
    if (error) { showToast('error', error.message); return; }
    showToast('success', editingDept.id ? 'Entité mise à jour.' : 'Entité créée.');
    setEditingDept(null);
    load();
  };

  /* ── save position ────────────────────────────────────────── */
  const savePos = async () => {
    if (!editingPos) return;
    if (!editingPos.title?.trim() || !editingPos.code?.trim() || !editingPos.level) {
      showToast('error', 'Titre, code et niveau hiérarchique sont obligatoires.');
      return;
    }
    setSaving(true);
    const payload = {
      title:         editingPos.title.trim(),
      code:          editingPos.code.trim().toUpperCase(),
      level:         editingPos.level,
      department_id: editingPos.department_id || null,
      description:   editingPos.description || null,
    };
    const { error } = editingPos.id
      ? await supabase.from('positions').update(payload).eq('id', editingPos.id)
      : await supabase.from('positions').insert(payload);
    setSaving(false);
    if (error) { showToast('error', error.message); return; }
    showToast('success', editingPos.id ? 'Poste mis à jour.' : 'Poste créé.');
    setEditingPos(null);
    load();
  };

  /* ── delete ───────────────────────────────────────────────── */
  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    const { error } = deleteConfirm.kind === 'dept'
      ? await supabase.from('departments').delete().eq('id', deleteConfirm.id)
      : await supabase.from('positions').delete().eq('id', deleteConfirm.id);
    setSaving(false);
    if (error) { showToast('error', 'Impossible de supprimer : ' + error.message); }
    else        { showToast('success', 'Supprimé avec succès.'); }
    setDeleteConfirm(null);
    load();
  };

  /* ── batch save entities ──────────────────────────────────── */
  const batchSaveEntities = async (rows: Record<string, unknown>[]) => {
    let success = 0;
    const errors: string[] = [];
    for (const row of rows) {
      const payload = {
        name: String(row.name || '').trim(),
        code: String(row.code || '').trim().toUpperCase(),
        org_level: row.org_level as OrgLevel,
        parent_id: row.parent_id ? String(row.parent_id) : null,
        description: row.description ? String(row.description) : null,
        manager_id: row.manager_id ? String(row.manager_id) : null,
      };
      const { error } = await supabase.from('departments').insert(payload);
      if (error) errors.push(`${payload.name}: ${error.message}`);
      else success++;
    }
    load();
    return { success, errors };
  };

  /* ── batch save positions ─────────────────────────────────── */
  const batchSavePositions = async (rows: Record<string, unknown>[]) => {
    let success = 0;
    const errors: string[] = [];
    for (const row of rows) {
      const payload = {
        title: String(row.title || '').trim(),
        code: String(row.code || '').trim().toUpperCase(),
        level: String(row.level || 'Cadre'),
        department_id: row.department_id ? String(row.department_id) : null,
        description: row.description ? String(row.description) : null,
      };
      const { error } = await supabase.from('positions').insert(payload);
      if (error) errors.push(`${payload.title}: ${error.message}`);
      else success++;
    }
    load();
    return { success, errors };
  };

  /* ── batch assign employees ───────────────────────────────── */
  const batchSaveAssignments = async (rows: Record<string, unknown>[]) => {
    let success = 0;
    const errors: string[] = [];
    for (const row of rows) {
      const update: Record<string, string | null> = {};
      if (row.department_id) update.department_id = String(row.department_id);
      if (row.position_id) update.position_id = String(row.position_id);
      if (!row.employee_id) { errors.push('Employé requis'); continue; }
      const { error } = await supabase.from('employees').update(update).eq('id', String(row.employee_id));
      if (error) errors.push(error.message);
      else success++;
    }
    load();
    return { success, errors };
  };

  /* ── helpers ──────────────────────────────────────────────── */
  const filterDepts = (items: Department[]) => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(d =>
      d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.org_level.toLowerCase().includes(q)
    );
  };

  const filterPos = (items: Position[]) => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(p =>
      p.title.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.level.toLowerCase().includes(q)
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const roots    = departments.filter(d => !d.parent_id);
  const childrenOf = (parentId: string) => departments.filter(d => d.parent_id === parentId);

  /* ─── render dept row ───────────────────────────────────── */
  const renderDeptRow = (dept: Department, depth = 0) => {
    const kids     = childrenOf(dept.id);
    const expanded = expandedDepts.has(dept.id);
    const levelColor = ORG_LEVEL_COLORS[dept.org_level] ?? 'bg-slate-100 text-slate-600 border border-slate-200';

    return (
      <div key={dept.id}>
        <div
          className={`flex items-center gap-3 py-3 px-4 hover:bg-slate-50 transition group border-b border-slate-100 ${depth > 0 ? 'bg-slate-50/40' : ''}`}
          style={{ paddingLeft: `${16 + depth * 28}px` }}
        >
          {/* expand */}
          <button
            onClick={() => kids.length && toggleExpand(dept.id)}
            className={`w-5 h-5 flex items-center justify-center text-slate-400 ${kids.length ? 'hover:text-slate-600 cursor-pointer' : 'cursor-default opacity-0'}`}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          <Building2 className={`h-4 w-4 shrink-0 ${depth === 0 ? 'text-blue-600' : 'text-slate-400'}`} />

          <div className="flex-1 min-w-0 flex items-center flex-wrap gap-x-2 gap-y-0.5">
            <span className="font-medium text-slate-800 text-sm">{dept.name}</span>
            <span className="text-xs font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{dept.code}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${levelColor}`}>{dept.org_level}</span>
            {dept.manager && (
              <span className="text-xs text-slate-400">
                — {(dept.manager as any).first_name} {(dept.manager as any).last_name}
              </span>
            )}
          </div>

          <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
            <Users className="h-3 w-3" />{dept._count}
          </span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
            <button
              onClick={() => setEditingDept({ ...dept })}
              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
              title="Modifier"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setDeleteConfirm({ kind: 'dept', id: dept.id, name: dept.name })}
              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"
              title="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {expanded && kids.map(child => renderDeptRow(child, depth + 1))}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Structure Organisationnelle</h2>
        <p className="text-slate-500 mt-0.5 text-sm">
          Gérez les entités (Direction, Sous Direction, Service, Section) et la classification hiérarchique des postes
        </p>
      </div>

      {/* tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['entities', 'positions'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(''); }}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition ${
              tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {t === 'entities' ? <Building2 className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
            {t === 'entities' ? `Entités (${departments.length})` : `Postes (${positions.length})`}
          </button>
        ))}
      </div>

      {/* toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tab === 'entities' ? 'Nom, code, niveau…' : 'Titre, code, niveau…'}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => tab === 'entities' ? setEditingDept(emptyDept()) : setEditingPos(emptyPos())}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          {tab === 'entities' ? 'Nouvelle entité' : 'Nouveau poste'}
        </button>
        <button
          onClick={() => setBatchMode(tab === 'entities' ? 'entities' : 'positions')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition"
        >
          <TableProperties className="h-4 w-4" />
          Saisie par lots
        </button>
        {tab === 'entities' && (
          <button
            onClick={() => setBatchMode('assignments')}
            className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 transition"
          >
            <Users className="h-4 w-4" />
            Affecter des agents
          </button>
        )}
      </div>

      {/* ══ ENTITIES TAB ══ */}
      {tab === 'entities' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* legend */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Entités organisationnelles</span>
            <div className="flex items-center gap-2">
              {ORG_LEVELS.map(l => (
                <span key={l} className={`text-xs px-2 py-0.5 rounded-full ${ORG_LEVEL_COLORS[l]}`}>{l}</span>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center">
              <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-blue-600" />
            </div>
          ) : departments.length === 0 ? (
            <div className="py-16 text-center text-slate-400">Aucune entité trouvée</div>
          ) : search.trim() ? (
            filterDepts(departments).map(d => renderDeptRow(d))
          ) : (
            roots.map(d => renderDeptRow(d))
          )}
        </div>
      )}

      {/* ══ POSITIONS TAB ══ */}
      {tab === 'positions' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Classification hiérarchique des postes</span>
            <span className="text-xs text-slate-400">{positions.length} poste{positions.length > 1 ? 's' : ''}</span>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center">
              <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-blue-600" />
            </div>
          ) : (
            <div>
              {/* Group by level, ordered from highest to lowest */}
              {[...POSITION_LEVELS].reverse().map(level => {
                const group = filterPos(positions).filter(p => p.level === level);
                if (group.length === 0) return null;
                return (
                  <div key={level}>
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{level}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${posLevelColor(level)}`}>{group.length}</span>
                    </div>
                    {group.map(pos => (
                      <div key={pos.id} className="flex items-center gap-3 py-3 px-4 hover:bg-slate-50 transition group border-b border-slate-100">
                        <Briefcase className="h-4 w-4 text-slate-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-slate-800 text-sm">{pos.title}</span>
                          <span className="ml-2 text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{pos.code}</span>
                          {pos.department && (
                            <span className="ml-2 text-xs text-slate-400 inline-flex items-center gap-1">
                              <ArrowRight className="h-3 w-3" />
                              {(pos.department as any).code}
                            </span>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${posLevelColor(pos.level)}`}>{pos.level}</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                          <Users className="h-3 w-3" />{pos._count}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                          <button
                            onClick={() => setEditingPos({ ...pos })}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ kind: 'pos', id: pos.id, name: pos.title })}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ MODAL — EDIT ENTITY ══ */}
      {editingDept && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                {editingDept.id ? "Modifier l'entité" : 'Nouvelle entité'}
              </h3>
              <button onClick={() => setEditingDept(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nom complet *</label>
                  <input
                    value={editingDept.name || ''}
                    onChange={e => setEditingDept(p => ({ ...p!, name: e.target.value }))}
                    placeholder="ex: Direction de l'Exploration (DEX)"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Code *</label>
                  <input
                    value={editingDept.code || ''}
                    onChange={e => setEditingDept(p => ({ ...p!, code: e.target.value.toUpperCase() }))}
                    placeholder="ex: DEX"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Niveau organisationnel *</label>
                  <select
                    value={editingDept.org_level || 'Direction'}
                    onChange={e => setEditingDept(p => ({ ...p!, org_level: e.target.value as OrgLevel }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ORG_LEVELS.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Entité parente (rattachement)</label>
                  <select
                    value={editingDept.parent_id || ''}
                    onChange={e => setEditingDept(p => ({ ...p!, parent_id: e.target.value || null }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Aucune (entité racine) —</option>
                    {departments
                      .filter(d => d.id !== editingDept.id)
                      .map(d => (
                        <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>
                      ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Responsable</label>
                  <select
                    value={editingDept.manager_id || ''}
                    onChange={e => setEditingDept(p => ({ ...p!, manager_id: e.target.value || null }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Non désigné —</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Description / Mission</label>
                  <textarea
                    value={editingDept.description || ''}
                    onChange={e => setEditingDept(p => ({ ...p!, description: e.target.value }))}
                    rows={2}
                    placeholder="Mission et attributions de cette entité…"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* preview badge */}
              {editingDept.org_level && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${ORG_LEVEL_COLORS[editingDept.org_level]}`}>
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>Niveau : <strong>{editingDept.org_level}</strong></span>
                  <span className="text-xs ml-auto opacity-70">
                    {editingDept.org_level === 'Direction'      && 'Unité de commandement dirigée par un Directeur'}
                    {editingDept.org_level === 'Sous Direction' && 'Subdivision d\'une Direction, dirigée par un Sous-Directeur'}
                    {editingDept.org_level === 'Service'        && 'Unité de travail dirigée par un Chef de Service'}
                    {editingDept.org_level === 'Section'        && 'Unité de base dirigée par un Chef de Section'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
              <button onClick={() => setEditingDept(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">
                Annuler
              </button>
              <button
                onClick={saveDept}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL — EDIT POSITION ══ */}
      {editingPos && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                {editingPos.id ? 'Modifier le poste' : 'Nouveau poste'}
              </h3>
              <button onClick={() => setEditingPos(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Intitulé du poste *</label>
                  <input
                    value={editingPos.title || ''}
                    onChange={e => setEditingPos(p => ({ ...p!, title: e.target.value }))}
                    placeholder="ex: Directeur de l'Exploration"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Code *</label>
                  <input
                    value={editingPos.code || ''}
                    onChange={e => setEditingPos(p => ({ ...p!, code: e.target.value.toUpperCase() }))}
                    placeholder="ex: DIR-DEX"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Niveau hiérarchique *</label>
                  <select
                    value={editingPos.level || 'Cadre'}
                    onChange={e => setEditingPos(p => ({ ...p!, level: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[...POSITION_LEVELS].reverse().map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Entité de rattachement</label>
                  <select
                    value={editingPos.department_id || ''}
                    onChange={e => setEditingPos(p => ({ ...p!, department_id: e.target.value || null }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Transversal / Non rattaché —</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Description du poste</label>
                  <textarea
                    value={editingPos.description || ''}
                    onChange={e => setEditingPos(p => ({ ...p!, description: e.target.value }))}
                    rows={2}
                    placeholder="Attributions, responsabilités principales…"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* preview */}
              {editingPos.level && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${posLevelColor(editingPos.level as PositionLevel)}`}>
                  <Layers className="h-4 w-4 shrink-0" />
                  <span>Niveau : <strong>{editingPos.level}</strong></span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
              <button onClick={() => setEditingPos(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">
                Annuler
              </button>
              <button
                onClick={savePos}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ CONFIRM DELETE ══ */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Confirmer la suppression</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Supprimer <strong>{deleteConfirm.name}</strong> ? Cette action est irréversible.
              {deleteConfirm.kind === 'dept' && ' Les agents rattachés ne seront pas supprimés.'}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                disabled={saving}
                className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ TOAST ══ */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle className="h-4 w-4 shrink-0" />
            : <AlertCircle className="h-4 w-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* ══ BATCH — ENTITIES ══ */}
      {batchMode === 'entities' && (
        <BatchEntryTable<Record<string, unknown>>
          title="Entités organisationnelles"
          onClose={() => setBatchMode(null)}
          onSave={batchSaveEntities}
          initialRows={5}
          emptyRow={() => ({ name: '', code: '', org_level: 'Direction', parent_id: '', manager_id: '', description: '' })}
          columns={[
            { key: 'name', label: 'Nom complet', type: 'text', required: true, placeholder: 'Direction de l\'Exploration', width: '220px' },
            { key: 'code', label: 'Code', type: 'text', required: true, placeholder: 'DEX', width: '80px' },
            { key: 'org_level', label: 'Niveau', type: 'select', required: true, width: '140px', options: ORG_LEVELS.map(l => ({ value: l, label: l })) },
            { key: 'parent_id', label: 'Entité parente', type: 'select', width: '180px', options: departments.map(d => ({ value: d.id, label: `[${d.code}] ${d.name}` })) },
            { key: 'manager_id', label: 'Responsable', type: 'select', width: '180px', options: employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })) },
            { key: 'description', label: 'Description', type: 'text', placeholder: 'Mission…', width: '200px' },
          ] as BatchColumn<Record<string, unknown>>[]}
        />
      )}

      {/* ══ BATCH — POSITIONS ══ */}
      {batchMode === 'positions' && (
        <BatchEntryTable<Record<string, unknown>>
          title="Postes"
          onClose={() => setBatchMode(null)}
          onSave={batchSavePositions}
          initialRows={5}
          emptyRow={() => ({ title: '', code: '', level: 'Cadre', department_id: '', description: '' })}
          columns={[
            { key: 'title', label: 'Intitulé du poste', type: 'text', required: true, placeholder: 'Directeur de l\'Exploration', width: '220px' },
            { key: 'code', label: 'Code', type: 'text', required: true, placeholder: 'DIR-DEX', width: '100px' },
            { key: 'level', label: 'Niveau hiérarchique', type: 'select', required: true, width: '160px', options: [...POSITION_LEVELS].reverse().map(l => ({ value: l, label: l })) },
            { key: 'department_id', label: 'Entité', type: 'select', width: '200px', options: departments.map(d => ({ value: d.id, label: `[${d.code}] ${d.name}` })) },
            { key: 'description', label: 'Description', type: 'text', placeholder: 'Attributions…', width: '200px' },
          ] as BatchColumn<Record<string, unknown>>[]}
        />
      )}

      {/* ══ BATCH — EMPLOYEE ASSIGNMENTS ══ */}
      {batchMode === 'assignments' && (
        <BatchEntryTable<Record<string, unknown>>
          title="Affectation d'agents à des entités"
          onClose={() => setBatchMode(null)}
          onSave={batchSaveAssignments}
          initialRows={5}
          emptyRow={() => ({ employee_id: '', department_id: '', position_id: '' })}
          columns={[
            { key: 'employee_id', label: 'Agent', type: 'select', required: true, width: '220px', options: employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })) },
            { key: 'department_id', label: 'Entité / Sous-entité', type: 'select', required: true, width: '220px', options: departments.map(d => ({ value: d.id, label: `[${d.code}] ${d.name} (${d.org_level})` })) },
            { key: 'position_id', label: 'Poste', type: 'select', width: '220px', options: positions.map(p => ({ value: p.id, label: `${p.title} (${p.level})` })) },
          ] as BatchColumn<Record<string, unknown>>[]}
        />
      )}
    </div>
  );
}
