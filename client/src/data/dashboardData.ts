import {
  Ambulance,
  MapPin,
  Users,
  Heart,
  Home,
  Map,
  User,
} from "lucide-react";

export const dashboardStats = [
  {
    title: "Active Rescues",
    value: "08",
    icon: Ambulance,
  },
  {
    title: "Nearby Reports",
    value: "15",
    icon: MapPin,
  },
  {
    title: "Guardians Online",
    value: "24",
    icon: Users,
  },
  {
    title: "Animals Helped",
    value: "127",
    icon: Heart,
  },
];

export const rescueRequests = [
  {
    id: 1,
    animal: "🐕 Dog injured near Sector 62",
    severity: "Critical",
    time: "2 min ago",
  },
  {
    id: 2,
    animal: "🐈 Kitten trapped in drain",
    severity: "High",
    time: "5 min ago",
  },
  {
    id: 3,
    animal: "🐄 Cow hit by vehicle",
    severity: "Critical",
    time: "9 min ago",
  },
];


export const navigationItems = [
  {
    id: 1,
    label: "Home",
    icon: Home,
    active: true,
  },
  {
    id: 2,
    label: "Map",
    icon: Map,
    active: false,
  },
  {
    id: 3,
    label: "Community",
    icon: Users,
    active: false,
  },
  {
    id: 4,
    label: "Profile",
    icon: User,
    active: false,
  },
];