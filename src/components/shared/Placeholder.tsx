'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface PlaceholderProps {
  title: string;
}

export default function Placeholder({ title }: PlaceholderProps) {
  const router = useRouter();

  return (
    <div className="animate-in fade-in duration-500">
      <div className="p-4 flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Construction className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Fitur Dalam Pengembangan</h2>
              <p className="text-muted-foreground">
                Halaman {title} sedang dalam tahap pengembangan dan akan segera tersedia.
              </p>
            </div>
            <Button onClick={() => router.back()} variant="outline">
              Kembali
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
