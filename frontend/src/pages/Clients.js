import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Mail, Phone, MapPin } from 'lucide-react';

export const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    business_name: '',
    email: '',
    phone: '',
    gstin: '',
    country: 'India',
    address: '',
    business_address: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (error) {
      toast.error('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await api.put(`/clients/${editingClient.id}`, formData);
        toast.success('Client updated successfully');
      } else {
        await api.post('/clients', formData);
        toast.success('Client created successfully');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save client');
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      business_name: client.business_name || '',
      email: client.email || '',
      phone: client.phone || '',
      gstin: client.gstin || '',
      country: client.country || 'India',
      address: client.address || '',
      business_address: client.business_address || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    try {
      await api.delete(`/clients/${id}`);
      toast.success('Client deleted successfully');
      fetchClients();
    } catch (error) {
      toast.error('Failed to delete client');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      business_name: '',
      email: '',
      phone: '',
      gstin: '',
      country: 'India',
      address: '',
      business_address: '',
    });
    setEditingClient(null);
  };

  if (loading) {
    return (
      <div className="p-8 min-h-screen bg-gray-50">
        <div className="text-gray-600 font-body text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen bg-gray-50" data-testid="clients-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="font-heading font-bold text-4xl text-gray-900 mb-2">
              Clients
            </h1>
            <p className="font-body text-gray-600">
              Manage your client database
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-client-button"
                className="bg-blue-600 hover:bg-blue-700 text-white font-body font-medium h-11 px-6 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5 mr-2" strokeWidth={1.5} />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border border-gray-200 rounded-md max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-heading font-bold text-2xl text-gray-900">
                  {editingClient ? 'Edit Client' : 'Add New Client'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="client-form">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Contact Person Name *</Label>
                    <Input
                      data-testid="client-name-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Business Name</Label>
                    <Input
                      data-testid="client-business-name-input"
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Email</Label>
                    <Input
                      data-testid="client-email-input"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Phone</Label>
                    <Input
                      data-testid="client-phone-input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">GSTIN</Label>
                    <Input
                      data-testid="client-gstin-input"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                      className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                      placeholder="22AAAAA0000A1Z5"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Country</Label>
                    <Input
                      data-testid="client-country-input"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Personal Address</Label>
                  <Input
                    data-testid="client-address-input"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Business Address</Label>
                  <Input
                    data-testid="client-business-address-input"
                    value={formData.business_address}
                    onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
                    className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    data-testid="client-submit-button"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-body font-medium h-11"
                  >
                    {editingClient ? 'Update' : 'Create'}
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

        {clients.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-md p-12 text-center">
            <div className="text-gray-500 font-body mb-2">No clients yet</div>
            <p className="text-gray-400 text-sm">Add your first client to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              <div
                key={client.id}
                data-testid={`client-card-${client.id}`}
                className="bg-white border border-gray-200 rounded-md p-6 hover:border-blue-300 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-heading font-bold text-xl text-gray-900">{client.name}</h3>
                    {client.business_name && (
                      <p className="text-sm text-gray-600 mt-1">{client.business_name}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      data-testid={`edit-client-${client.id}`}
                      onClick={() => handleEdit(client)}
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      data-testid={`delete-client-${client.id}`}
                      onClick={() => handleDelete(client.id)}
                      className="text-red-600 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {client.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="font-body">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span className="font-body">{client.phone}</span>
                    </div>
                  )}
                  {client.gstin && (
                    <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded">
                      <span className="text-xs text-gray-500 font-medium">GSTIN:</span>
                      <span className="font-mono text-sm text-gray-900 ml-2">{client.gstin}</span>
                    </div>
                  )}
                  {client.country && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                      <span className="text-xs text-blue-600 font-medium">Country:</span>
                      <span className="text-sm text-blue-900 ml-2 font-semibold">{client.country}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-start gap-2 text-gray-600 mt-3">
                      <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                      <div>
                        <span className="font-body text-xs text-gray-500 block">Personal:</span>
                        <span className="font-body text-sm">{client.address}</span>
                      </div>
                    </div>
                  )}
                  {client.business_address && (
                    <div className="flex items-start gap-2 text-gray-600 mt-2">
                      <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                      <div>
                        <span className="font-body text-xs text-gray-500 block">Business:</span>
                        <span className="font-body text-sm">{client.business_address}</span>
                      </div>
                    </div>
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

export default Clients;
