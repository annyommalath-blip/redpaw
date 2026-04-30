import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Loader2, Store, Phone, IdCard, MapPin, FileCheck, Check, AlertCircle } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSellerProfile } from "@/hooks/useSellerProfile";
import { processImageFile } from "@/lib/imageUtils";
import { toast } from "sonner";

type Step = "store" | "phone" | "identity" | "address" | "policy" | "submitted";

export default function SellerOnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sellerProfile, loading, refresh } = useSellerProfile();
  const logoRef = useRef<HTMLInputElement>(null);
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("store");

  // Store
  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [logoBlob, setLogoBlob] = useState<Blob | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Phone
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  // Identity
  const [legalFirst, setLegalFirst] = useState("");
  const [legalLast, setLegalLast] = useState("");
  const [dob, setDob] = useState("");
  const [idType, setIdType] = useState("driver_license");
  const [idLast4, setIdLast4] = useState("");
  const [idFrontFile, setIdFrontFile] = useState<Blob | null>(null);
  const [idBackFile, setIdBackFile] = useState<Blob | null>(null);
  const [selfieFile, setSelfieFile] = useState<Blob | null>(null);

  // Address
  const [addr1, setAddr1] = useState("");
  const [addr2, setAddr2] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [postal, setPostal] = useState("");
  const [country, setCountry] = useState("US");
  const [businessType, setBusinessType] = useState<"individual" | "business">("individual");
  const [businessName, setBusinessName] = useState("");
  const [taxId, setTaxId] = useState("");

  // Policy
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Hydrate from existing profile
  useEffect(() => {
    if (!sellerProfile) return;
    setStoreName(sellerProfile.store_name || "");
    setStoreDescription(sellerProfile.store_description || "");
    setContactInfo(sellerProfile.contact_info || "");
    setLogoPreview(sellerProfile.store_logo_url);
    if (sellerProfile.phone_e164) {
      setPhone(sellerProfile.phone_e164);
      setPhoneVerified(!!sellerProfile.phone_verified_at);
    }
    setLegalFirst(sellerProfile.legal_first_name || "");
    setLegalLast(sellerProfile.legal_last_name || "");
    setDob(sellerProfile.date_of_birth || "");
    setIdType(sellerProfile.id_type || "driver_license");
    setIdLast4(sellerProfile.id_number_last4 || "");
    setAddr1(sellerProfile.address_line1 || "");
    setAddr2(sellerProfile.address_line2 || "");
    setCity(sellerProfile.address_city || "");
    setStateRegion(sellerProfile.address_state || "");
    setPostal(sellerProfile.address_postal_code || "");
    setCountry(sellerProfile.address_country || "US");
    setBusinessType(sellerProfile.business_type || "individual");
    setBusinessName(sellerProfile.business_name || "");
    setTaxId(sellerProfile.tax_id || "");
    if (sellerProfile.seller_status === "pending_verification") setStep("submitted");
  }, [sellerProfile]);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>, setter: (b: Blob) => void, preview?: (url: string) => void) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const blob = await processImageFile(f, {});
      setter(blob);
      if (preview) preview(URL.createObjectURL(blob));
    } catch {
      toast.error("Could not process image");
    }
  };

  const sendOtp = async () => {
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      toast.error("Enter phone in E.164 format e.g. +14155551234");
      return;
    }
    setSendingOtp(true);
    setDevCode(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-phone-otp", { body: { phone } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOtpSent(true);
      if (data?.mode === "dev" && data?.devCode) {
        setDevCode(data.devCode);
        toast.info(`Dev mode: code is ${data.devCode}`);
      } else {
        toast.success("Code sent");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send code");
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otpCode)) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setVerifyingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-phone-otp", { body: { phone, code: otpCode } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPhoneVerified(true);
      toast.success("Phone verified!");
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const uploadDoc = async (kind: "id_front" | "id_back" | "selfie", blob: Blob, profileId: string) => {
    const path = `${user!.id}/${kind}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("seller-documents").upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (error) throw error;
    await supabase.from("seller_verification_documents").upsert({
      seller_profile_id: profileId,
      user_id: user!.id,
      kind,
      storage_path: path,
    }, { onConflict: "seller_profile_id,kind" });
  };

  const submit = async () => {
    if (!user) return;
    if (!storeName.trim()) return toast.error("Store name required");
    if (!phoneVerified) return toast.error("Verify your phone first");
    if (!legalFirst || !legalLast || !dob) return toast.error("Complete identity info");
    if (!idFrontFile && !sellerProfile?.identity_status) return toast.error("Upload ID front");
    if (!selfieFile && !sellerProfile?.identity_status) return toast.error("Upload a selfie");
    if (!addr1 || !city || !postal || !country) return toast.error("Complete your address");
    if (!policyAccepted) return toast.error("Accept seller policy to continue");

    setSubmitting(true);
    try {
      // Upload logo if changed
      let logoUrl = sellerProfile?.store_logo_url || null;
      if (logoBlob) {
        const lp = `${user.id}/${Date.now()}.jpg`;
        const { error: lerr } = await supabase.storage.from("store-logos").upload(lp, logoBlob, { contentType: "image/jpeg", upsert: true });
        if (lerr) throw lerr;
        logoUrl = supabase.storage.from("store-logos").getPublicUrl(lp).data.publicUrl;
      }

      const payload: any = {
        store_name: storeName.trim(),
        store_description: storeDescription.trim() || null,
        store_logo_url: logoUrl,
        contact_info: contactInfo.trim() || null,
        legal_first_name: legalFirst.trim(),
        legal_last_name: legalLast.trim(),
        date_of_birth: dob,
        id_type: idType,
        id_number_last4: idLast4.slice(-4) || null,
        address_line1: addr1.trim(),
        address_line2: addr2.trim() || null,
        address_city: city.trim(),
        address_state: stateRegion.trim() || null,
        address_postal_code: postal.trim(),
        address_country: country.trim(),
        business_type: businessType,
        business_name: businessType === "business" ? businessName.trim() : null,
        tax_id: taxId.trim() || null,
        policy_accepted_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        seller_status: "pending_verification",
        identity_status: "pending",
        status: "pending",
      };

      const { data: updated, error } = await supabase
        .from("seller_profiles")
        .update(payload)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;

      const profileId = updated?.id;
      if (profileId) {
        if (idFrontFile) await uploadDoc("id_front", idFrontFile, profileId);
        if (idBackFile) await uploadDoc("id_back", idBackFile, profileId);
        if (selfieFile) await uploadDoc("selfie", selfieFile, profileId);
      }

      await refresh();
      setStep("submitted");
      toast.success("Application submitted for review");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <PageHeader title="Open your store" showBack />
        <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </MobileLayout>
    );
  }

  // Already approved
  if (sellerProfile?.seller_status === "approved") {
    return (
      <MobileLayout>
        <PageHeader title="Your store" showBack />
        <div className="p-4 space-y-4">
          <Card className="p-6 text-center space-y-3">
            <Check className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-xl font-semibold">You're an approved seller</h2>
            <p className="text-sm text-muted-foreground">Manage your products from the seller dashboard.</p>
            <Button onClick={() => navigate("/seller")} className="w-full">Go to dashboard</Button>
          </Card>
        </div>
      </MobileLayout>
    );
  }

  // Submitted state
  if (step === "submitted" || sellerProfile?.seller_status === "pending_verification") {
    return (
      <MobileLayout>
        <PageHeader title="Application submitted" showBack />
        <div className="p-4 space-y-4">
          <Card className="p-6 text-center space-y-3">
            <FileCheck className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-xl font-semibold">Under review</h2>
            <p className="text-sm text-muted-foreground">We'll notify you once your seller application has been reviewed. This usually takes 1–2 business days.</p>
            <Badge variant="secondary">Pending verification</Badge>
            <Button variant="outline" onClick={() => navigate("/profile")} className="w-full">Back to profile</Button>
          </Card>
        </div>
      </MobileLayout>
    );
  }

  // Rejected — allow resubmission
  const wasRejected = sellerProfile?.seller_status === "rejected";

  const STEPS: { id: Step; label: string; icon: any }[] = [
    { id: "store", label: "Store", icon: Store },
    { id: "phone", label: "Phone", icon: Phone },
    { id: "identity", label: "Identity", icon: IdCard },
    { id: "address", label: "Address", icon: MapPin },
    { id: "policy", label: "Review", icon: FileCheck },
  ];
  const currentIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <MobileLayout>
      <PageHeader title={wasRejected ? "Resubmit application" : "Become a seller"} subtitle="Verified sellers earn buyer trust" showBack />
      <div className="p-4 space-y-4 pb-24">
        {wasRejected && sellerProfile?.rejection_reason && (
          <Card className="p-3 border-destructive/30 bg-destructive/5 flex gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm"><b>Previous rejection:</b> {sellerProfile.rejection_reason}</div>
          </Card>
        )}

        {/* Stepper */}
        <div className="flex items-center justify-between gap-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === currentIdx;
            const done = i < currentIdx;
            return (
              <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-[10px] ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* STORE */}
        {step === "store" && (
          <Card className="p-4 space-y-4">
            <div className="flex flex-col items-center gap-2">
              <button onClick={() => logoRef.current?.click()} className="relative h-24 w-24 rounded-full bg-muted overflow-hidden flex items-center justify-center border-2 border-dashed border-border">
                {logoPreview ? <img src={logoPreview} alt="" className="w-full h-full object-cover" /> : <Store className="h-8 w-8 text-muted-foreground" />}
                <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5"><Camera className="h-3 w-3" /></div>
              </button>
              <input ref={logoRef} type="file" accept="image/*" onChange={(e) => handleImage(e, setLogoBlob, setLogoPreview)} className="hidden" />
              <p className="text-xs text-muted-foreground">Store logo (optional)</p>
            </div>
            <div><Label>Store name *</Label><Input value={storeName} onChange={(e) => setStoreName(e.target.value)} maxLength={60} /></div>
            <div><Label>Store description</Label><Textarea value={storeDescription} onChange={(e) => setStoreDescription(e.target.value)} rows={3} maxLength={500} /></div>
            <div><Label>Contact info</Label><Input value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} maxLength={200} placeholder="Email, social, website" /></div>
            <Button onClick={() => storeName.trim() ? setStep("phone") : toast.error("Store name required")} className="w-full">Continue</Button>
          </Card>
        )}

        {/* PHONE */}
        {step === "phone" && (
          <Card className="p-4 space-y-4">
            <div>
              <Label>Phone number (E.164 format) *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+14155551234" disabled={phoneVerified} />
              <p className="text-xs text-muted-foreground mt-1">Include country code, e.g. +1 for US</p>
            </div>
            {!phoneVerified && (
              <>
                <Button onClick={sendOtp} disabled={sendingOtp || !phone} variant="outline" className="w-full">
                  {sendingOtp && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {otpSent ? "Resend code" : "Send verification code"}
                </Button>
                {devCode && (
                  <div className="text-xs p-2 bg-muted rounded">Dev mode code: <b>{devCode}</b></div>
                )}
                {otpSent && (
                  <>
                    <div><Label>6-digit code</Label><Input value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" /></div>
                    <Button onClick={verifyOtp} disabled={verifyingOtp || otpCode.length !== 6} className="w-full">
                      {verifyingOtp && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Verify code
                    </Button>
                  </>
                )}
              </>
            )}
            {phoneVerified && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded text-sm">
                <Check className="h-4 w-4 text-primary" /> Phone verified
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("store")} className="flex-1">Back</Button>
              <Button onClick={() => phoneVerified ? setStep("identity") : toast.error("Verify phone first")} className="flex-1">Continue</Button>
            </div>
          </Card>
        )}

        {/* IDENTITY */}
        {step === "identity" && (
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Legal first name *</Label><Input value={legalFirst} onChange={(e) => setLegalFirst(e.target.value)} /></div>
              <div><Label>Legal last name *</Label><Input value={legalLast} onChange={(e) => setLegalLast(e.target.value)} /></div>
            </div>
            <div><Label>Date of birth *</Label><Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></div>
            <div>
              <Label>Government ID type *</Label>
              <Select value={idType} onValueChange={setIdType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="driver_license">Driver's License</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="state_id">State ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Last 4 digits of ID</Label><Input value={idLast4} onChange={(e) => setIdLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} maxLength={4} /></div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <button onClick={() => idFrontRef.current?.click()} className="w-full aspect-square rounded-lg bg-muted border-2 border-dashed border-border flex items-center justify-center text-xs text-center p-2">
                  {idFrontFile ? <Check className="h-5 w-5 text-primary" /> : "ID Front"}
                </button>
                <input ref={idFrontRef} type="file" accept="image/*" onChange={(e) => handleImage(e, setIdFrontFile)} className="hidden" />
              </div>
              <div>
                <button onClick={() => idBackRef.current?.click()} className="w-full aspect-square rounded-lg bg-muted border-2 border-dashed border-border flex items-center justify-center text-xs text-center p-2">
                  {idBackFile ? <Check className="h-5 w-5 text-primary" /> : "ID Back"}
                </button>
                <input ref={idBackRef} type="file" accept="image/*" onChange={(e) => handleImage(e, setIdBackFile)} className="hidden" />
              </div>
              <div>
                <button onClick={() => selfieRef.current?.click()} className="w-full aspect-square rounded-lg bg-muted border-2 border-dashed border-border flex items-center justify-center text-xs text-center p-2">
                  {selfieFile ? <Check className="h-5 w-5 text-primary" /> : "Selfie"}
                </button>
                <input ref={selfieRef} type="file" accept="image/*" capture="user" onChange={(e) => handleImage(e, setSelfieFile)} className="hidden" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Documents are stored privately and only reviewed by admins.</p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("phone")} className="flex-1">Back</Button>
              <Button onClick={() => setStep("address")} className="flex-1">Continue</Button>
            </div>
          </Card>
        )}

        {/* ADDRESS */}
        {step === "address" && (
          <Card className="p-4 space-y-4">
            <div>
              <Label>Business type *</Label>
              <Select value={businessType} onValueChange={(v: any) => setBusinessType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="business">Registered business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {businessType === "business" && (
              <>
                <div><Label>Business name</Label><Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></div>
                <div><Label>Tax ID / EIN (optional)</Label><Input value={taxId} onChange={(e) => setTaxId(e.target.value)} /></div>
              </>
            )}
            <div><Label>Address line 1 *</Label><Input value={addr1} onChange={(e) => setAddr1(e.target.value)} /></div>
            <div><Label>Address line 2</Label><Input value={addr2} onChange={(e) => setAddr2(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>City *</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
              <div><Label>State / Region</Label><Input value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>ZIP / Postal *</Label><Input value={postal} onChange={(e) => setPostal(e.target.value)} /></div>
              <div><Label>Country *</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="US" /></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("identity")} className="flex-1">Back</Button>
              <Button onClick={() => setStep("policy")} className="flex-1">Continue</Button>
            </div>
          </Card>
        )}

        {/* POLICY */}
        {step === "policy" && (
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold">Seller policy</h3>
            <div className="text-sm text-muted-foreground space-y-2 max-h-64 overflow-y-auto p-3 bg-muted rounded">
              <p>By submitting this application you agree:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>You will sell only legal, pet-related products that comply with local laws.</li>
                <li>The information you provided is accurate and verifiable.</li>
                <li>You consent to identity verification, including document review.</li>
                <li>Fraudulent activity, fake listings, or scams will result in permanent account suspension.</li>
                <li>RedPaw may suspend your seller status at any time for violations.</li>
                <li>You're responsible for shipping, returns, taxes, and customer service.</li>
              </ul>
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox checked={policyAccepted} onCheckedChange={(c) => setPolicyAccepted(!!c)} className="mt-0.5" />
              <span className="text-sm">I have read and agree to the seller policy</span>
            </label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("address")} className="flex-1">Back</Button>
              <Button onClick={submit} disabled={submitting || !policyAccepted} className="flex-1">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit for review
              </Button>
            </div>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}
