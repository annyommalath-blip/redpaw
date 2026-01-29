import { useNavigate } from "react-router-dom";
import { ChevronLeft, Globe, Check, Loader2 } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, isLoading, languages } = useLanguage();

  return (
    <MobileLayout hideNav>
      <PageHeader
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
        action={
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        }
      />

      <div className="p-4 space-y-6">
        {/* Language Settings */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t("settings.language")}
          </h2>
          <Card>
            <CardContent className="p-0">
              {languages.map((lang, index) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-between p-4 hover:bg-accent transition-colors text-left ${
                    index < languages.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {lang.nativeName}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {lang.name}
                    </span>
                  </div>
                  {currentLanguage === lang.code && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                  {isLoading && currentLanguage !== lang.code && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </button>
              ))}
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground mt-2">
            {t("settings.languageSubtitle")}
          </p>
        </section>
      </div>
    </MobileLayout>
  );
}
