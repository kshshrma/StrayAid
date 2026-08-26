import { useState, useEffect, useRef } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { MessageSquare, Users, PhoneCall, ShieldAlert, X, Send, ArrowLeft } from "lucide-react";

interface ConnectionChannel {
  id: string;
  name: string;
  description: string;
  members: number;
  type: "group" | "helpline";
  icon: any;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  time: string;
  isMe: boolean;
}

export default function Connect() {
  const [activeTab, setActiveTab] = useState<"groups" | "helplines">("groups");
  const [selectedChannel, setSelectedChannel] = useState<ConnectionChannel | null>(null);
  
  // Chat Room States
  const [chatHistories, setChatHistories] = useState<Record<string, Message[]>>({
    "1": [
      { id: "1", sender: "Amit Verma", content: "Hi team, anyone available near Sector 62 for a quick dog check?", time: "10 min ago", isMe: false },
      { id: "2", sender: "Rohan Das", content: "I am near Sector 50, but don't have a vehicle right now.", time: "7 min ago", isMe: false },
    ],
    "2": [
      { id: "1", sender: "Sneha Sharma", content: "What should I do if a cat is bleeding from a minor tail scratch?", time: "15 min ago", isMe: false },
      { id: "2", sender: "Dr. Sharma (Vet)", content: "Clean the wound with clean water or saline, apply betadine, and keep it dry. Monitor for any infection.", time: "12 min ago", isMe: false },
    ],
    "3": [
      { id: "1", sender: "NGO Admin", content: "We have a rescue case from Sector 62. Need a shelter coordinate.", time: "20 min ago", isMe: false },
      { id: "2", sender: "Paws Shelter", content: "Our Noida shelter has 1 open crate. Send details.", time: "18 min ago", isMe: false },
    ],
  });

  const [messageText, setMessageText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistories, isTyping, selectedChannel]);

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

  const simulatedReplies: Record<string, { sender: string; messages: string[] }> = {
    "1": {
      sender: "Kriti Sen",
      messages: [
        "I'm heading towards Sector 62 in 10 minutes. Will check!",
        "Is the animal secured or roaming?",
        "Let me know if we need the ambulance, I can ping the team.",
        "Great! I'm nearby. I have some food crates.",
      ],
    },
    "2": {
      sender: "Dr. K. Patel (Vet)",
      messages: [
        "Avoid giving any human pain relievers (like paracetamol) as they are highly toxic to cats and dogs.",
        "Keep the animal calm and in a quiet space to prevent shock.",
        "Is the animal showing signs of breathing difficulties?",
        "Make sure to wash your hands before and after cleaning the wound.",
      ],
    },
    "3": {
      sender: "Happy Tails NGO",
      messages: [
        "Our transport van is currently on another run, but should be free by 2 PM.",
        "Is the case updated in the database? Let's check status.",
        "I'll dispatch a local volunteer to assist with the paperwork.",
        "Shelter 2 has space for small animals only today.",
      ],
    },
  };

  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || !selectedChannel) return;

    const channelId = selectedChannel.id;
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "You",
      content: messageText,
      time: "Just now",
      isMe: true,
    };

    // Update history with User message
    setChatHistories(prev => ({
      ...prev,
      [channelId]: [...(prev[channelId] || []), userMsg],
    }));
    setMessageText("");

    // Trigger mock response simulation
    const repliesConfig = simulatedReplies[channelId];
    if (repliesConfig) {
      // Step 1: Start typing after 800ms
      setTimeout(() => {
        setIsTyping(true);
        setTypingUser(repliesConfig.sender);
      }, 700);

      // Step 2: Deliver reply after 2000ms total
      setTimeout(() => {
        const pool = repliesConfig.messages;
        const randomReply = pool[Math.floor(Math.random() * pool.length)];
        const systemMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: repliesConfig.sender,
          content: randomReply,
          time: "Just now",
          isMe: false,
        };

        setChatHistories(prev => ({
          ...prev,
          [channelId]: [...(prev[channelId] || []), systemMsg],
        }));
        setIsTyping(false);
      }, 2000);
    }
  }

  const filtered = channels.filter(c => c.type === (activeTab === "groups" ? "group" : "helpline"));

  return (
    <div className="min-h-screen bg-slate-50 p-5 pb-28 relative overflow-hidden">
      <h1 className="mb-6 text-center text-4xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2">
        🤝 Connect
      </h1>

      <div className="max-w-md mx-auto mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab("groups")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            activeTab === "groups"
              ? "bg-green-600 border-green-600 text-white shadow-md"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          💬 Chat Groups
        </button>
        <button
          onClick={() => setActiveTab("helplines")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
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
                    <Button 
                      onClick={() => setSelectedChannel(channel)}
                      className="py-1 px-3 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer"
                    >
                      Join Chat
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-green-700">
                      Available 24/7
                    </span>
                    <a href={`tel:${channel.members}`}>
                      <Button className="py-1 px-3 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-1.5 font-bold cursor-pointer">
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

      {/* CHAT DRAWER PANEL */}
      {selectedChannel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl animate-slideLeft">
            
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
              <button
                onClick={() => setSelectedChannel(null)}
                className="p-1.5 hover:bg-slate-200 rounded-xl transition text-slate-600"
              >
                <ArrowLeft size={18} />
              </button>
              
              <div className="w-9 h-9 rounded-xl bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                <selectedChannel.icon size={18} />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {selectedChannel.name}
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold truncate">
                  👥 {selectedChannel.members} members online
                </p>
              </div>

              <button
                onClick={() => setSelectedChannel(null)}
                className="p-1.5 hover:bg-slate-200 rounded-xl transition text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Body (Scrollable messages) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              <p className="text-[10px] text-center text-slate-400 bg-slate-100 px-3 py-1 rounded-full w-max mx-auto font-bold uppercase tracking-wider">
                🛡️ StrayAid Coordination Channel
              </p>

              {(chatHistories[selectedChannel.id] || []).map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[80%] ${
                    msg.isMe ? "ml-auto items-end" : "mr-auto items-start"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 px-1 mb-0.5">
                    <span>{msg.sender}</span>
                    <span>•</span>
                    <span>{msg.time}</span>
                  </div>
                  
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-xs font-semibold leading-relaxed ${
                      msg.isMe
                        ? "bg-green-600 text-white rounded-tr-none shadow-sm shadow-green-100"
                        : "bg-white border border-slate-100 text-slate-800 rounded-tl-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex flex-col mr-auto items-start max-w-[80%] animate-pulse">
                  <span className="text-[9px] font-bold text-slate-400 px-1 mb-0.5">
                    {typingUser} is typing...
                  </span>
                  <div className="bg-white border border-slate-100 text-slate-400 rounded-2xl rounded-tl-none px-3.5 py-2 text-xs flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}

              <div ref={messageEndRef} />
            </div>

            {/* Chat Footer Input */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white flex gap-2">
              <input
                type="text"
                placeholder="Type a coordinator message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                disabled={!messageText.trim()}
                className="p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}

