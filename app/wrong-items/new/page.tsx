import { WrongItemForm } from "@/components/WrongItemForm";
import { Card, SectionHead } from "@/components/ui/Card";

export default function NewWrongItemPage() {
  return (
    <div className="space-y-4">
      <SectionHead title="录入错题" />
      <Card>
        <WrongItemForm />
      </Card>
    </div>
  );
}
