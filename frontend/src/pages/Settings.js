import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

export const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      setSettings(response.data);
    } catch (error) {
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings', settings);
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 min-h-screen">
        <div className="text-zinc-400 font-heading text-xl">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen bg-gray-50" data-testid="settings-page">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-heading font-bold text-4xl text-gray-900 mb-2">
            Settings
          </h1>
          <p className="font-body text-gray-600">
            Configure your company details and invoice preferences
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-8" data-testid="settings-form">
          <div className="bg-white border border-gray-200 rounded-md p-6">
            <h2 className="font-heading font-semibold text-xl text-gray-900 mb-6">
              Invoice Settings
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium text-gray-700">Invoice Prefix</Label>
                <Input
                  data-testid="invoice-prefix-input"
                  value={settings.invoice_prefix}
                  onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
                  className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Next Invoice Number</Label>
                <Input
                  type="number"
                  data-testid="invoice-counter-input"
                  value={settings.invoice_counter}
                  onChange={(e) => setSettings({ ...settings, invoice_counter: parseInt(e.target.value) || 1 })}
                  className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                />
              </div>
            </div>
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-xs text-gray-500 font-medium mb-1">PREVIEW:</p>
              <p className="font-heading text-2xl text-blue-600 font-bold">
                {settings.invoice_prefix}-{String(settings.invoice_counter).padStart(4, '0')}
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-6">
            <h2 className="font-heading font-semibold text-xl text-gray-900 mb-6">
              Company Details
            </h2>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Company Name</Label>
                <Input
                  data-testid="company-name-input"
                  value={settings.company_name}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">GSTIN</Label>
                <Input
                  data-testid="company-gstin-input"
                  value={settings.company_gstin}
                  onChange={(e) => setSettings({ ...settings, company_gstin: e.target.value })}
                  className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Address</Label>
                <Input
                  data-testid="company-address-input"
                  value={settings.company_address}
                  onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                  className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-6">
            <h2 className="font-heading font-semibold text-xl text-gray-900 mb-6">
              Bank Details
            </h2>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Bank Name</Label>
                <Input
                  data-testid="bank-name-input"
                  value={settings.bank_name}
                  onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                  className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Account Number</Label>
                  <Input
                    data-testid="account-number-input"
                    value={settings.account_number}
                    onChange={(e) => setSettings({ ...settings, account_number: e.target.value })}
                    className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">IFSC Code</Label>
                  <Input
                    data-testid="ifsc-code-input"
                    value={settings.ifsc_code}
                    onChange={(e) => setSettings({ ...settings, ifsc_code: e.target.value })}
                    className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">UPI ID</Label>
                <Input
                  data-testid="upi-id-input"
                  value={settings.upi_id}
                  onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })}
                  className="mt-1.5 h-11 bg-gray-50 border-gray-300"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            data-testid="save-settings-button"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-body font-medium h-11 px-6 transition-all active:scale-95"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
