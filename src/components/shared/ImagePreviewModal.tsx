'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Maximize2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImagePreviewModalProps {
  src: string;
  alt?: string;
  title?: string;
  trigger?: React.ReactNode;
}

export function ImagePreviewModal({ src, alt = "Preview", title = "Detail Bukti", trigger }: ImagePreviewModalProps) {
  if (!src) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = alt || 'bukti';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <div className="relative group cursor-pointer overflow-hidden rounded-lg border">
            <img 
              src={src} 
              alt={alt} 
              className="w-full h-auto object-cover max-h-[400px] transition-transform duration-300 group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Maximize2 className="w-8 h-8 text-white" />
            </div>
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[80vw] max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex justify-between items-center pr-8">
            <DialogTitle>{title}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleDownload} title="Download">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/30">
          <img 
            src={src} 
            alt={alt} 
            className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
