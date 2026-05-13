import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiClock, FiPlay } from 'react-icons/fi';
import PageHeader from '../components/PageHeader';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';

const getRelativeTime = (date) => {
  const now = new Date();
  const diff = new Date(date) - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  return 'Due soon';
};

const PendingTasks = () => {
  const MotionCard = motion.div;
  const navigate = useNavigate();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['pending-tasks'],
    queryFn: async () => {
      const res = await api.get('/api/dashboard/pending-tasks');
      return res.data.data;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Pending Tasks"
          subtitle="Manage and resume your ongoing missions and assignments."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pending Tasks"
        subtitle="Manage and resume your ongoing missions and assignments."
      />

      {tasks.length === 0 ? (
        <EmptyState 
          title="All caught up!" 
          description="No pending missions for now. Check back later or explore the Missions archive." 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {tasks.map((task, index) => (
            <MotionCard
              key={task._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/challenge/${task._id}`)}
              className="group macos-glass p-6 hover:border-accent transition-all cursor-pointer bg-white/[0.02]"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs text-tertiary uppercase font-black tracking-widest">{task.category}</span>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] px-2 py-1 rounded uppercase font-black ${
                    task.priority === 'High' ? 'bg-red-500/20 text-red-500' : 
                    task.priority === 'Med' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {task.priority} Priority
                  </span>
                  {task.isRejected && (
                    <span className="text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-tighter animate-pulse">
                      Retry Required
                    </span>
                  )}
                </div>
              </div>
              <h3 className="font-bold text-xl leading-tight group-hover:text-accent transition-colors mb-6">{task.title}</h3>
              
              <div className="w-full bg-white/5 h-1.5 rounded-full mb-6 overflow-hidden">
                <div className={`h-full ${task.isRejected ? 'bg-red-500 w-[10%]' : 'bg-accent w-[30%]'}`}></div>
              </div>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-glass-border/40">
                <div className="flex items-center gap-2">
                  <FiClock size={14} className="text-accent" />
                  <span className="text-xs text-secondary font-medium">
                    {task.deadline ? getRelativeTime(task.deadline) : 'No deadline'}
                  </span>
                </div>
                <button className="flex items-center gap-2 text-xs bg-accent/10 text-accent px-4 py-2 rounded-lg font-bold hover:bg-accent hover:text-white transition-all shadow-accent/20">
                  <FiPlay size={12} />
                  {task.isRejected ? 'Retry' : 'Resume'}
                </button>
              </div>
            </MotionCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingTasks;
