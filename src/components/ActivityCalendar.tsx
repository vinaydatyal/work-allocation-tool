import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Search, Trash2, X } from 'lucide-react';
import type { Task, TeamMember } from '../types';
import './ActivityCalendar.css';

export type ActivityCategory = 'work' | 'payment' | 'milestone' | 'client' | 'note';

export interface CalendarProject {
  id: string;
  name: string;
  client: string;
  paymentDueDate?: string;
  dueDateOrRenewal?: string;
}

interface CalendarActivity {
  id: string;
  title: string;
  date: string;
  time: string;
  category: ActivityCategory;
  client: string;
  projectId: string;
  ownerId: string;
  notes: string;
  completed: boolean;
  source: 'manual' | 'task' | 'project';
}

interface ActivityCalendarProps {
  tasks: Task[];
  members: TeamMember[];
  projects: CalendarProject[];
}

const STORAGE_KEY = 'work-allocation-calendar-activities-v1';
const categories: { id: ActivityCategory; label: string }[] = [
  { id: 'work', label: 'Work' },
  { id: 'payment', label: 'Payments' },
  { id: 'milestone', label: 'Milestones' },
  { id: 'client', label: 'Client' },
  { id: 'note', label: 'Notes' }
];

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const emptyActivity = (date = formatDate(new Date())): CalendarActivity => ({
  id: '', title: '', date, time: '10:00', category: 'work', client: '', projectId: '', ownerId: '', notes: '', completed: false, source: 'manual'
});

export function ActivityCalendar({ tasks, members, projects }: ActivityCalendarProps) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [manualActivities, setManualActivities] = useState<CalendarActivity[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [enabledCategories, setEnabledCategories] = useState<ActivityCategory[]>(categories.map((item) => item.id));
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<CalendarActivity | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manualActivities));
  }, [manualActivities]);

  const generatedActivities = useMemo<CalendarActivity[]>(() => [
    ...tasks.filter((task) => task.dueDate).map((task) => ({
      id: `task-${task.id}`, title: task.title, date: task.dueDate, time: '09:00', category: 'work' as const,
      client: task.clientName, projectId: '', ownerId: task.assignedUserId || '', notes: `${task.estimatedHours}h estimated · ${task.status.replace('_', ' ')}`,
      completed: task.status === 'completed', source: 'task' as const
    })),
    ...projects.filter((project) => /^\d{4}-\d{2}-\d{2}$/.test(project.paymentDueDate || '')).map((project) => ({
      id: `payment-${project.id}`, title: `Payment due · ${project.name}`, date: project.paymentDueDate!, time: '12:00', category: 'payment' as const,
      client: project.client, projectId: project.id, ownerId: '', notes: 'Generated from project payment schedule', completed: false, source: 'project' as const
    }))
  ], [tasks, projects]);

  const allActivities = useMemo(() => [...manualActivities, ...generatedActivities].filter((activity) => {
    const matchesCategory = enabledCategories.includes(activity.category);
    const searchable = `${activity.title} ${activity.client} ${activity.notes}`.toLowerCase();
    return matchesCategory && searchable.includes(query.toLowerCase());
  }), [manualActivities, generatedActivities, enabledCategories, query]);

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [month]);

  const saveActivity = () => {
    if (!editing?.title.trim() || !editing.date) return;
    setManualActivities((current) => editing.id
      ? current.map((item) => item.id === editing.id ? editing : item)
      : [...current, { ...editing, id: `cal-${Date.now()}`, source: 'manual' }]
    );
    setEditing(null);
  };

  const openDay = (date: string) => setEditing(emptyActivity(date));
  const editActivity = (activity: CalendarActivity) => {
    if (activity.source !== 'manual') {
      setEditing({ ...activity, id: '', source: 'manual', title: `${activity.title} follow-up` });
      return;
    }
    setEditing({ ...activity });
  };

  return (
    <div className="activity-calendar">
      <header className="calendar-toolbar">
        <div>
          <div className="calendar-title"><CalendarDays size={20} /><h2>Activity calendar</h2><span>{allActivities.length} activities</span></div>
          <p>Payments, work, milestones, client follow-ups and notes.</p>
        </div>
        <div className="calendar-actions">
          <button onClick={() => setMonth(new Date())}>Today</button>
          <button aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={17} /></button>
          <strong>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
          <button aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={17} /></button>
          <button className="calendar-primary" onClick={() => setEditing(emptyActivity())}><Plus size={16} /> Add activity</button>
        </div>
      </header>

      <div className="calendar-filters">
        <div className="calendar-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search activities, clients or notes" /></div>
        {categories.map((category) => <button key={category.id} className={`category-chip ${category.id} ${enabledCategories.includes(category.id) ? 'active' : ''}`} onClick={() => setEnabledCategories((current) => current.includes(category.id) ? current.filter((id) => id !== category.id) : [...current, category.id])}>{category.label}</button>)}
      </div>

      <div className="calendar-weekdays">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="calendar-grid">
        {days.map((date) => {
          const dateKey = formatDate(date);
          const dateActivities = allActivities.filter((activity) => activity.date === dateKey).sort((a, b) => a.time.localeCompare(b.time));
          const outside = date.getMonth() !== month.getMonth();
          const today = dateKey === formatDate(new Date());
          return <div key={dateKey} className={`calendar-day ${outside ? 'outside' : ''} ${today ? 'today' : ''}`} onDoubleClick={() => openDay(dateKey)}>
            <button className="day-number" onClick={() => openDay(dateKey)}>{date.getDate()}</button>
            <div className="day-activities">{dateActivities.slice(0, 4).map((activity) => <button key={activity.id} className={`calendar-event ${activity.category} ${activity.completed ? 'completed' : ''}`} onClick={() => editActivity(activity)} title={activity.notes}><span>{activity.time}</span>{activity.title}</button>)}{dateActivities.length > 4 && <span className="more-activities">+{dateActivities.length - 4} more</span>}</div>
          </div>;
        })}
      </div>

      {editing && <div className="calendar-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}>
        <form className="calendar-modal" onSubmit={(event) => { event.preventDefault(); saveActivity(); }}>
          <div className="calendar-modal-header"><div><h3>{editing.id ? 'Edit activity' : 'Schedule activity'}</h3><p>Manage operational work from one record.</p></div><button type="button" onClick={() => setEditing(null)}><X size={18} /></button></div>
          <label>Title<input required autoFocus value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} placeholder="What needs to happen?" /></label>
          <div className="calendar-form-row"><label>Date<input required type="date" value={editing.date} onChange={(event) => setEditing({ ...editing, date: event.target.value })} /></label><label>Time<input type="time" value={editing.time} onChange={(event) => setEditing({ ...editing, time: event.target.value })} /></label></div>
          <div className="calendar-form-row"><label>Category<select value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value as ActivityCategory })}>{categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Owner<select value={editing.ownerId} onChange={(event) => setEditing({ ...editing, ownerId: event.target.value })}><option value="">Unassigned</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label></div>
          <div className="calendar-form-row"><label>Project<select value={editing.projectId} onChange={(event) => { const project = projects.find((item) => item.id === event.target.value); setEditing({ ...editing, projectId: event.target.value, client: project?.client || editing.client }); }}><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label>Client<input value={editing.client} onChange={(event) => setEditing({ ...editing, client: event.target.value })} /></label></div>
          <label>Notes<textarea rows={4} value={editing.notes} onChange={(event) => setEditing({ ...editing, notes: event.target.value })} placeholder="Context, links, agenda or instructions" /></label>
          <label className="calendar-checkbox"><input type="checkbox" checked={editing.completed} onChange={(event) => setEditing({ ...editing, completed: event.target.checked })} /> Mark completed</label>
          <footer>{editing.id && <button type="button" className="calendar-delete" onClick={() => { if (confirm('Delete this activity?')) { setManualActivities((current) => current.filter((item) => item.id !== editing.id)); setEditing(null); } }}><Trash2 size={15} /> Delete</button>}<span /><button type="button" onClick={() => setEditing(null)}>Cancel</button><button className="calendar-primary" type="submit">Save activity</button></footer>
        </form>
      </div>}
    </div>
  );
}
