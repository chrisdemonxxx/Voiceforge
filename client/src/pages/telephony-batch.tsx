import { useState } from "react";
import { PhoneForwarded, Upload, Play, Pause, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const mockCampaigns = [
  {
    id: "1",
    name: "Customer Feedback Survey",
    total: 500,
    completed: 342,
    status: "running",
  },
  {
    id: "2",
    name: "Appointment Reminders",
    total: 250,
    completed: 250,
    status: "completed",
  },
  {
    id: "3",
    name: "Product Launch Announcement",
    total: 1000,
    completed: 0,
    status: "scheduled",
  },
];

export default function TelephonyBatch() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <PhoneForwarded className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Batch Calling</h1>
            </div>
            <p className="text-muted-foreground mt-2">
              Manage bulk calling campaigns and outbound dialing
            </p>
          </div>
          <Button data-testid="button-create-campaign">
            <Upload className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
              <p className="text-xs text-muted-foreground mt-1">
                342 of 500 calls completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls Today</CardTitle>
              <PhoneForwarded className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">342</div>
              <p className="text-xs text-muted-foreground mt-1">
                +23% from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87.5%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Above target
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Campaigns</h2>
          {mockCampaigns.map((campaign) => (
            <Card key={campaign.id} className="hover-elevate" data-testid={`card-campaign-${campaign.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl">{campaign.name}</CardTitle>
                      <Badge
                        variant="secondary"
                        className={
                          campaign.status === "running"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : campaign.status === "completed"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                    <CardDescription className="mt-2">
                      {campaign.completed} of {campaign.total} calls completed
                    </CardDescription>
                  </div>
                  {campaign.status === "running" && (
                    <Button variant="outline" size="sm" data-testid={`button-pause-${campaign.id}`}>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </Button>
                  )}
                  {campaign.status === "scheduled" && (
                    <Button size="sm" data-testid={`button-start-${campaign.id}`}>
                      <Play className="mr-2 h-4 w-4" />
                      Start
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {Math.round((campaign.completed / campaign.total) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={(campaign.completed / campaign.total) * 100}
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
