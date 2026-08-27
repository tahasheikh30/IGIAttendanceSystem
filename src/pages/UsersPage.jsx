import { useEffect, useMemo, useState } from "react";
import {
  getUsers, createUser, updateUser, resetUserPassword, deleteUser, getAllDepartments, getCompanies,
} from "../api";
import { useAuth } from "../context/AuthContext";

const emptyForm = { username: "", name: "", password: "", role: "manager", departments: [], companies: [] };
const ROLE_LABEL = { admin: "HR admin", hod: "HOD", manager: "Manager" };

function DepartmentPicker({ allDepts, selected, onChange }) {
  // Grouped by company so a manager who oversees departments across two
  // companies can still find them quickly, instead of one long flat list.
  const byCompany = useMemo(() => {
    const groups = {};
    for (const d of allDepts) {
      const key = d.company || "(no company)";
      (groups[key] = groups[key] || []).push(d);
    }
    return groups;
  }, [allDepts]);

  const isChecked = (company, dept) =>
    selected.some(s => s.company === (company || "") && s.dept === dept);

  const toggle = (company, dept) => {
    const c = company || "";
    if (isChecked(company, dept)) {
      onChange(selected.filter(s => !(s.company === c && s.dept === dept)));
    } else {
      onChange([...selected, { company: c, dept }]);
    }
  };

  return (
    <div className="dept-picker">
      <div className="dept-picker-inner">
        {Object.entries(byCompany).map(([company, depts]) => (
          <div key={company} className="dept-picker-group">
            <div className="dept-picker-company">{company}</div>
            <div className="dept-picker-list">
              {depts.map(d => (
                <label key={`${d.company}:${d.dept}`} className="dept-picker-item">
                  <input
                    type="checkbox"
                    checked={isChecked(d.company, d.dept)}
                    onChange={() => toggle(d.company, d.dept)}
                  />
                  <span className="dept-picker-name">{d.dept}</span> <span className="td-muted">({d.employees})</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        {allDepts.length === 0 && <p className="hint">No department data yet - upload an export first.</p>}
      </div>
    </div>
  );
}

function CompanyPicker({ allCompanies, selected, onChange }) {
  const toggle = (company) => {
    onChange(selected.includes(company) ? selected.filter(c => c !== company) : [...selected, company]);
  };

  return (
    <div className="dept-picker">
      <div className="dept-picker-list">
        {allCompanies.map(c => (
          <label key={c.company} className="dept-picker-item">
            <input type="checkbox" checked={selected.includes(c.company)} onChange={() => toggle(c.company)} />
            {c.company} <span className="td-muted">({c.employees} employees, every department)</span>
          </label>
        ))}
      </div>
      {allCompanies.length === 0 && <p className="hint">No company data yet - upload an export first.</p>}
    </div>
  );
}

function UserForm({ initial, allDepts, allCompanies, onCancel, onSubmit, submitLabel }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const isEdit = !!initial.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err?.response?.data?.detail || "Something went wrong - try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="section-label">{isEdit ? `Edit ${initial.username}` : "New user"}</div>

      {!isEdit && (
        <label className="login-label" style={{ maxWidth: 320 }}>
          Username
          <input
            className="login-input"
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            autoComplete="off"
            required
          />
        </label>
      )}

      <label className="login-label" style={{ maxWidth: 320 }}>
        Display name
        <input
          className="login-input"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
        />
      </label>

      <label className="login-label" style={{ maxWidth: 320 }}>
        {isEdit ? "Reset password (leave blank to keep current)" : "Password"}
        <input
          className="login-input"
          type="password"
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
          autoComplete="new-password"
          minLength={isEdit ? 0 : 8}
          required={!isEdit}
        />
      </label>

      <label className="login-label" style={{ maxWidth: 320 }}>
        Role
        <select
          className="select"
          value={form.role}
          onChange={e => setForm({ ...form, role: e.target.value })}
        >
          <option value="manager">Manager - view only, specific departments</option>
          <option value="hod">HOD - view only, every department in a company</option>
          <option value="admin">Admin - full HR access</option>
        </select>
      </label>

      {form.role === "manager" && (
        <>
          <div className="hint" style={{ marginTop: 8 }}>Departments this manager can view</div>
          <DepartmentPicker
            allDepts={allDepts}
            selected={form.departments}
            onChange={(departments) => setForm({ ...form, departments })}
          />
        </>
      )}

      {form.role === "hod" && (
        <>
          <div className="hint" style={{ marginTop: 8 }}>
            Companies this HOD can view - every current and future department within them
          </div>
          <CompanyPicker
            allCompanies={allCompanies}
            selected={form.companies}
            onChange={(companies) => setForm({ ...form, companies })}
          />
        </>
      )}

      {error && <div className="login-error" style={{ marginTop: 12 }}>{error}</div>}

      <div className="header-actions" style={{ marginTop: 16 }}>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const { me } = useAuth();
  const [users, setUsers] = useState(null);
  const [allDepts, setAllDepts] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const refresh = () => getUsers().then(setUsers).catch(() => setUsers([]));

  useEffect(() => {
    refresh();
    getAllDepartments().then(setAllDepts).catch(() => setAllDepts([]));
    getCompanies().then(setAllCompanies).catch(() => setAllCompanies([]));
  }, []);

  const handleCreate = async (form) => {
    await createUser({
      username: form.username, name: form.name, password: form.password, role: form.role,
      departments: form.role === "manager" ? form.departments : [],
      companies: form.role === "hod" ? form.companies : [],
    });
    setCreating(false);
    refresh();
  };

  const handleEdit = async (id, form) => {
    const patch = {
      name: form.name, role: form.role,
      departments: form.role === "manager" ? form.departments : [],
      companies: form.role === "hod" ? form.companies : [],
    };
    await updateUser(id, patch);
    if (form.password) await resetUserPassword(id, form.password);
    setEditingId(null);
    refresh();
  };

  const handleToggleActive = async (u) => {
    setBusyId(u.id);
    try {
      await updateUser(u.id, { active: !u.active });
      refresh();
    } catch (err) {
      window.alert(err?.response?.data?.detail || "Couldn't update that user.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete ${u.username} permanently? This cannot be undone.`)) return;
    setBusyId(u.id);
    try {
      await deleteUser(u.id);
      refresh();
    } catch (err) {
      window.alert(err?.response?.data?.detail || "Couldn't delete that user.");
    } finally {
      setBusyId(null);
    }
  };

  if (!users) return <div className="empty-state">Loading…</div>;

  const editingUser = users.find(u => u.id === editingId);

  const scopeSummary = (u) => {
    if (u.role === "admin") return "All departments";
    if (u.role === "hod") return u.companies.length ? `Every dept in: ${u.companies.join(", ")}` : "No company assigned";
    return u.departments.length ? u.departments.map(d => d.dept).join(", ") : "None assigned";
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Manage users</h1>
          <p className="page-sub">HR admins see everything. HODs see every department in the companies you grant. Managers see only the specific departments you grant.</p>
        </div>
        {!creating && !editingId && (
          <button className="btn-primary" onClick={() => setCreating(true)}>+ New user</button>
        )}
      </div>

      {creating && (
        <UserForm
          initial={emptyForm}
          allDepts={allDepts}
          allCompanies={allCompanies}
          onCancel={() => setCreating(false)}
          onSubmit={handleCreate}
          submitLabel="Create user"
        />
      )}

      {editingUser && (
        <UserForm
          initial={{
            id: editingUser.id, username: editingUser.username, name: editingUser.name,
            password: "", role: editingUser.role,
            departments: editingUser.departments, companies: editingUser.companies,
          }}
          allDepts={allDepts}
          allCompanies={allCompanies}
          onCancel={() => setEditingId(null)}
          onSubmit={(form) => handleEdit(editingUser.id, form)}
          submitLabel="Save changes"
        />
      )}

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th><th>Username</th><th>Role</th><th>Access</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td className="td-name">{u.name}{u.id === me?.id && <span className="td-muted"> (you)</span>}</td>
                <td className="td-muted">{u.username}</td>
                <td>{ROLE_LABEL[u.role] || u.role}</td>
                <td className="td-muted">{scopeSummary(u)}</td>
                <td>
                  {u.active
                    ? <span className="badge-success">Active</span>
                    : <span className="badge-danger">Inactive</span>}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="btn-ghost" onClick={() => { setEditingId(u.id); setCreating(false); }}>Edit</button>
                  {u.id !== me?.id && (
                    <>
                      {" "}
                      <button className="btn-ghost" onClick={() => handleToggleActive(u)} disabled={busyId === u.id}>
                        {u.active ? "Deactivate" : "Activate"}
                      </button>{" "}
                      <button className="btn-ghost" onClick={() => handleDelete(u)} disabled={busyId === u.id}>
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
