import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { DollarSign, FileText, Users, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, invoicesRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/invoices'),
      ]);
      setStats(statsRes.data);
      setRecentInvoices(invoicesRes.data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 min-h-screen" data-testid="dashboard-loading">
        <div className="text-gray-600 font-body text-lg">Loading...</div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Revenue',
      value: `₹${stats?.total_revenue?.toLocaleString('en-IN') || 0}`,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Pending Amount',
      value: `₹${stats?.pending_amount?.toLocaleString('en-IN') || 0}`,
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Total Clients',
      value: stats?.client_count || 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total Invoices',
      value: stats?.invoice_count || 0,
      icon: FileText,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  const pieData = [
    { name: 'Paid', value: stats?.total_revenue || 0, color: '#16A34A' },
    { name: 'Pending', value: stats?.pending_amount || 0, color: '#F97316' },
    { name: 'Overdue', value: stats?.overdue_amount || 0, color: '#DC2626' },
  ];

  return (
    <div className="p-8 min-h-screen bg-gray-50" data-testid="dashboard">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="font-heading font-bold text-4xl text-gray-900 mb-2">
            Dashboard
          </h1>
          <p className="font-body text-gray-600">
            Overview of your business performance
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                data-testid={`stat-card-${index}`}
                className="bg-white border border-gray-200 rounded-md p-6 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`${stat.bg} p-3 rounded-md`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} strokeWidth={1.5} />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-500 mb-1">
                  {stat.label}
                </p>
                <p className={`font-heading font-bold text-3xl ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-md p-6">
            <h3 className="font-heading font-semibold text-xl text-gray-900 mb-6">
              Revenue Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ₹${entry.value.toLocaleString('en-IN')}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-6">
            <h3 className="font-heading font-semibold text-xl text-gray-900 mb-6">
              Quick Stats
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-md">
                <span className="font-body text-gray-600">Total Expenses</span>
                <span className="font-mono text-xl text-red-600 font-semibold">
                  ₹{stats?.total_expenses?.toLocaleString('en-IN') || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-md">
                <span className="font-body text-gray-600">Net Profit</span>
                <span className="font-mono text-xl text-green-600 font-semibold">
                  ₹{((stats?.total_revenue || 0) - (stats?.total_expenses || 0)).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-md">
                <span className="font-body text-gray-600">Overdue Amount</span>
                <span className="font-mono text-xl text-orange-600 font-semibold">
                  ₹{stats?.overdue_amount?.toLocaleString('en-IN') || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-6">
          <h3 className="font-heading font-semibold text-xl text-gray-900 mb-6">
            Recent Invoices
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="recent-invoices-table">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                    Invoice #
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                    Date
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                    Type
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                    Amount
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500 font-body">
                      No invoices yet. Create your first invoice!
                    </td>
                  </tr>
                ) : (
                  recentInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 font-mono text-gray-900 font-medium">{invoice.invoice_number}</td>
                      <td className="py-4 px-4 font-body text-gray-600">{invoice.invoice_date}</td>
                      <td className="py-4 px-4 font-body text-gray-600 uppercase text-xs">
                        {invoice.invoice_type}
                      </td>
                      <td className="py-4 px-4 font-mono text-right text-gray-900 font-semibold">
                        ₹{invoice.total.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium uppercase ${
                            invoice.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : invoice.status === 'pending'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
