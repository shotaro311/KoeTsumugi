import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const localesDirectory = path.resolve(
  import.meta.dirname,
  "..",
  "src",
  "i18n",
  "locales",
);

function replaceBrand(value) {
  if (typeof value === "string") {
    return value
      .replaceAll("Handy_m", "KoeTsumugi")
      .replaceAll("Handy", "KoeTsumugi");
  }
  if (Array.isArray(value)) return value.map(replaceBrand);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, replaceBrand(child)]),
    );
  }
  return value;
}

const sharedAbout = {
  derivativeStatus: {
    title: "Unofficial derivative",
    description:
      "KoeTsumugi is an independent derivative of the MIT-licensed Handy source code. It is not affiliated with, endorsed by, or supported by the Handy project or its maintainers.",
  },
  sourceCode: {
    title: "Source code and licenses",
    description:
      "The derivative source, upstream attribution, MIT license, and third-party notices are available below. The legacy repository URL is temporarily retained for update compatibility.",
    derivativeButton: "Derivative source",
    upstreamButton: "Upstream Handy",
    licenseButton: "MIT license",
    noticesButton: "Licenses and notices",
  },
};

const localizedAbout = {
  en: sharedAbout,
  ja: {
    derivativeStatus: {
      title: "非公式の派生版",
      description:
        "KoeTsumugiは、MITライセンスのHandyソースコードを基にした独立した派生版です。Handyプロジェクトや開発者との提携、承認、サポート関係はありません。",
    },
    sourceCode: {
      title: "ソースコードとライセンス",
      description:
        "派生版のソース、元プロジェクトの帰属、MITライセンス、第三者ライセンスを確認できます。更新互換性のため、リポジトリURLには当面旧名称が残ります。",
      derivativeButton: "派生版のソース",
      upstreamButton: "元のHandy",
      licenseButton: "MITライセンス",
      noticesButton: "ライセンスと通知",
    },
  },
};

const sharedDictionarySafety = {
  triggerConflict:
    '"{{trigger}}" conflicts between "{{first}}" and "{{second}}" for {{usage}}.',
  conflictUsage: {
    model: "model prompt",
    postProcess: "post-processing",
  },
};

const localizedDictionarySafety = {
  en: sharedDictionarySafety,
  ja: {
    triggerConflict:
      "「{{trigger}}」が「{{first}}」と「{{second}}」の両方で{{usage}}に使われています。別の読みを指定してください。",
    conflictUsage: {
      model: "モデル用ヒント",
      postProcess: "後処理置換",
    },
  },
};

const englishTranslation = replaceBrand(
  JSON.parse(
    await readFile(
      path.join(localesDirectory, "en", "translation.json"),
      "utf8",
    ),
  ),
);
const structuredDictionaryFallback =
  englishTranslation.settings.advanced.customWords;

for (const localeEntry of await readdir(localesDirectory, {
  withFileTypes: true,
})) {
  if (!localeEntry.isDirectory()) continue;
  const translationPath = path.join(
    localesDirectory,
    localeEntry.name,
    "translation.json",
  );
  const source = JSON.parse(await readFile(translationPath, "utf8"));
  const translation = replaceBrand(source);
  const about = localizedAbout[localeEntry.name] ?? sharedAbout;
  translation.settings.about.derivativeStatus = about.derivativeStatus;
  translation.settings.about.sourceCode = about.sourceCode;
  const dictionarySafety =
    localizedDictionarySafety[localeEntry.name] ?? sharedDictionarySafety;
  translation.settings.advanced.customWords = {
    ...structuredDictionaryFallback,
    ...translation.settings.advanced.customWords,
    ...dictionarySafety,
  };
  await writeFile(
    translationPath,
    `${JSON.stringify(translation, null, 2)}\n`,
    "utf8",
  );
}
