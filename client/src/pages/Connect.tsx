import { useState } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { MessageSquare, Users, PhoneCall, ShieldAlert } from "lucide-react";

interface ConnectionChannel {
  id: string;
  name: string;
  description: string;
  members: number;
  type: "group" | "helpline";
  icon: any;
}

export default function Connect() {
  const [activeTab, setActiveTab] = useState<"groups" | "helplines">("groups");

  const channels: ConnectionChannel[] = [
    {
      id: "1",
      name: "Greater Noida Rescuers",
      description: "Active discussion and coordination group for local Street Guardians in Greater Noida.",
      members: 42,
      type: "group",
      icon: Users,
    },
    {
      id: "2",
      name: "Veterinary First Aid Support",
      description: "Chat directly with certified veterinarians and first-aid volunteers for live advice.",
      members: 18,
      type: "group",
      icon: MessageSquare,
    },
    {
      id: "3",
      name: "NGO Coordination Hub",
      description: "Connecting local NGOs with rescuers to coordinate shelter placement and transport.",
      members: 27,
      type: "group",
      icon: ShieldAlert,
    },
    {
      id: "4",
      name: "24/7 Animal Ambulance Delhi NCR",
      description: "Emergency helpline phone connection for critical transport assistance.",
      members: 9988, // Mock phone number indicator
      type: "helpline",
      icon: PhoneCall,
    },
    {
      id: "5",
      name: "Noida Animal Shelter Helpline",
      description: "Direct contact line for shelter availability and reporting admissions.",
      members: 8877,
      type: "helpline",
      icon: PhoneCall,
    },
  ];

  const filtered = channels.filter(c => c.type === (activeTab === "groups" ? "group" : "helpline"));

  return (
    <div className="min-h-screen bg-slate-100 p-5 pb-28">
      <h1 className="mb-6 text-center text-4xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2">
        🤝 Connect
      </h1>

      <div className="max-w-md mx-auto mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab("groups")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
            activeTab === "groups"
              ? "bg-green-600 border-green-600 text-white shadow-md"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          💬 Chat Groups
        </button>
        <button
          onClick={() => setActiveTab("helplines")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
            activeTab === "helplines"
              ? "bg-green-600 border-green-600 text-white shadow-md"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          📞 Emergency Helplines
        </button>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {filtered.map(channel => {
          const IconComp = channel.icon;
          return (
            <Card key={channel.id} className="flex gap-4 items-start p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow transition-all">
              <div className="p-3 bg-green-50 text-green-700 rounded-xl">
                <IconComp size={24} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-900">{channel.name}</h2>
                <p className="text-xs text-gray-500 mt-1 mb-3">{channel.description}</p>
                {channel.type === "group" ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      👥 {channel.members} Active Rescuers
                    </span>
                    <Button className="py-1 px-3 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg">
                      Join Chat
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-green-700">
                      Available 24/7
                    </span>
                    <a href={`tel:${channel.members}`}>
                      <Button className="py-1 px-3 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-1.5 font-bold">
                        <PhoneCall size={12} /> Call Now
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
