import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Task Component
function SortableTask({ task, toggleComplete, deleteTask }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex justify-between items-center p-2 mb-2 border rounded ${
        task.completed ? 'line-through text-gray-400' : ''
      }`}
    >
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => toggleComplete(task.id, task.completed)}
          className="mr-2"
        />
        <span>{task.task}</span>
        <span className={`ml-2 px-2 py-1 rounded text-white ${
          task.priority === 'High'
            ? 'bg-red-500'
            : task.priority === 'Medium'
            ? 'bg-yellow-500'
            : 'bg-green-500'
        }`}>
          {task.priority}
        </span>
      </div>
      <button
        onClick={() => deleteTask(task.id)}
        className="bg-red-500 text-white px-2 py-1 rounded"
      >
        Delete
      </button>
    </li>
  );
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState('Low');
  const [filter, setFilter] = useState('All');

  const sensors = useSensors(useSensor(PointerSensor));

  // Check auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/auth');
      else setUser(data.session.user);
    });

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) router.push('/auth');
      else setUser(session.user);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Fetch tasks & subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const fetchTasks = async () => {
      const { data } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setTasks(data);
    };

    fetchTasks();

    const subscription = supabase
      .channel('todos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos', filter: `user_id=eq.${user.id}` },
        () => fetchTasks()
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [user]);

  const addTask = async () => {
    if (!newTask.trim()) return;
    await supabase.from('todos').insert([{ task: newTask, priority, user_id: user.id }]);
    setNewTask('');
  };

  const deleteTask = async (id) => await supabase.from('todos').delete().eq('id', id);

  const toggleComplete = async (id, completed) =>
    await supabase.from('todos').update({ completed: !completed }).eq('id', id);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const filteredTasks = tasks
    .filter(t => filter === 'All' || (filter === 'Active' ? !t.completed : t.completed))
    .sort((a, b) => ({ High: 3, Medium: 2, Low: 1 }[b.priority] - { High: 3, Medium: 2, Low: 1 }[a.priority]));

  const handleDragEnd = ({ active, over }) => {
    if (!over) return;
    if (active.id !== over.id) {
      const oldIndex = filteredTasks.findIndex(task => task.id === active.id);
      const newIndex = filteredTasks.findIndex(task => task.id === over.id);
      const newOrder = arrayMove(filteredTasks, oldIndex, newIndex);
      setTasks(newOrder); // Local reorder
    }
  };

  if (!user) return null;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">My Todo List</h1>
        <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded">Logout</button>
      </div>

      {/* Add Task */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Enter new task"
          className="border p-2 flex-1 rounded"
        />
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="border p-2 rounded">
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>
        <button onClick={addTask} className="bg-blue-500 text-white px-4 py-2 rounded">Add</button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        {['All', 'Active', 'Completed'].map(f => (
          <button
            key={f}
            className={`px-3 py-1 rounded ${filter === f ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Drag & Drop Task List */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={filteredTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <ul>
            {filteredTasks.map(task => (
              <SortableTask key={task.id} task={task} toggleComplete={toggleComplete} deleteTask={deleteTask} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
            }
