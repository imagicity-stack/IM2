import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, DollarSign } from 'lucide-react';

export const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: 0,
    category: '',
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await api.get('/expenses');
      setExpenses(response.data);
    } catch (error) {
      toast.error('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/expenses', formData);
      toast.success('Expense added successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchExpenses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add expense');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Expense deleted successfully');
      fetchExpenses();
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: 0,
      category: '',
    });
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (loading) {
    return (
      <div className="p-8 min-h-screen bg-gray-50">
        <div className="text-gray-600 font-body text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen bg-gray-50" data-testid="expenses-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="font-heading font-bold text-4xl text-gray-900 mb-2">
              Expenses
            </h1>
            <p className="font-body text-gray-600">
              Track your business expenses
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-expense-button"
                className="bg-blue-600 hover:bg-blue-700 text-white font-body font-medium h-11 px-6 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5 mr-2" strokeWidth={1.5} />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border border-gray-200 rounded-md max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-heading font-bold text-2xl text-gray-900">
                  Add New Expense
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="expense-form">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Date *</Label>
                  <Input
                    type="date"
                    data-testid="expense-date-input"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                    required
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Description *</Label>
                  <Input
                    data-testid="expense-description-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                    placeholder="What was this expense for?"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Amount *</Label>
                    <Input
                      type="number"
                      data-testid="expense-amount-input"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Category *</Label>
                    <Input
                      data-testid="expense-category-input"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                      placeholder="e.g., Office, Travel, Software"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    data-testid="expense-submit-button"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-body font-medium h-11"
                  >
                    Add Expense
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-body"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-red-50 p-3 rounded-md">
              <DollarSign className="w-8 h-8 text-red-600" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <p className="font-heading font-bold text-4xl text-red-600">
                ₹{totalExpenses.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-md p-12 text-center">
            <div className="text-gray-500 font-body mb-2">No expenses recorded yet</div>
            <p className="text-gray-400 text-sm">Add your first expense to start tracking</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="expenses-table">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Date</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Description</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Category</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Amount</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors" data-testid={`expense-row-${expense.id}`}>
                      <td className="py-4 px-4 font-body text-gray-600">{expense.date}</td>
                      <td className="py-4 px-4 font-body text-gray-900">{expense.description}</td>
                      <td className="py-4 px-4 font-body text-gray-600">
                        <span className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs uppercase font-medium">
                          {expense.category}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-right text-red-600 font-semibold">
                        ₹{expense.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2 justify-end">
                          <button
                            data-testid={`delete-expense-${expense.id}`}
                            onClick={() => handleDelete(expense.id)}
                            className="text-red-600 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Expenses;
