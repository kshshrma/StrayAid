import Card from "../ui/Card";
import Button from "../ui/Button";
import RescueRequestCard from "./RescueRequestCard";
import { rescueRequests } from "../../data/dashboardData";

export default function RescueRequests() {
  return (
    <Card>
      <h2 className="text-xl font-bold">
        🚨 Immediate Rescue Requests
      </h2>

      <div className="mt-5 space-y-4">
        {rescueRequests.map((request) => (
          <RescueRequestCard
            key={request.id}
            animal={request.animal}
            severity={request.severity}
            time={request.time}
          />
        ))}
      </div>

      <Button className="mt-6 w-full">
        View All Requests
      </Button>
    </Card>
  );
}