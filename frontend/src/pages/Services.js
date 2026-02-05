import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';

export const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    gst_type: 'add',
    gst_percentage: 18.0,
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await api.get('/services');
      setServices(response.data);
    } catch (error) {
      toast.error('Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingService) {
        await api.put(`/services/${editingService.id}`, formData);
        toast.success('Service updated successfully');
      } else {
        await api.post('/services', formData);
        toast.success('Service created successfully');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchServices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save service');
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price,
      gst_type: service.gst_type,
      gst_percentage: service.gst_percentage,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await api.delete(`/services/${id}`);
      toast.success('Service deleted successfully');
      fetchServices();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      gst_type: 'add',
      gst_percentage: 18.0,
    });
    setEditingService(null);
  };

  const calculateFinalPrice = (price, gstType, gstPercentage) => {
    if (gstType === 'included') {
      // Price already includes GST, so final price = price
      return price;
    } else {
      // GST will be added on top
      return price * (1 + gstPercentage / 100);
    }
  };

  const calculateBasePrice = (price, gstType, gstPercentage) => {
    if (gstType === 'included') {
      // Extract base price from total: base = total / (1 + gst%)
      return price / (1 + gstPercentage / 100);
    } else {
      // Base price is the entered price
      return price;
    }
  };

  if (loading) {
    return (
      <div className="p-8 min-h-screen bg-gray-50">
        <div className="text-gray-600 font-body text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen bg-gray-50" data-testid="services-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="font-heading font-bold text-4xl text-gray-900 mb-2">
              Services
            </h1>
            <p className="font-body text-gray-600">
              Manage your service catalog with pricing
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-service-button"
                className="bg-blue-600 hover:bg-blue-700 text-white font-body font-medium h-11 px-6 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5 mr-2" strokeWidth={1.5} />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border border-gray-200 rounded-md max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-heading font-bold text-2xl text-gray-900">
                  {editingService ? 'Edit Service' : 'Add New Service'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="service-form">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Service Name *</Label>
                  <Input
                    data-testid="service-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                    placeholder="e.g., Website Design"
                    required
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Description</Label>
                  <Input
                    data-testid="service-description-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                    placeholder="Brief description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Price (₹) *</Label>
                    <Input
                      type="number"
                      data-testid="service-price-input"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">GST Type</Label>
                    <Select
                      value={formData.gst_type}
                      onValueChange={(value) => setFormData({ ...formData, gst_type: value })}
                    >
                      <SelectTrigger className="mt-1.5 h-11 bg-gray-50 border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="add">Add GST</SelectItem>
                        <SelectItem value="included">GST Included</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">GST Percentage (%)</Label>
                  <Input
                    type="number"
                    data-testid="service-gst-input"
                    value={formData.gst_percentage}
                    onChange={(e) => setFormData({ ...formData, gst_percentage: parseFloat(e.target.value) || 0 })}
                    className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm font-medium text-gray-700 mb-3">Price Breakdown:</p>
                  {formData.gst_type === 'included' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Final Price (GST Included):</span>
                        <span className="font-mono font-semibold text-gray-900">₹{formData.price.toFixed(2)}</span>
                      </div>
                      <div className="h-px bg-blue-300"></div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Base Amount:</span>
                        <span className="font-mono text-gray-600">₹{calculateBasePrice(formData.price, formData.gst_type, formData.gst_percentage).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">GST ({formData.gst_percentage}%):</span>
                        <span className="font-mono text-gray-600">₹{(formData.price - calculateBasePrice(formData.price, formData.gst_type, formData.gst_percentage)).toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-blue-700 mt-2 italic">
                        In invoice: Base ₹{calculateBasePrice(formData.price, formData.gst_type, formData.gst_percentage).toFixed(2)} + GST = ₹{formData.price.toFixed(2)}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Base Price:</span>
                        <span className="font-mono font-semibold text-gray-900">₹{formData.price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">GST ({formData.gst_percentage}%):</span>
                        <span className="font-mono font-semibold text-green-600">+₹{(formData.price * formData.gst_percentage / 100).toFixed(2)}</span>
                      </div>
                      <div className="h-px bg-blue-300"></div>
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-gray-700">Final Price:</span>
                        <span className="font-mono text-2xl text-blue-600 font-bold">₹{calculateFinalPrice(formData.price, formData.gst_type, formData.gst_percentage).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    data-testid="service-submit-button"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-body font-medium h-11"
                  >
                    {editingService ? 'Update' : 'Create'}
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

        {services.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-md p-12 text-center">
            <div className="text-gray-500 font-body mb-2">No services yet</div>
            <p className="text-gray-400 text-sm">Add your first service to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div
                key={service.id}
                data-testid={`service-card-${service.id}`}
                className="bg-white border border-gray-200 rounded-md p-6 hover:border-blue-300 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-heading font-bold text-xl text-gray-900 mb-1">{service.name}</h3>
                    {service.description && (
                      <p className="text-sm text-gray-600">{service.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button
                      data-testid={`edit-service-${service.id}`}
                      onClick={() => handleEdit(service)}
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      data-testid={`delete-service-${service.id}`}
                      onClick={() => handleDelete(service.id)}
                      className="text-red-600 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                  {service.gst_type === 'included' ? (
                    <>
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-sm text-gray-600">Final Price (GST Inc.):</span>
                        <span className="font-mono text-lg text-gray-900 font-semibold">₹{service.price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-baseline mb-2 text-xs">
                        <span className="text-gray-500">Base Price:</span>
                        <span className="font-mono text-gray-600">₹{calculateBasePrice(service.price, service.gst_type, service.gst_percentage).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-baseline mb-2 text-xs">
                        <span className="text-gray-500">GST ({service.gst_percentage}%):</span>
                        <span className="font-mono text-gray-600">₹{(service.price - calculateBasePrice(service.price, service.gst_type, service.gst_percentage)).toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-sm text-gray-600">Base Price:</span>
                        <span className="font-mono text-lg text-gray-900 font-semibold">₹{service.price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-sm text-gray-600">GST ({service.gst_percentage}%):</span>
                        <span className="font-mono text-gray-600">+₹{(service.price * service.gst_percentage / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-baseline pt-2 border-t border-gray-300">
                        <span className="text-sm font-medium text-gray-700">Final Price:</span>
                        <span className="font-mono text-xl text-blue-600 font-bold">
                          ₹{calculateFinalPrice(service.price, service.gst_type, service.gst_percentage).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Services;
