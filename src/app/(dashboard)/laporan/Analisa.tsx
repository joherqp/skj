'use client';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Table, ArrowLeft } from 'lucide-react';
import AnalisaVisual from '@/app/(dashboard)/laporan/components/AnalisaVisual';
import AnalisaPivot from '@/app/(dashboard)/laporan/components/AnalisaPivot';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';


export default function Analisa() {
  const router = useRouter();
  return (
    <div className="animate-in fade-in duration-500">
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => router.push('/laporan')} className="pl-0">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
          </Button>
        </div>
        <Tabs defaultValue="visual" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="visual" className="flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                Analisa Visual
            </TabsTrigger>
            <TabsTrigger value="pivot" className="flex items-center gap-2">
                <Table className="w-4 h-4" />
                Pivot Table
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="visual" className="mt-4">
            <AnalisaVisual />
          </TabsContent>
          
          <TabsContent value="pivot" className="mt-4">
            <AnalisaPivot />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
