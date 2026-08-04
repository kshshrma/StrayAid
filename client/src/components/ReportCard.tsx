interface Props {
  report: any;
}

export default function ReportCard({ report }: Props) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow">

      <h2 className="text-xl font-bold">
        {report.animal_type}
      </h2>

      <p className="mt-2">
        Severity:
        <strong> {report.severity}</strong>
      </p>

      <p>
        Priority:
        <strong> {report.priority}</strong>
      </p>

      <p className="mt-3 text-gray-700">
        {report.ai_advice}
      </p>

    </div>
  );
}