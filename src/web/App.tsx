import { useEffect, useReducer, useState } from "react";
import { Interview } from "./components/Interview";
import { KeyPrompt } from "./components/KeyPrompt";
import { Plan } from "./components/Plan";
import { Prd } from "./components/Prd";
import { Start } from "./components/Start";
import { TopBar } from "./components/TopBar";
import { revisePlan } from "./llm/revise";
import { loadKeySettingsFrom, saveKeySettingsTo } from "./state/keyStorage";
import { appReducer, createInitialState } from "./state/reducer";
import { buildPrdMarkdown } from "./state/prd";
import type { AppState, BuildTask, KeySettings } from "./state/types";
import { DEFAULT_ACCENT, colors } from "./styles/tokens";

const SESSION_KEY = "tenchef.session";

interface RuntimeConfig {
  accent?: string;
  token?: string;
}

function loadKeySettings(): KeySettings | null {
  return loadKeySettingsFrom(window.localStorage, window.sessionStorage);
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

async function postJson<T>(url: string, body: unknown, token: string | null): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers["x-tenchef-token"] = token;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `${url} failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

export function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, loadSession);
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [token, setToken] = useState<string | null>(null);
  const [keySettings, setKeySettings] = useState<KeySettings | null>(() => loadKeySettings());

  useEffect(() => {
    fetch("/config")
      .then((response) => (response.ok ? response.json() : {}))
      .then((config: RuntimeConfig) => {
        if (config.accent) setAccent(config.accent);
        if (config.token) setToken(config.token);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch("/bd/list", { headers: { "x-tenchef-token": token } })
      .then((response) => (response.ok ? response.json() : []))
      .then((tasks: BuildTask[]) => {
        if (Array.isArray(tasks) && tasks.length) dispatch({ type: "HYDRATE_TASKS", tasks });
      })
      .catch(() => undefined);
  }, [token]);

  useEffect(() => {
    const snapshot: AppState = {
      ...state,
      sending: false,
      pending: null,
      revisionError: null
    };
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
  }, [state]);

  const saveKey = (settings: KeySettings) => {
    saveKeySettingsTo(window.localStorage, window.sessionStorage, settings);
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
        plan: state.plan,
        comments: pending
      });
      dispatch({ type: "APPLY_REVISION", revision, sentCount: pending.length });
    } catch {
      dispatch({ type: "REVISION_ERROR", message: "Could not revise the plan from your comments. Please try again." });
    }
  };

  const handleGeneratePrd = async () => {
    if (!state.plan) return;
    try {
      const tasksWithIds = state.tasks.some((task) => task.beadsId)
        ? state.tasks
        : await (async () => {
            await postJson<{ ok: true }>("/bd/init", {}, token);
            return (
              await postJson<{ tasks: BuildTask[] }>(
                "/bd/create",
                {
                  tasks: state.tasks
                },
                token
              )
            ).tasks;
          })();
      const content = buildPrdMarkdown({
        plan: state.plan,
        tasks: tasksWithIds,
        comments: state.comments,
        date: new Date()
      });
      await postJson<{ ok: true }>("/fs/write", { path: "PRD.md", content }, token);
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
      await postJson<{ ok: true }>("/bd/close", { id: task.beadsId, done: !task.done }, token);
    } catch {
      dispatch({ type: "TOGGLE_TASK_LOCAL", id: task.id });
      dispatch({ type: "REVISION_ERROR", message: "Could not update the matching beads task." });
    }
  };

  const body = !keySettings ? (
    <KeyPrompt accent={accent} onSave={saveKey} />
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
