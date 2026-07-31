"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { Users, Package, ShoppingCart, DollarSign } from 'lucide-react';

const salesData: any[] = [];

const baseStats = [
  { name: 'Total Revenue', value: '₹0.00', icon: DollarSign, change: '0%', suffix: 'from last month' },
  { name: 'Sales', value: '0', icon: ShoppingCart, change: '0%', suffix: 'from last month' },
  { name: 'Products', value: '0', icon: Package, change: '0%', suffix: 'from last month' },
  { name: 'Active Users', value: '0', icon: Users, change: 'Live', suffix: 'right now' },
];

export default function DashboardOverview() {
  const [activeUsersCount, setActiveUsersCount] = useState(0);

  useEffect(() => {
    const channel = supabase.channel('online-users');

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const activeCount = Object.keys(presenceState).length;
        setActiveUsersCount(activeCount);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = baseStats.map(stat => {
    if (stat.name === 'Active Users') {
      return { ...stat, value: activeUsersCount.toString() };
    }
    return stat;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white tracking-tight">Dashboard</h2>
        <p className="text-gray-400 mt-2">Welcome back to Heaven Home admin panel.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-[#121212] border border-[#262626] rounded-xl p-6 shadow-sm hover:border-emerald-500/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">{stat.name}</p>
                <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
              </div>
              <div className="p-3 bg-[#1a1a1a] rounded-lg">
                <stat.icon className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              {stat.name === 'Active Users' ? (
                <span className="flex items-center text-emerald-400 font-medium">
                  <span className="relative flex h-2 w-2 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  {stat.change}
                </span>
              ) : (
                <span className="text-emerald-400 font-medium">{stat.change}</span>
              )}
              <span className="ml-2 text-gray-500">{stat.suffix}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#121212] border border-[#262626] rounded-xl p-6">
          <h3 className="text-lg font-medium text-white mb-6">Revenue Overview</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="name" stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #262626', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#121212] border border-[#262626] rounded-xl p-6">
          <h3 className="text-lg font-medium text-white mb-6">Active Users</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="name" stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #262626', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="total" stroke="#34d399" strokeWidth={3} dot={{ r: 4, fill: '#34d399' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
