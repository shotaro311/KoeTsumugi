const GROUPS = [
  "AI・開発ツール",
  "アプリ・プロジェクト",
  "音声認識モデル",
  "モデル名・配布関連",
];

const CANDIDATES = [
  {
    output: "Codex",
    aliases: ["コーデックス", "コデックス"],
    group: "AI・開発ツール",
  },
  {
    output: "CodexPeer",
    aliases: ["コーデックスピア", "Codexピア", "Codex Peer"],
    group: "AI・開発ツール",
  },
  {
    output: "Claude Code",
    aliases: ["クロードコード", "Claudeコード"],
    group: "AI・開発ツール",
  },
  {
    output: "OpenAI",
    aliases: ["オープンAI", "オープンエーアイ", "Open AI"],
    group: "AI・開発ツール",
  },
  {
    output: "MCP",
    aliases: ["エムシーピー", "M C P"],
    group: "AI・開発ツール",
  },
  {
    output: "Obsidian",
    aliases: ["オブシディアン", "オブジディアン"],
    group: "AI・開発ツール",
  },
  {
    output: "GitHub",
    aliases: ["ギットハブ", "ギッハブ", "Git Hub"],
    group: "AI・開発ツール",
  },
  {
    output: "GitHub Actions",
    aliases: [
      "ギットハブアクションズ",
      "GitHubアクションズ",
      "GitHub アクション",
    ],
    group: "AI・開発ツール",
  },
  {
    output: "LM Studio",
    aliases: ["エルエムスタジオ", "LMスタジオ", "L M Studio"],
    group: "AI・開発ツール",
  },
  {
    output: "Hugging Face",
    aliases: ["ハギングフェイス", "ハグングフェイス", "HuggingFace"],
    group: "AI・開発ツール",
  },
  {
    output: "KoeTsumugi",
    aliases: ["こえつむぎ", "コエツムギ", "Koe Tsumugi"],
    group: "アプリ・プロジェクト",
  },
  {
    output: "HoverPocket",
    aliases: ["ホバーポケット", "ホバーポケットアプリ", "Hover Pocket"],
    group: "アプリ・プロジェクト",
  },
  {
    output: "ComfyRemote",
    aliases: ["コンフィリモート", "コンフィーリモート", "Comfy Remote"],
    group: "アプリ・プロジェクト",
  },
  {
    output: "ComfyUI",
    aliases: ["コンフィユーアイ", "コンフィUI", "Comfy UI"],
    group: "アプリ・プロジェクト",
  },
  {
    output: "Hermes Agent",
    aliases: [
      "ヘルメスエージェント",
      "ハーミーズエージェント",
      "Hermesエージェント",
    ],
    group: "アプリ・プロジェクト",
  },
  {
    output: "amalife",
    aliases: ["アマライフ"],
    group: "アプリ・プロジェクト",
  },
  {
    output: "Codex Image Canvas",
    aliases: [
      "コーデックスイメージキャンバス",
      "Codex画像キャンバス",
      "Codex ImageCanvas",
    ],
    group: "アプリ・プロジェクト",
  },
  {
    output: "Anima-Turbo",
    aliases: ["アニマターボ", "Anima Turbo"],
    group: "アプリ・プロジェクト",
  },
  {
    output: "Cohere Transcribe",
    aliases: [
      "コヒアトランスクライブ",
      "コヒーアトランスクライブ",
      "Cohere文字起こし",
    ],
    group: "音声認識モデル",
  },
  {
    output: "Whisper",
    aliases: ["ウィスパー", "ウイスパー"],
    group: "音声認識モデル",
  },
  {
    output: "Nemotron",
    aliases: ["ネモトロン", "Nemtron"],
    group: "音声認識モデル",
  },
  {
    output: "Parakeet",
    aliases: ["パラキート", "パラキートTDT"],
    group: "音声認識モデル",
  },
  {
    output: "Voxtral",
    aliases: ["ヴォクストラル", "ボクストラル"],
    group: "音声認識モデル",
  },
  {
    output: "Canary",
    aliases: ["カナリー", "Canaryモデル"],
    group: "音声認識モデル",
  },
  {
    output: "GPT-5.6 Sol",
    aliases: ["GPT 5.6 Sol", "GPT5.6 Sol", "5.6 Sol", "GPTごてんろくソル"],
    group: "モデル名・配布関連",
  },
  {
    output: "GPT-5.6 Terra",
    aliases: [
      "GPT 5.6 Terra",
      "GPT5.6 Terra",
      "5.6 Terra",
      "GPTごてんろくテラ",
    ],
    group: "モデル名・配布関連",
  },
  {
    output: "GPT-5.6 Luna",
    aliases: ["GPT 5.6 Luna", "GPT5.6 Luna", "5.6 Luna", "GPTごてんろくルナ"],
    group: "モデル名・配布関連",
  },
  {
    output: "App Store Connect",
    aliases: ["アップストアコネクト", "AppStore Connect", "App Storeコネクト"],
    group: "モデル名・配布関連",
  },
  {
    output: "TestFlight",
    aliases: ["テストフライト", "Test Flight"],
    group: "モデル名・配布関連",
  },
];

const STORAGE_KEY = "handy-m-custom-dictionary-review-v1";
const ALIASES_STORAGE_KEY = "handy-m-custom-dictionary-aliases-v1";
const state = {
  excluded: loadExcluded(),
  aliasOverrides: loadAliasOverrides(),
  editingOutput: null,
  filter: "all",
  query: "",
};

const sectionsRoot = document.querySelector("#candidate-sections");
const keepCount = document.querySelector("#keep-count");
const excludeCount = document.querySelector("#exclude-count");
const searchInput = document.querySelector("#search-input");
const emptyState = document.querySelector("#empty-state");
const toast = document.querySelector("#toast");
let toastTimer;

function loadExcluded() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    const knownOutputs = new Set(
      CANDIDATES.map((candidate) => candidate.output),
    );
    return new Set(
      Array.isArray(stored)
        ? stored.filter((output) => knownOutputs.has(output))
        : [],
    );
  } catch {
    return new Set();
  }
}

function saveExcluded() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.excluded]));
  } catch {
    document.querySelector("#save-status").textContent =
      "この環境では自動保存できません。最後に結果をコピーしてください。";
  }
}

function loadAliasOverrides() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(ALIASES_STORAGE_KEY) ?? "{}",
    );
    if (!stored || typeof stored !== "object" || Array.isArray(stored))
      return {};

    const knownOutputs = new Set(
      CANDIDATES.map((candidate) => candidate.output),
    );
    return Object.fromEntries(
      Object.entries(stored)
        .filter(
          ([output, aliases]) =>
            knownOutputs.has(output) && Array.isArray(aliases),
        )
        .map(([output, aliases]) => [
          output,
          sanitizeAliases(aliases.join("\n"), output),
        ]),
    );
  } catch {
    return {};
  }
}

function saveAliasOverrides() {
  try {
    localStorage.setItem(
      ALIASES_STORAGE_KEY,
      JSON.stringify(state.aliasOverrides),
    );
  } catch {
    document.querySelector("#save-status").textContent =
      "この環境では自動保存できません。最後に結果をコピーしてください。";
  }
}

function normalize(value) {
  return value.normalize("NFKC").toLocaleLowerCase("ja");
}

function sanitizeAliases(value, output) {
  const seen = new Set();
  const normalizedOutput = normalize(output);
  return value
    .split(/[\n,、]+/u)
    .map((alias) => alias.trim())
    .filter(Boolean)
    .filter((alias) => {
      const key = normalize(alias);
      if (key === normalizedOutput || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function currentAliases(candidate) {
  return Object.hasOwn(state.aliasOverrides, candidate.output)
    ? state.aliasOverrides[candidate.output]
    : candidate.aliases;
}

function visibleCandidates() {
  const query = normalize(state.query.trim());
  return CANDIDATES.filter((candidate) => {
    const isExcluded = state.excluded.has(candidate.output);
    const matchesFilter =
      state.filter === "all" ||
      (state.filter === "exclude" && isExcluded) ||
      (state.filter === "keep" && !isExcluded);
    const searchable = normalize(
      [candidate.output, candidate.group, ...currentAliases(candidate)].join(
        " ",
      ),
    );
    return matchesFilter && (!query || searchable.includes(query));
  });
}

function render() {
  const visible = visibleCandidates();
  sectionsRoot.replaceChildren();

  for (const group of GROUPS) {
    const groupCandidates = visible.filter(
      (candidate) => candidate.group === group,
    );
    if (groupCandidates.length === 0) continue;

    const section = document.createElement("section");
    section.className = "candidate-group";

    const heading = document.createElement("h2");
    heading.className = "group-heading";
    heading.append(document.createTextNode(group));

    const count = document.createElement("span");
    count.className = "group-count";
    count.textContent = `${groupCandidates.length}件`;
    heading.append(count);
    section.append(heading);

    const grid = document.createElement("div");
    grid.className = "candidate-grid";
    for (const candidate of groupCandidates) {
      grid.append(createCandidateCard(candidate));
    }
    section.append(grid);
    sectionsRoot.append(section);
  }

  const excludedTotal = state.excluded.size;
  keepCount.textContent = String(CANDIDATES.length - excludedTotal);
  excludeCount.textContent = String(excludedTotal);
  emptyState.hidden = visible.length !== 0;
}

function createCandidateCard(candidate) {
  const excluded = state.excluded.has(candidate.output);
  const editing = state.editingOutput === candidate.output;
  const card = document.createElement("article");
  card.className = `candidate-card${excluded ? " is-excluded" : ""}${editing ? " is-editing" : ""}`;
  card.tabIndex = 0;
  card.setAttribute("role", "checkbox");
  card.setAttribute("aria-checked", String(excluded));
  card.setAttribute("aria-label", `${candidate.output}を除外する`);
  card.addEventListener("click", (event) => {
    if (event.target.closest("button, input, textarea, label, .alias-editor"))
      return;
    toggleCandidate(candidate.output);
  });
  card.addEventListener("keydown", (event) => {
    if (event.target !== card || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    toggleCandidate(candidate.output);
  });

  const main = document.createElement("span");
  main.className = "candidate-main";

  const name = document.createElement("span");
  name.className = "candidate-name";
  name.textContent = candidate.output;
  main.append(name);

  const aliases = document.createElement("span");
  aliases.className = "aliases";
  const activeAliases = currentAliases(candidate);
  for (const alias of activeAliases) {
    const chip = document.createElement("span");
    chip.className = "alias-chip";
    chip.textContent = alias;
    aliases.append(chip);
  }
  if (activeAliases.length === 0) {
    const emptyChip = document.createElement("span");
    emptyChip.className = "alias-chip is-empty";
    emptyChip.textContent = "読みの登録なし";
    aliases.append(emptyChip);
  }
  main.append(aliases);
  card.append(main);

  const control = document.createElement("label");
  control.className = "exclude-control";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = excluded;
  checkbox.setAttribute("aria-label", `${candidate.output}を除外する`);
  checkbox.addEventListener("change", () => toggleCandidate(candidate.output));
  control.append(checkbox, document.createTextNode("除外する"));
  card.append(control);

  const footer = document.createElement("div");
  footer.className = "candidate-footer";
  const mode = document.createElement("span");
  mode.className = "candidate-mode";
  mode.textContent = "モデル用ヒント ＋ 後処理置換";
  footer.append(mode);

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "edit-aliases-button";
  editButton.textContent = editing ? "編集を閉じる" : "読みを編集";
  editButton.setAttribute("aria-expanded", String(editing));
  editButton.addEventListener("click", () => {
    state.editingOutput = editing ? null : candidate.output;
    render();
    if (!editing) {
      document
        .querySelector(`[data-alias-editor="${CSS.escape(candidate.output)}"]`)
        ?.focus();
    }
  });
  footer.append(editButton);
  card.append(footer);

  if (editing) card.append(createAliasEditor(candidate, activeAliases));

  return card;
}

function createAliasEditor(candidate, aliases) {
  const editor = document.createElement("div");
  editor.className = "alias-editor";

  const label = document.createElement("label");
  label.className = "alias-editor-label";
  label.textContent = "別名・読み";

  const textarea = document.createElement("textarea");
  textarea.value = aliases.join("\n");
  textarea.dataset.aliasEditor = candidate.output;
  textarea.setAttribute("aria-label", `${candidate.output}の別名・読みを編集`);
  label.append(textarea);
  editor.append(label);

  const hint = document.createElement("p");
  hint.className = "alias-editor-hint";
  hint.textContent =
    "1行に1つ、またはカンマ・読点で区切って入力します。重複は保存時に自動で除きます。";
  editor.append(hint);

  const actions = document.createElement("div");
  actions.className = "editor-actions";

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "editor-button editor-button-reset";
  resetButton.textContent = "初期値に戻す";
  resetButton.addEventListener("click", () => {
    delete state.aliasOverrides[candidate.output];
    saveAliasOverrides();
    state.editingOutput = null;
    render();
    showToast(`${candidate.output}の読みを初期値へ戻しました。`);
  });

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "editor-button editor-button-save";
  saveButton.textContent = "読みを保存";
  saveButton.addEventListener("click", () => {
    state.aliasOverrides[candidate.output] = sanitizeAliases(
      textarea.value,
      candidate.output,
    );
    saveAliasOverrides();
    state.editingOutput = null;
    render();
    showToast(`${candidate.output}の読みを保存しました。`);
  });

  actions.append(resetButton, saveButton);
  editor.append(actions);
  return editor;
}

function toggleCandidate(output) {
  if (state.excluded.has(output)) {
    state.excluded.delete(output);
  } else {
    state.excluded.add(output);
  }
  saveExcluded();
  render();
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function selectionSummary() {
  const excluded = CANDIDATES.filter((candidate) =>
    state.excluded.has(candidate.output),
  ).map((candidate) => candidate.output);
  const aliasOverrides = Object.fromEntries(
    CANDIDATES.filter((candidate) =>
      Object.hasOwn(state.aliasOverrides, candidate.output),
    ).map((candidate) => [candidate.output, currentAliases(candidate)]),
  );
  return [
    "KoeTsumugiカスタム辞書 選択結果",
    `除外: ${excluded.length === 0 ? "なし" : excluded.join("、")}`,
    `読み変更: ${Object.keys(aliasOverrides).length === 0 ? "なし" : JSON.stringify(aliasOverrides)}`,
  ].join("\n");
}

async function copySelection() {
  const text = selectionSummary();
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopy(text);
    }
    showToast("選択結果をコピーしました。Codexのチャットへ貼り付けられます。");
  } catch {
    try {
      fallbackCopy(text);
      showToast(
        "選択結果をコピーしました。Codexのチャットへ貼り付けられます。",
      );
    } catch {
      showToast("コピーできませんでした。登録用JSONを保存してください。");
    }
  }
}

function fallbackCopy(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  if (!copied) throw new Error("Copy command failed");
}

function downloadJson() {
  const entries = CANDIDATES.filter(
    (candidate) => !state.excluded.has(candidate.output),
  ).map((candidate) => ({
    output: candidate.output,
    aliases: currentAliases(candidate),
    use_in_model_prompt: true,
    use_in_post_process: true,
  }));
  const excluded = CANDIDATES.filter((candidate) =>
    state.excluded.has(candidate.output),
  ).map((candidate) => candidate.output);
  const payload = {
    version: 1,
    generated_at: new Date().toISOString(),
    excluded,
    alias_overrides: state.aliasOverrides,
    entries,
  };
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "handy-m-custom-dictionary-selection.json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast(`${entries.length}件の登録用JSONを保存しました。`);
}

document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll(".filter-button").forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });
    render();
  });
});

searchInput.addEventListener("input", () => {
  state.query = searchInput.value;
  render();
});

document.querySelector("#reset-button").addEventListener("click", () => {
  if (state.excluded.size === 0) {
    showToast("除外指定はまだありません。");
    return;
  }
  state.excluded.clear();
  saveExcluded();
  render();
  showToast("すべて登録候補へ戻しました。");
});

document.querySelector("#copy-button").addEventListener("click", copySelection);
document
  .querySelector("#download-button")
  .addEventListener("click", downloadJson);

render();
