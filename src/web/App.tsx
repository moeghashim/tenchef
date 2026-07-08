import { useEffect, useReducer, useRef, useState } from "react";
import { Interview } from "./components/Interview";
import { KeyPrompt } from "./components/KeyPrompt";
import { Plan } from "./components/Plan";
import { Prd } from "./components/Prd";
import { Start } from "./components/Start";
import { TopBar } from "./components/TopBar";
import { apiFetch, bootstrapToken, postJson } from "./api";
import { DEFAULT_ANTHROPIC_MODEL } from "./llm/anthropic";
import { DEFAULT_OPENAI_MODEL } from "./llm/openai";
import { revisePlan } from "./llm/revise";
import { appReducer, createInitialState } from "./state/reducer";
import { buildPrdMarkdown } from "./state/prd";
import type { AppState, BuildTask, KeySettings, LlmProvider } from "./state/types";
import { DEFAULT_ACCENT, colors } from "./styles/tokens";

const SESSION_KEY = "tenchef.session";
const API_KEY_KEY = "tenchef.apiKey";
const PROVIDER_KEY = "tenchef.provider";
const MODEL_KEY = "tenchef.model";

interface RuntimeConfig {
  accent?: string;
  claudeCli?: boolean;
}

function loadKeySettings(): KeySettings | null {
  const apiKey = window.localStorage.getItem(API_KEY_KEY) || "";
  const provider = window.localStorage.getItem(PROVIDER_KEY) as LlmProvider | null;
  if (provider !== "anthropic" && provider !== "openai" && provider !== "claude-code") return null;
  if (provider !== "claude-code" && !apiKey) return null;
  const storedModel = window.localStorage.getItem(MODEL_KEY);
  const model =
    storedModel ??
    (provider === "anthropic" ? DEFAULT_ANTHROPIC_MODEL : provider === "openai" ? DEFAULT_OPENAI_MODEL : "");
  return { apiKey, provider, model };
}

function sanitizeSnapshot(state: AppState): AppState {
  return { ...state, sending: false, pending: null, revisionError: null };
}

function loadSession(): AppState {
  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return createInitialState();
  try {
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = createInitialState();
    return {
      ...base,
      ...parsed,
      sending: false,
      pending: null,
      revisionError: null
    };
  } catch {
    return createInitialState();
  }
}

bootstrapToken();

export function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, loadSession);
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [claudeCli, setClaudeCli] = useState(false);
  const [keySettings, setKeySettings] = useState<KeySettings | null>(() => loadKeySettings());
  const restoredRef = useRef(false);

  useEffect(() => {
    fetch("/config")
      .then((response) => (response.ok ? response.json() : {}))
      .then((config: RuntimeConfig) => {
        if (config.accent) setAccent(config.accent);
        setClaudeCli(Boolean(config.claudeCli));
      })
      .catch(() => undefined);
  }, []);

  // Resume: a same-tab reload restores from sessionStorage; a fresh tab pulls
  // the last snapshot from .tenchef/state.json in the project directory.
  useEffect(() => {
    const hasSession = window.sessionStorage.getItem(SESSION_KEY) !== null;
    if (hasSession) {
      restoredRef.current = true;
      return;
    }
    apiFetch("/state")
      .then((response) => (response.ok ? response.json() : { state: null }))
      .then((payload: { state: Partial<AppState> | null }) => {
        if (payload.state && typeof payload.state === "object") {
          dispatch({ type: "RESTORE", snapshot: payload.state });
        }
      })
      .catch(() => undefined)
      .finally(() => {
        restoredRef.current = true;
      });
  }, []);

  useEffect(() => {
    apiFetch("/bd/list")
      .then((response) => (response.ok ? response.json() : []))
      .then((tasks: BuildTask[]) => {
        if (Array.isArray(tasks) && tasks.length) dispatch({ type: "HYDRATE_TASKS", tasks });
      })
      .catch(() => undefined);
  }, []);

  // Live sync: while the PRD checklist is on screen, poll beads so tasks the
  // coding agent closes via `bd close` tick themselves off here.
  useEffect(() => {
    if (state.screen !== "prd") return;
    let cancelled = false;
    const interval = setInterval(() => {
      apiFetch("/bd/list")
        .then((response) => (response.ok ? response.json() : []))
        .then((tasks: BuildTask[]) => {
          if (!cancelled && Array.isArray(tasks) && tasks.length) dispatch({ type: "HYDRATE_TASKS", tasks });
        })
        .catch(() => undefined);
    }, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [state.screen]);

  useEffect(() => {
    const snapshot = sanitizeSnapshot(state);
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
    if (!restoredRef.current) return;
    const timer = setTimeout(() => {
      postJson("/state", snapshot).catch(() => undefined);
    }, 500);
    return () => clearTimeout(timer);
  }, [state]);

  const saveKey = (settings: KeySettings) => {
    window.localStorage.setItem(API_KEY_KEY, settings.apiKey);
    window.localStorage.setItem(PROVIDER_KEY, settings.provider);
    window.localStorage.setItem(MODEL_KEY, settings.model);
    setKeySettings(settings);
  };

  const handleSendToModel = async () => {
    if (!state.plan || state.sending) return;
    const pending = state.comments.filter((comment) => !comment.addressed);
    if (!pending.length) return;
    if (!keySettings) {
      setKeySettings(null);
      return;
    }
    dispatch({ type: "SEND_START" });
    try {
      const revision = await revisePlan({
        provider: keySettings.provider,
        apiKey: keySettings.apiKey,
        model: keySettings.model,
        plan: state.plan,
        comments: pending
      });
      dispatch({ type: "APPLY_REVISION", revision, sentCount: pending.length });
    } catch (error) {
      const detail = error instanceof Error && error.message ? ` (${error.message})` : "";
      dispatch({
        type: "REVISION_ERROR",
        message: `Could not revise the plan from your comments. Please try again.${detail}`
      });
    }
  };

  const handleGeneratePrd = async () => {
    if (!state.plan) return;
    try {
      const tasksWithIds = state.tasks.some((task) => task.beadsId)
        ? state.tasks
        : await (async () => {
            await postJson<{ ok: true }>("/bd/init", {});
            return (
              await postJson<{ tasks: BuildTask[] }>("/bd/create", {
                tasks: state.tasks
              })
            ).tasks;
          })();
      const content = buildPrdMarkdown({
        plan: state.plan,
        tasks: tasksWithIds,
        comments: state.comments,
        date: new Date()
      });
      await postJson<{ ok: true }>("/fs/write", { path: "PRD.md", content });
      dispatch({ type: "SET_TASKS", tasks: tasksWithIds });
      dispatch({ type: "GENERATE_PRD" });
    } catch (error) {
      dispatch({
        type: "REVISION_ERROR",
        message: error instanceof Error ? error.message : "Could not write the PRD or create beads tasks."
      });
    }
  };

  const handleToggleTask = async (task: BuildTask) => {
    dispatch({ type: "TOGGLE_TASK_LOCAL", id: task.id });
    if (!task.beadsId) return;
    try {
      await postJson<{ ok: true }>("/bd/close", { id: task.beadsId, done: !task.done });
    } catch {
      dispatch({ type: "TOGGLE_TASK_LOCAL", id: task.id });
      dispatch({ type: "REVISION_ERROR", message: "Could not update the matching beads task." });
    }
  };

  const body = !keySettings ? (
    <KeyPrompt accent={accent} claudeCliAvailable={claudeCli} onSave={saveKey} />
  ) : state.screen === "start" ? (
    <Start onStart={() => dispatch({ type: "START" })} />
  ) : state.screen === "interview" ? (
    <Interview
      answers={state.answers}
      accent={accent}
      qIndex={state.qIndex}
      dispatch={dispatch}
      onAutoNext={() => dispatch({ type: "NEXT" })}
    />
  ) : state.screen === "plan" ? (
    <Plan
      state={state}
      accent={accent}
      dispatch={dispatch}
      onSendToModel={handleSendToModel}
      onGeneratePrd={handleGeneratePrd}
    />
  ) : (
    <Prd state={state} accent={accent} dispatch={dispatch} onToggleTask={handleToggleTask} />
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: colors.page }}>
      <TopBar screen={keySettings ? state.screen : "start"} accent={accent} showStepper={Boolean(keySettings)} />
      {body}
    </div>
  );
}
