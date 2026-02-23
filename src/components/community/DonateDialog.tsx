import { useState, useRef } from "react";
import { Loader2, Upload, Image } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

interface DonateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignTitle: string;
  onDonated?: () => void;
}

export function DonateDialog({ open, onOpenChange, campaignId, campaignTitle, onDonated }: DonateDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!user || !amount || !receiptFile) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ variant: "destructive", title: "Please enter a valid amount" });
      return;
    }

    setSubmitting(true);
    try {
      // Upload receipt
      const fileExt = receiptFile.name.split(".").pop();
      const filePath = `${user.id}/${campaignId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("donation-receipts")
        .upload(filePath, receiptFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("donation-receipts")
        .getPublicUrl(filePath);

      // Create donation record
      const { error } = await supabase.from("donation_records").insert({
        campaign_id: campaignId,
        donor_id: user.id,
        amount: amountNum,
        receipt_url: publicUrl,
        note: note.trim() || null,
      });
      if (error) throw error;

      toast({ title: "Donation recorded! ❤️", description: "Thank you for your generosity." });
      onOpenChange(false);
      setAmount("");
      setNote("");
      setReceiptFile(null);
      setReceiptPreview(null);
      onDonated?.();
    } catch (error: any) {
      toast({ variant: "destructive", title: t("common.error"), description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card-modal rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>Donate to "{campaignTitle}"</DialogTitle>
          <DialogDescription>Record your donation with a receipt photo.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Amount donated *</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g., 50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Receipt photo *</Label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            {receiptPreview ? (
              <div className="relative rounded-xl overflow-hidden border">
                <img src={receiptPreview} alt="Receipt" className="w-full h-40 object-cover" />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-2 right-2 rounded-lg"
                  onClick={() => fileRef.current?.click()}
                >
                  Change
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full h-24 border-dashed rounded-xl" onClick={() => fileRef.current?.click()}>
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Upload receipt</span>
                </div>
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Note {t("common.optional")}</Label>
            <Textarea
              placeholder="Any message for the campaign owner..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>

          <Button
            className="w-full rounded-xl"
            onClick={handleSubmit}
            disabled={submitting || !amount || !receiptFile}
          >
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Submit Donation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
