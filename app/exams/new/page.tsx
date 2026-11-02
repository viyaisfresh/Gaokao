import { ExamForm } from "@/components/ExamForm";
import { Card, SectionHead } from "@/components/ui/Card";

export default function NewExamPage() {
  return (
    <div className="space-y-4">
      <SectionHead title="录入考试" />
      <Card>
        <ExamForm />
      </Card>
    </div>
  );
}
