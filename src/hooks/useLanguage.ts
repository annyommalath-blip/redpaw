import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SUPPORTED_LANGUAGES, LanguageCode } from "@/i18n";

export function useLanguage() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Load language preference on mount
  useEffect(() => {
    const loadLanguagePreference = async () => {
      if (!user) return;

      try {
        // Try to get from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("preferred_language")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile?.preferred_language) {
          const langCode = profile.preferred_language as LanguageCode;
          if (SUPPORTED_LANGUAGES.some((lang) => lang.code === langCode)) {
            i18n.changeLanguage(langCode);
            localStorage.setItem("preferred_language", langCode);
          }
        }
      } catch (error) {
        console.error("Error loading language preference:", error);
      }
    };

    loadLanguagePreference();
  }, [user, i18n]);

  const changeLanguage = useCallback(
    async (langCode: LanguageCode) => {
      setIsLoading(true);
      try {
        // Update i18n
        await i18n.changeLanguage(langCode);

        // Save to localStorage
        localStorage.setItem("preferred_language", langCode);

        // Save to profile if user is logged in
        if (user) {
          await supabase
            .from("profiles")
            .update({ preferred_language: langCode })
            .eq("user_id", user.id);
        }
      } catch (error) {
        console.error("Error changing language:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [i18n, user]
  );

  return {
    currentLanguage: i18n.language as LanguageCode,
    changeLanguage,
    isLoading,
    languages: SUPPORTED_LANGUAGES,
  };
}
