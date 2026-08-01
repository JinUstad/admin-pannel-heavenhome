"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { Users, Package, ShoppingCart, DollarSign, ExternalLink } from 'lucide-react';

export default function DashboardOverview() {
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [registeredUsersCount, setRegisteredUsersCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // 1. Real-time active users (Online right now)
    const channel = supabase.channel('online-users');
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const activeCount = Object.keys(presenceState).length;
        setActiveUsersCount(activeCount);
      })
      .subscribe();

    // 2. Data fetching logic
    let isMounted = true;
    const fetchDashboardData = async () => {
      try {
        const [
          { data: ordersData },
          { count: pCount },
          { count: uCount }
        ] = await Promise.all([
          // Fetch orders along with user email for the recent orders table
          supabase.from('orders').select('*, users(email)').order('created_at', { ascending: false }),
          supabase.from('products').select('*', { count: 'exact', head: true }),
          supabase.from('users').select('*', { count: 'exact', head: true })
        ]);

        if (!isMounted) return;

        let totalRev = 0;
        let tSales = 0;
        const recent: any[] = [];
        const dataByDate: Record<string, { name: string; revenue: number; sales: number }> = {};

        if (ordersData) {
          tSales = ordersData.length;
          
          ordersData.forEach(order => {
            totalRev += Number(order.total_amount);
            
            // Recharts data grouping by date
            const dateStr = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            if (!dataByDate[dateStr]) {
              dataByDate[dateStr] = { name: dateStr, revenue: 0, sales: 0 };
            }
            dataByDate[dateStr].revenue += Number(order.total_amount);
            dataByDate[dateStr].sales += 1;

            // Push to recent orders if less than 5
            if (recent.length < 5) {
              recent.push(order);
            }
          });
        }

        // Convert the map to an array and reverse it so chronological order is left to right
        const formattedChartData = Object.values(dataByDate).reverse();

        setRevenue(totalRev);
        setSalesCount(tSales);
        setProductsCount(pCount || 0);
        setRegisteredUsersCount(uCount || 0);
        setRecentOrders(recent);
        
        if (formattedChartData.length > 0) {
          setChartData(formattedChartData);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      }
    };

    // Initial fetch
    fetchDashboardData();

    // Polling every 1 second
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = [
    { name: 'Total Revenue', value: `₹${revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: DollarSign, link: '/orders' },
    { name: 'Total Sales', value: salesCount.toString(), icon: ShoppingCart, link: '/orders' },
    { name: 'Products', value: productsCount.toString(), icon: Package, link: '/inventory' }, 
    { name: 'Total Users', value: registeredUsersCount.toString(), icon: Users, link: '/users' },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Dashboard Overview</h2>
          <p className="text-gray-400 mt-2">Live metrics updated every second.</p>
        </div>
        <div className="flex items-center gap-2 bg-[#121212] border border-[#262626] px-4 py-2 rounded-lg">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-medium text-emerald-400">{activeUsersCount} Online Now</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link href={stat.link} key={stat.name} className="block group">
            <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 shadow-sm hover:border-emerald-500/50 transition-all hover:bg-[#151515] hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">{stat.name}</p>
                  <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
                </div>
                <div className="p-3 bg-[#1a1a1a] rounded-lg group-hover:bg-emerald-500/10 transition-colors">
                  <stat.icon className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-medium text-white mb-6">Revenue Over Time</h3>
          <div className="h-[300px] w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="name" stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #262626', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value) => [`₹${value}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-medium text-white mb-6">Sales Volume</h3>
          <div className="h-[300px] w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="name" stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #262626', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value) => [`${value} Orders`, 'Sales']}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#34d399" strokeWidth={3} dot={{ r: 4, fill: '#34d399' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-[#121212] border border-[#262626] rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-[#262626] flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">Recent Orders</h3>
          <Link href="/orders" className="text-sm text-emerald-400 hover:text-emerald-300 font-medium">
            View All →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-[#1a1a1a] text-gray-300 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No orders found.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {order.id.split('-')[0]}...
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      {order.users?.email || 'Unknown User'}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-400">
                      ₹{Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

