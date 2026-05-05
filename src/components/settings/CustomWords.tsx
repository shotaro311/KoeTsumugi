import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { CustomDictionaryEntry } from "@/bindings";
import { useSettings } from "../../hooks/useSettings";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { SettingContainer } from "../ui/SettingContainer";
import { Textarea } from "../ui/Textarea";

interface CustomWordsProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

const sanitizeText = (value: string) => value.trim().replace(/[<>"'&]/g, "");

const splitAliases = (value: string) =>
  value
    .split(/[\n,、]+/)
    .map((alias) => sanitizeText(alias))
    .filter(Boolean);

const normalizeKey = (value: string) => sanitizeText(value).toLowerCase();

export const CustomWords: React.FC<CustomWordsProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();
    const customWords = (getSetting("custom_words") ||
      []) as CustomDictionaryEntry[];

    const [output, setOutput] = useState("");
    const [aliasesText, setAliasesText] = useState("");
    const [useInModelPrompt, setUseInModelPrompt] = useState(true);
    const [useInPostProcess, setUseInPostProcess] = useState(true);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const formRef = useRef<HTMLDivElement | null>(null);
    const outputInputRef = useRef<HTMLInputElement | null>(null);

    const sanitizedOutput = sanitizeText(output);
    const parsedAliases = useMemo(
      () =>
        Array.from(
          new Set(
            splitAliases(aliasesText).filter(
              (alias) => normalizeKey(alias) !== normalizeKey(sanitizedOutput),
            ),
          ),
        ),
      [aliasesText, sanitizedOutput],
    );

    const isDuplicate = customWords.some(
      (entry, index) =>
        index !== editingIndex &&
        normalizeKey(entry.output) === normalizeKey(sanitizedOutput),
    );

    const resetForm = () => {
      setOutput("");
      setAliasesText("");
      setUseInModelPrompt(true);
      setUseInPostProcess(true);
      setEditingIndex(null);
    };

    useEffect(() => {
      if (editingIndex === null) {
        return;
      }

      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      outputInputRef.current?.focus();
      outputInputRef.current?.select();
    }, [editingIndex]);

    const handleSubmit = () => {
      if (!sanitizedOutput) {
        return;
      }

      if (!useInModelPrompt && !useInPostProcess) {
        toast.error(t("settings.advanced.customWords.selectUsage"));
        return;
      }

      if (isDuplicate) {
        toast.error(
          t("settings.advanced.customWords.duplicate", {
            word: sanitizedOutput,
          }),
        );
        return;
      }

      const nextEntry: CustomDictionaryEntry = {
        output: sanitizedOutput,
        aliases: parsedAliases,
        use_in_model_prompt: useInModelPrompt,
        use_in_post_process: useInPostProcess,
      };

      const nextEntries =
        editingIndex === null
          ? [...customWords, nextEntry]
          : customWords.map((entry, index) =>
              index === editingIndex ? nextEntry : entry,
            );

      updateSetting("custom_words", nextEntries);
      resetForm();
    };

    const handleRemove = (indexToRemove: number) => {
      updateSetting(
        "custom_words",
        customWords.filter((_, index) => index !== indexToRemove),
      );

      if (editingIndex === indexToRemove) {
        resetForm();
      }
    };

    const handleEdit = (entry: CustomDictionaryEntry, index: number) => {
      setOutput(entry.output);
      setAliasesText(entry.aliases.join(", "));
      setUseInModelPrompt(entry.use_in_model_prompt);
      setUseInPostProcess(entry.use_in_post_process);
      setEditingIndex(index);
    };

    const handleKeyPress = (
      e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };

    return (
      <>
        <SettingContainer
          title={t("settings.advanced.customWords.title")}
          description={t("settings.advanced.customWords.description")}
          descriptionMode={descriptionMode}
          grouped={grouped}
        >
          <div ref={formRef} className="flex flex-col gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text/70">
                  {t("settings.advanced.customWords.outputLabel")}
                </span>
                <Input
                  ref={outputInputRef}
                  type="text"
                  value={output}
                  onChange={(e) => setOutput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={t(
                    "settings.advanced.customWords.outputPlaceholder",
                  )}
                  variant="compact"
                  disabled={isUpdating("custom_words")}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text/70">
                  {t("settings.advanced.customWords.aliasesLabel")}
                </span>
                <Textarea
                  value={aliasesText}
                  onChange={(e) => setAliasesText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={t(
                    "settings.advanced.customWords.aliasesPlaceholder",
                  )}
                  variant="compact"
                  className="min-h-[72px]"
                  disabled={isUpdating("custom_words")}
                />
              </label>
            </div>

            <p className="text-xs text-text/60">
              {t("settings.advanced.customWords.aliasesHint")}
            </p>

            <div className="flex flex-wrap gap-3 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useInModelPrompt}
                  onChange={(e) => setUseInModelPrompt(e.target.checked)}
                  disabled={isUpdating("custom_words")}
                />
                <span>
                  {t("settings.advanced.customWords.useInModelPrompt")}
                </span>
              </label>

              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useInPostProcess}
                  onChange={(e) => setUseInPostProcess(e.target.checked)}
                  disabled={isUpdating("custom_words")}
                />
                <span>
                  {t("settings.advanced.customWords.useInPostProcess")}
                </span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleSubmit}
                disabled={
                  !sanitizedOutput ||
                  (!useInModelPrompt && !useInPostProcess) ||
                  isUpdating("custom_words")
                }
                variant="primary"
                size="md"
              >
                {editingIndex === null
                  ? t("settings.advanced.customWords.add")
                  : t("settings.advanced.customWords.save")}
              </Button>

              {editingIndex !== null && (
                <Button
                  onClick={resetForm}
                  disabled={isUpdating("custom_words")}
                  variant="secondary"
                  size="md"
                >
                  {t("settings.advanced.customWords.cancelEdit")}
                </Button>
              )}
            </div>
          </div>
        </SettingContainer>

        {customWords.length > 0 && (
          <div
            className={`px-4 p-3 ${grouped ? "" : "rounded-lg border border-mid-gray/20"} flex flex-col gap-2`}
          >
            {customWords.map((entry, index) => (
              <div
                key={`${entry.output}-${index}`}
                className={`flex flex-col gap-2 rounded-lg border px-3 py-2 md:flex-row md:items-start md:justify-between ${
                  editingIndex === index
                    ? "border-logo-primary bg-logo-primary/10"
                    : "border-mid-gray/20 bg-mid-gray/5"
                }`}
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{entry.output}</span>
                    {entry.use_in_model_prompt && (
                      <span className="rounded-full bg-logo-primary/15 px-2 py-0.5 text-xs text-text/80">
                        {t("settings.advanced.customWords.modelPromptTag")}
                      </span>
                    )}
                    {entry.use_in_post_process && (
                      <span className="rounded-full bg-mid-gray/15 px-2 py-0.5 text-xs text-text/80">
                        {t("settings.advanced.customWords.postProcessTag")}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-text/60">
                    {entry.aliases.length > 0
                      ? t("settings.advanced.customWords.aliasesValue", {
                          aliases: entry.aliases.join(", "),
                        })
                      : t("settings.advanced.customWords.noAliases")}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleEdit(entry, index)}
                    disabled={isUpdating("custom_words")}
                    variant="ghost"
                    size="sm"
                  >
                    {t("settings.advanced.customWords.edit")}
                  </Button>
                  <Button
                    onClick={() => handleRemove(index)}
                    disabled={isUpdating("custom_words")}
                    variant="danger-ghost"
                    size="sm"
                    aria-label={t("settings.advanced.customWords.remove", {
                      word: entry.output,
                    })}
                  >
                    {t("settings.advanced.customWords.removeShort")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  },
);
