import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function SortableTask({ task, toggleComplete, deleteTask }) {
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
