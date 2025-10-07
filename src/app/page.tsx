// import Image from "next/image";

import { Button, Input } from "@/components/UI";


export default function Home() {
  return (
    <div className="flex p-4 items-center gap-3">
      <Input label="testing input" type="text" disabled={false} variant="outline" />
      <Button label="test btn" />
    </div>
  );
}
