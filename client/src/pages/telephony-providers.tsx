import { Settings, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const providers = [
  {
    id: "twilio",
    name: "Twilio",
    description: "Industry-leading cloud communications platform",
    connected: true,
    logo: "https://www.twilio.com/favicon.ico",
  },
  {
    id: "vonage",
    name: "Vonage",
    description: "Global communications platform with APIs",
    connected: false,
    logo: "https://www.vonage.com/favicon.ico",
  },
  {
    id: "bandwidth",
    name: "Bandwidth",
    description: "Enterprise-grade voice and messaging APIs",
    connected: false,
    logo: "https://www.bandwidth.com/favicon.ico",
  },
];

export default function TelephonyProviders() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Provider Settings</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Manage your telephony provider integrations and settings
          </p>
        </div>

        {/* Connected Provider */}
        <Card>
          <CardHeader>
            <CardTitle>Active Provider</CardTitle>
            <CardDescription>
              Your currently connected telephony provider
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {providers
              .filter((p) => p.connected)
              .map((provider) => (
                <div key={provider.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                      <Settings className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{provider.name}</h3>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <Check className="mr-1 h-3 w-3" />
                          Connected
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{provider.description}</p>
                    </div>
                  </div>
                  <Button variant="outline" data-testid="button-configure">
                    Configure
                  </Button>
                </div>
              ))}

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="account-sid">Account SID</Label>
                <Input
                  id="account-sid"
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  data-testid="input-account-sid"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-token">Auth Token</Label>
                <Input
                  id="auth-token"
                  type="password"
                  placeholder="••••••••••••••••••••••••••••••••"
                  data-testid="input-auth-token"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone-number">Phone Number</Label>
                <Input
                  id="phone-number"
                  placeholder="+1 (555) 123-4567"
                  data-testid="input-phone-number"
                />
              </div>

              <Button className="w-full" data-testid="button-save-settings">
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Available Providers */}
        <Card>
          <CardHeader>
            <CardTitle>Available Providers</CardTitle>
            <CardDescription>
              Connect additional telephony providers to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {providers
                .filter((p) => !p.connected)
                .map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover-elevate"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                        <Settings className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{provider.name}</h3>
                        <p className="text-sm text-muted-foreground">{provider.description}</p>
                      </div>
                    </div>
                    <Button variant="outline" data-testid={`button-connect-${provider.id}`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Connect
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
