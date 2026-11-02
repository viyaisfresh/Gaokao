import { ClassicalTestForm } from "@/components/ClassicalTestForm";
import { Card, SectionHead } from "@/components/ui/Card";

export default function NewClassicalPage() {
  return (
    <div className="space-y-4">
      <SectionHead title="录入古诗文检测" />
      <Card>
        <ClassicalTestForm />
      </Card>
    </div>
  );
}
