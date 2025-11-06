import { useState } from "react";
import { PhoneCall, Phone, PhoneOff, Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function TelephonyDialer() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const handleDial = () => {
    if (!phoneNumber.trim()) return;
    setIsCallActive(true);
  };

  const handleHangup = () => {
    setIsCallActive(false);
    setPhoneNumber("");
    setIsMuted(false);
  };

  const handleNumberClick = (digit: string) => {
    setPhoneNumber(phoneNumber + digit);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <PhoneCall className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Web Dialer</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Make outbound calls using your voice agent
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dialer</CardTitle>
            <CardDescription>
              Enter a phone number and start your call
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Phone Number Display */}
            <div className="text-center">
              <Input
                type="tel"
                placeholder="Enter phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="text-2xl text-center h-16 font-mono"
                data-testid="input-phone-number"
                disabled={isCallActive}
              />
            </div>

            {/* Call Status */}
            {isCallActive && (
              <div className="text-center p-4 bg-green-100 dark:bg-green-900 rounded-lg">
                <Badge variant="secondary" className="bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200 mb-2">
                  Call Active
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Connected to {phoneNumber}
                </p>
              </div>
            )}

            {/* Dialpad */}
            {!isCallActive && (
              <div className="grid grid-cols-3 gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((digit) => (
                  <Button
                    key={digit}
                    variant="outline"
                    className="h-16 text-xl font-mono hover-elevate"
                    onClick={() => handleNumberClick(digit)}
                    data-testid={`button-digit-${digit}`}
                  >
                    {digit}
                  </Button>
                ))}
              </div>
            )}

            {/* Call Controls */}
            <div className="flex justify-center gap-4">
              {!isCallActive ? (
                <Button
                  size="lg"
                  onClick={handleDial}
                  disabled={!phoneNumber.trim()}
                  className="rounded-full h-16 w-16"
                  data-testid="button-call"
                >
                  <Phone className="h-6 w-6" />
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    variant={isMuted ? "default" : "outline"}
                    onClick={() => setIsMuted(!isMuted)}
                    className="rounded-full h-14 w-14"
                    data-testid="button-mute"
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full h-14 w-14"
                    data-testid="button-speaker"
                  >
                    <Volume2 className="h-5 w-5" />
                  </Button>

                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={handleHangup}
                    className="rounded-full h-16 w-16"
                    data-testid="button-hangup"
                  >
                    <PhoneOff className="h-6 w-6" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
