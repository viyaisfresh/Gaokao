import { VocabTestForm } from "@/components/VocabTestForm";
import { Card, SectionHead } from "@/components/ui/Card";

export default function NewVocabPage() {
  return (
    <div className="space-y-4">
      <SectionHead title="录入词汇检测" />
      <Card>
        <VocabTestForm />
      </Card>
    </div>
  );
}
