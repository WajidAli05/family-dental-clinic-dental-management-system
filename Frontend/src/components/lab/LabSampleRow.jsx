import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Play, CheckCircle, Truck } from "lucide-react";
import { useLabStore } from "@/store/labStore";
import AddNoteDialog from "@/components/lab/AddNoteDialog";

export default function LabSampleRow({ sample }) {
  const { markReady, startWork, markDelivered } = useLabStore();

  const statusBadge = {
    sent: (
      <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
        Sent
      </Badge>
    ),
    "in-process": (
      <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200">
        In Process
      </Badge>
    ),
    ready: (
      <Badge className="bg-purple-100 text-purple-800 border border-purple-200">
        Ready
      </Badge>
    ),
    delivered: (
      <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-200">
        Delivered
      </Badge>
    ),
    approved: (
      <Badge className="bg-green-100 text-green-800 border border-green-200">
        Approved
      </Badge>
    ),
    rejected: (
      <Badge className="bg-red-100 text-red-800 border border-red-200">
        Rejected
      </Badge>
    ),
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="font-medium text-gray-900">{sample.id}</td>
      <td className="text-gray-700">{sample.type}</td>
      <td className="font-mono text-gray-700">{sample.tooth}</td>
      <td className="text-gray-600">{sample.date}</td>
      <td>{statusBadge[sample.status]}</td>

      <td className="text-right space-x-2">
        <AddNoteDialog sample={sample} />

        {/* Sent → In Process */}
        {sample.status === "sent" && (
          <Button
            size="sm"
            variant="outline"
            className="text-gray-900 border-gray-300 hover:bg-gray-100"
            onClick={() => startWork(sample.id)}
          >
            <Play size={14} className="mr-1" />
            Start Work
          </Button>
        )}

        {/* In Process → Ready */}
        {sample.status === "in-process" && (
          <Button
            size="sm"
            className="bg-purple-600 text-white hover:bg-purple-700"
            onClick={() => markReady(sample.id)}
          >
            <CheckCircle size={14} className="mr-1" />
            Mark Ready
          </Button>
        )}

        {/* Ready → Delivered */}
        {sample.status === "ready" && (
          <Button
            size="sm"
            className="bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={() => markDelivered(sample.id)}
          >
            <Truck size={14} className="mr-1" />
            Mark Delivered
          </Button>
        )}

        {/* Delivered/Approved/Rejected - No actions */}
        {(sample.status === "delivered" || 
          sample.status === "approved" || 
          sample.status === "rejected") && (
          <span className="text-sm text-gray-500 italic">
            {sample.status === "delivered" ? "Awaiting approval" : "Final status"}
          </span>
        )}
      </td>
    </tr>
  );
}