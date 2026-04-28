"use client";

import { DownloadIcon } from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";

export function SummaryPdfDialog({
  open,
  onOpenChange,
  summaryText,
  isSummarizing,
  isExportingPdf,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summaryText: string;
  isSummarizing: boolean;
  isExportingPdf: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] gap-0 p-0 border-border/60 bg-background/95 backdrop-blur shadow-2xl">
        <DialogHeader className="p-4 border-b border-border/40 bg-muted/20">
          <DialogTitle className="flex items-center gap-2">
            <DownloadIcon className="size-4 text-primary" />
            Generating PDF Summary...
          </DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <ScrollArea className="h-[300px] w-full rounded-md border border-border/40 bg-card/30 p-4">
            <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed max-w-none">
              {summaryText ? (
                <MessageResponse>{summaryText}</MessageResponse>
              ) : (
                <p className="text-muted-foreground italic">
                  Analyzing conversation history...
                </p>
              )}
              {isSummarizing && (
                <div className="mt-2 flex items-center gap-2 text-muted-foreground text-xs">
                  <Spinner /> Drafting markdown...
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        {isExportingPdf && (
          <div className="p-4 border-t border-border/40 bg-muted/20 flex items-center justify-center gap-2 text-sm font-medium text-primary">
            <Spinner /> Converting to Light-Mode PDF...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
