import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Clock } from "lucide-react";

const Rapid = () => {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("60");

  return (
    <div className="min-h-screen pb-20">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-32">
        <div className="max-w-3xl mx-auto animate-fade-in">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 glass-card mb-6">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Rapid Fire Mode</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Test Your Speed
            </h1>
            <p className="text-muted-foreground text-lg">
              Answer unlimited questions against the clock
            </p>
          </div>

          <div className="glass-card space-y-6">
            {/* Topic Input */}
            <div className="space-y-2">
              <Label htmlFor="topic">Quiz Topic</Label>
              <Input
                id="topic"
                placeholder="E.g., Skeletal system, Cardiovascular anatomy..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="glass"
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Time Limit (seconds)</Label>
              <Input
                id="duration"
                type="number"
                min="30"
                max="600"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="glass"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 60-120 seconds for optimal challenge
              </p>
            </div>

            {/* Info Cards */}
            <div className="grid md:grid-cols-3 gap-4 pt-4">
              <div className="glass rounded-xl p-4 text-center">
                <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">Unlimited Questions</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">Timed Challenge</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">Instant Feedback</p>
              </div>
            </div>

            <Button className="w-full gradient-primary h-12 text-lg">
              <Zap className="h-5 w-5 mr-2" />
              Start Rapid Fire
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rapid;
