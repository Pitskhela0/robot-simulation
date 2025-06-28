// src/features/simulation-setup/TaskList.tsx
import React from 'react';
import { Task } from '../../types/task';
import TaskCard from './TaskCard';
import './TaskList.css';

interface TaskListProps {
  tasks: Task[];
  onTaskDeleted: () => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, onTaskDeleted }) => {
  if (tasks.length === 0) {
    return (
      <div className="task-list empty">
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <p>No tasks added yet</p>
          <p className="empty-subtitle">Add your first task to get started</p>
        </div>
      </div>
    );
  }

  // Sort tasks by priority (highest first) and then by creation date
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority; // Higher priority first
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return (
    <div className="task-list">
      <h4>Tasks ({tasks.length})</h4>
      <div className="task-cards">
        {sortedTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDeleted={onTaskDeleted}
          />
        ))}
      </div>
    </div>
  );
};

export default TaskList;