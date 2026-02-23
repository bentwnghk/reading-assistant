"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, LoaderCircle, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReadingStore } from "@/store/reading";
import useReadingAssistant from "@/hooks/useReadingAssistant";

const MagicDown = dynamic(() => import("@/components/MagicDown"));

function AdaptedText() {
  const { t } = useTranslation();
  const { extractedText, adaptedText, simplifiedText, studentAge } = useReadingStore();
  const { status, adaptText, simplifyText } = useReadingAssistant();
  const [activeTab, setActiveTab] = useState<string>("original");
  
  const isAdapting = status === "adapting";
  const isSimplifying = status === "simplifying";

  if (!extractedText) {
    return null;
  }

  return (
    <section className="p-4 border rounded-md mt-4">
      <div className="border-b mb-4">
        <h3 className="font-semibold text-lg leading-10">
          {t("reading.adaptedText.title")}
        </h3>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="original" className="flex-1">
              {t("reading.adaptedText.originalTab")}
            </TabsTrigger>
            <TabsTrigger value="adapted" className="flex-1" disabled={!adaptedText}>
              {t("reading.adaptedText.adaptedTab")}
            </TabsTrigger>
            <TabsTrigger value="simplified" className="flex-1" disabled={!adaptedText}>
              {t("reading.adaptedText.simplifiedTab")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="original" className="mt-4">
            <div className="prose prose-slate dark:prose-invert max-w-full whitespace-pre-wrap">
              {extractedText}
            </div>
            {!adaptedText && (
              <div className="mt-4 pt-4 border-t flex justify-center">
                <Button
                  onClick={() => {
                    adaptText();
                    setActiveTab("adapted");
                  }}
                  disabled={isAdapting}
                  size="sm"
                >
                  {isAdapting ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      <span>{t("reading.adaptedText.adapting")}</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4" />
                      <span>{t("reading.adaptedText.adapt")} ({studentAge})</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="adapted" className="mt-4">
            {adaptedText ? (
              <>
                <div className="prose prose-slate dark:prose-invert max-w-full">
                  <MagicDown
                    value={adaptedText}
                    onChange={() => {}}
                    hideTools
                    disableMath
                  />
                </div>

                {!simplifiedText && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      onClick={() => {
                        simplifyText();
                        setActiveTab("simplified");
                      }}
                      disabled={isSimplifying}
                      variant="secondary"
                      className="w-full"
                    >
                      {isSimplifying ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          <span>{t("reading.adaptedText.simplifying")}</span>
                        </>
                      ) : (
                        <>
                          <ArrowDown className="h-4 w-4" />
                          <span>{t("reading.adaptedText.simplifyFurther")}</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("reading.adaptedText.emptyTip")}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="simplified" className="mt-4">
            {simplifiedText ? (
              <>
                <div className="prose prose-slate dark:prose-invert max-w-full">
                  <MagicDown
                    value={simplifiedText}
                    onChange={() => {}}
                    hideTools
                    disableMath
                  />
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button
                    onClick={() => simplifyText()}
                    disabled={isSimplifying}
                    variant="secondary"
                    className="w-full"
                  >
                    {isSimplifying ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        <span>{t("reading.adaptedText.simplifying")}</span>
                      </>
                    ) : (
                      <>
                        <ArrowDown className="h-4 w-4" />
                        <span>{t("reading.adaptedText.simplifyFurther")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t("reading.adaptedText.simplifiedEmptyTip")}</p>
                <Button
                  onClick={() => {
                    simplifyText();
                    setActiveTab("simplified");
                  }}
                  disabled={isSimplifying}
                  variant="secondary"
                  className="mt-4"
                >
                  {isSimplifying ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      <span>{t("reading.adaptedText.simplifying")}</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="h-4 w-4" />
                      <span>{t("reading.adaptedText.generateSimplified")}</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
    </section>
  );
}

export default AdaptedText;
